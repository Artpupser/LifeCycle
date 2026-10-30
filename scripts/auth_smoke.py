import argparse
from concurrent.futures import ThreadPoolExecutor
import copy
from http.cookiejar import CookieJar
from http.cookies import SimpleCookie
import json
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import uuid4


class SmokeFailure(Exception):
    pass


def require(condition, message):
    if not condition:
        raise SmokeFailure(message)


def origin_url(value):
    parsed = urlsplit(value)
    require(
        parsed.scheme in {"http", "https"}
        and parsed.hostname
        and parsed.username is None
        and parsed.password is None
        and parsed.path in {"", "/"}
        and not parsed.query
        and not parsed.fragment,
        "URLs must be HTTP(S) origins without credentials or paths",
    )
    return value.rstrip("/")


class Client:
    def __init__(self, base, origin=None):
        self.base = base
        self.origin = origin or base
        self.cookies = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookies))

    def request(self, method, path, payload=None, expected=200, origin=None, cookie=None):
        headers = {"Accept": "application/json"}
        data = None
        if payload is not None:
            data = json.dumps(payload).encode()
            headers["Content-Type"] = "application/json"
        if method not in {"GET", "HEAD"}:
            headers["Origin"] = origin if origin is not None else self.origin
        if cookie is not None:
            headers["Cookie"] = cookie
        request = Request(self.base + path, data=data, headers=headers, method=method)
        try:
            response = self.opener.open(request, timeout=15)
        except HTTPError as error:
            response = error
        except (URLError, TimeoutError, OSError) as error:
            raise SmokeFailure(f"{method} {path.split('?')[0]} connection failed") from error
        with response:
            status = response.status
            response_headers = response.headers
            body = response.read()
        allowed = {expected} if isinstance(expected, int) else set(expected)
        require(
            status in allowed,
            f"{method} {path.split('?')[0]} expected HTTP {sorted(allowed)}, got {status}",
        )
        if not body:
            return None, response_headers
        try:
            parsed = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise SmokeFailure(f"{method} {path.split('?')[0]} returned invalid JSON") from error
        return parsed, response_headers


def email_address():
    return f"smoke+{uuid4().hex}@example.test"


def read_code(mailpit, email, timeout):
    deadline = time.monotonic() + timeout
    query = urlencode({"query": f"to:{email}"})
    while time.monotonic() < deadline:
        result, _ = mailpit.request("GET", "/api/v1/search?" + query)
        require(isinstance(result, dict), "Mailpit search returned an invalid object")
        messages = result.get("messages", [])
        for summary in messages:
            recipients = summary.get("To", [])
            if not any(item.get("Address", "").lower() == email for item in recipients):
                continue
            identifier = summary.get("ID")
            require(isinstance(identifier, str), "Mailpit message has no identifier")
            message, _ = mailpit.request("GET", f"/api/v1/message/{identifier}")
            text = message.get("Text", "")
            code = re.search(r"(?<!\d)(\d{6})(?!\d)", text)
            if code:
                return code.group(1)
        time.sleep(0.25)
    raise SmokeFailure("A real SMTP verification message did not arrive in Mailpit")


def request_code(client, mailpit, email, timeout):
    result, _ = client.request("POST", "/api/auth/request-code", {"email": email}, expected=202)
    require(result == {"message": "Verification code sent"}, "Unexpected code request response")
    code = read_code(mailpit, email, timeout)
    require(code not in json.dumps(result), "Verification code was exposed in the HTTP response")
    return code


def session_cookie(headers, secure):
    cookies = SimpleCookie()
    for header in headers.get_all("Set-Cookie", []):
        cookies.load(header)
    require("lifecycle_session" in cookies, "Verification did not set a session cookie")
    session = cookies["lifecycle_session"]
    require(bool(session["httponly"]), "Session cookie is missing HttpOnly")
    require(session["samesite"].lower() == "lax", "Session cookie must use SameSite=Lax")
    require(session["path"] == "/", "Session cookie has the wrong Path")
    require(session["max-age"] == "2592000", "Session cookie must expire after 30 days")
    require(bool(session["secure"]) == secure, "Session cookie Secure flag does not match public URL")
    require(not session["domain"], "Session cookie must be host-only")
    require(len(session.value) >= 32, "Session cookie token is too short")
    return session.output(header="").strip().split(";", 1)[0]


def verify(client, email, code, secure):
    result, headers = client.request("POST", "/api/auth/verify-code", {"email": email, "code": code})
    require(
        isinstance(result, dict)
        and isinstance(result.get("user"), dict)
        and result["user"].get("email") == email
        and isinstance(result["user"].get("id"), str),
        "Verification did not return the authenticated identity",
    )
    require(code not in json.dumps(result), "Verification code was exposed in the HTTP response")
    cookie = session_cookie(headers, secure)
    current, _ = client.request("GET", "/api/auth/me")
    require(current == result, "Session cookie did not authenticate /me")
    return result["user"], cookie


def run(args):
    base = origin_url(args.url)
    public_origin = origin_url(args.origin or args.url)
    mailpit = Client(origin_url(args.mailpit_url))
    anonymous = Client(base, public_origin)
    anonymous.request("GET", "/api/auth/me", expected=401)
    anonymous.request("GET", "/api/profile", expected=401)
    anonymous.request("GET", "/api/settings", expected=401)

    first = Client(base, public_origin)
    email = email_address()
    code = request_code(first, mailpit, email, args.mail_timeout)
    wrong = f"{(int(code) + 1) % 1_000_000:06d}"
    first.request("POST", "/api/auth/verify-code", {"email": email, "code": wrong}, expected=401)
    first.request("GET", "/api/auth/me", expected=401)
    first.request("POST", "/api/auth/request-code", {"email": email}, expected=429)
    identity, cookie = verify(first, email, code, public_origin.startswith("https://"))
    anonymous.request("POST", "/api/auth/verify-code", {"email": email, "code": code}, expected=401)

    profile = {
        "nickname": "smoke-profile",
        "name": "Smoke Test",
        "gender": "male",
        "birth_date": "1990-06-15",
        "birth_country": "RU",
        "residence_country": "RU",
        "height_cm": 180,
        "weight_kg": 75,
        "arms_count": 2,
        "legs_count": 2,
        "eye_color": "brown",
        "hair_color": "brown",
        "skin_color": "olive",
        "colleagues_count": 7,
        "friends_count": 4,
        "acquaintances_count": 20,
        "conditions": ["smoke-condition"],
        "daily_medications": ["smoke-daily-medication"],
        "past_medications": ["smoke-past-medication"],
        "surgeries": ["smoke-surgery"],
        "has_family": True,
        "has_partner": True,
        "penis_length_cm": 12,
        "penis_width_cm": 3,
        "breast_size": "not specified",
        "pregnant": False,
    }
    first.request("PUT", "/api/profile", profile)
    saved, _ = first.request("GET", "/api/profile")
    require(saved == profile, "Complete profile did not persist unchanged")

    settings = {
        "timezone": "Europe/Moscow",
        "time_format": "12h",
        "language": "ru",
        "theme": "dark",
        "reminders_enabled": True,
        "reminder_minutes_before": 15,
        "week_starts_on": "monday",
        "pomodoro_work_minutes": 30,
        "pomodoro_break_minutes": 7,
    }
    legacy_settings = {key: value for key, value in settings.items() if key != "time_format"}
    first.request("PUT", "/api/settings", legacy_settings)
    saved, _ = first.request("GET", "/api/settings")
    require(saved == dict(legacy_settings, time_format="24h"), "Legacy settings did not receive the compatible clock default")
    first.request("PUT", "/api/settings", settings)
    saved, _ = first.request("GET", "/api/settings")
    require(saved == settings, "Settings did not persist unchanged")
    invalid = dict(settings, timezone="Invalid/Timezone")
    first.request("PUT", "/api/settings", invalid, expected=400)
    first.request("PUT", "/api/settings", dict(settings, time_format="invalid"), expected=400)
    saved, _ = first.request("GET", "/api/settings")
    require(saved == settings, "Invalid settings changed saved data")
    changed = dict(profile, nickname="cross-origin-change")
    first.request("PUT", "/api/profile", changed, origin="https://foreign.example", expected=403)
    saved, _ = first.request("GET", "/api/profile")
    require(saved == profile, "Rejected cross-origin write changed saved profile")

    second = Client(base, public_origin)
    second_email = email_address()
    second_code = request_code(second, mailpit, second_email, args.mail_timeout)
    second_identity, _ = verify(second, second_email, second_code, public_origin.startswith("https://"))
    require(second_identity["id"] != identity["id"], "Different accounts share an identity")
    second_profile, _ = second.request("GET", "/api/profile")
    require(second_profile.get("nickname") != profile["nickname"], "Second account can read first account profile")
    other_profile = copy.deepcopy(profile)
    other_profile["nickname"] = "smoke-other-profile"
    other_profile["name"] = "Other Account"
    second.request("PUT", "/api/profile", other_profile)
    second_settings = dict(settings, theme="light", timezone="UTC")
    second.request("PUT", "/api/settings", second_settings)
    saved, _ = first.request("GET", "/api/profile")
    require(saved == profile, "Second account changed first account profile")
    saved, _ = first.request("GET", "/api/settings")
    require(saved == settings, "Second account changed first account settings")

    concurrent_email = email_address()
    concurrent_code = request_code(anonymous, mailpit, concurrent_email, args.mail_timeout)
    contenders = [Client(base, public_origin), Client(base, public_origin)]

    def consume(client):
        return client.request(
            "POST",
            "/api/auth/verify-code",
            {"email": concurrent_email, "code": concurrent_code},
            expected={200, 401},
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(consume, contenders))
    winners = [i for i, (result, _) in enumerate(results) if isinstance(result, dict) and "user" in result]
    require(len(winners) == 1, "Concurrent OTP consumption did not produce exactly one session")
    winner = contenders[winners[0]]
    loser = contenders[1 - winners[0]]
    session_cookie(results[winners[0]][1], public_origin.startswith("https://"))
    winner.request("GET", "/api/auth/me")
    loser.request("GET", "/api/auth/me", expected=401)
    winner.request("POST", "/api/auth/logout", expected=204)

    capped_email = email_address()
    capped_code = request_code(anonymous, mailpit, capped_email, args.mail_timeout)
    wrong_capped_code = f"{(int(capped_code) + 1) % 1_000_000:06d}"
    for _ in range(5):
        anonymous.request(
            "POST",
            "/api/auth/verify-code",
            {"email": capped_email, "code": wrong_capped_code},
            expected={401, 429},
        )
    anonymous.request(
        "POST",
        "/api/auth/verify-code",
        {"email": capped_email, "code": capped_code},
        expected={401, 429},
    )
    anonymous.request("GET", "/api/auth/me", expected=401)

    first.request("POST", "/api/auth/logout", expected=204)
    first.request("GET", "/api/auth/me", expected=401)
    anonymous.request("GET", "/api/auth/me", cookie=cookie, expected=401)
    current, _ = second.request("GET", "/api/auth/me")
    require(current["user"] == second_identity, "Logging out one account revoked another account")
    second.request("POST", "/api/auth/logout", expected=204)

    print("PASS: real SMTP delivery, wrong-code attempt cap, resend limit, secure cookie attributes.")
    print("PASS: replay protection and atomic concurrent one-time code consumption.")
    print("PASS: authenticated profile/settings persistence, timezone validation, cross-origin denial.")
    print("PASS: account isolation and server-side session revocation after logout.")


def main():
    parser = argparse.ArgumentParser(description="Verify Stage 2 against real API, PostgreSQL, Redis and Mailpit.")
    parser.add_argument("--url", default="http://localhost:8081")
    parser.add_argument("--origin", help="Configured APP_PUBLIC_URL, if different from --url")
    parser.add_argument("--mailpit-url", default="http://localhost:8025")
    parser.add_argument("--mail-timeout", type=float, default=30)
    args = parser.parse_args()
    try:
        require(args.mail_timeout > 0, "Mail timeout must be positive")
        run(args)
    except (SmokeFailure, KeyError, TypeError, ValueError) as error:
        if isinstance(error, SmokeFailure):
            print(f"FAIL: {error}", file=sys.stderr)
        else:
            print("FAIL: API or Mailpit response did not match the documented schema", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
