import argparse
import copy
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login, raw_request, valid_png


def entry(kind="masturbation", **fields):
    value = {"kind": kind, "local_start": "2026-10-20T12:30:00", "timezone": "UTC"}
    value.update(fields)
    return value


def run(args):
    base = origin_url(args.url)
    origin = origin_url(args.origin or args.url)
    mailpit = Client(origin_url(args.mailpit_url))
    first = login(base, origin, mailpit, args.mail_timeout)
    second = login(base, origin, mailpit, args.mail_timeout)
    anonymous = Client(base, origin)
    saved_ids = set()
    query = "/api/sex?from=2026-10-01&to=2026-10-28"
    marker = "intimacy-" + uuid4().hex
    def create(body):
        result, headers = first.request("POST", "/api/sex", body, expected=201)
        require(headers.get("Cache-Control") == "no-store", "Private API response can be cached")
        saved_ids.add(result["id"])
        return result
    try:
        anonymous.request("GET", query, expected=401)
        anonymous.request("POST", "/api/sex", entry(), expected=401)
        empty, _ = first.request("GET", query)
        require(empty["total"] == 0 and empty["statistics"]["average_duration_minutes"] is None, "Empty statistics invent measurements")
        image, _ = raw_request(first, "POST", "/api/media", valid_png(), "image/png", expected=201)
        media = json.loads(image)
        full = entry("sex", duration_minutes=25, ejaculation_count=0, toys=[marker], lubricant_used=False,
                     setting="**Спокойная обстановка**", was_clothed=False, emotions=["Спокойствие"], repeat_desired=False,
                     note=f"## {marker}\n\n![private]({media['url']})", partner={"protection_used":False,"gender":"other","name":marker,"positions":["Личная запись"],"sex_types":["anal","oral"]})
        first_entry = create(full)
        identifier = first_entry["id"]
        require(first_entry["data"]["ejaculation_count"] == 0 and first_entry["data"]["lubricant_used"] is False, "Zero or false was discarded")
        solo = create(entry(solo={"porn_sources":[marker],"feelings_after":"**Без оценки**"}))
        require(solo["started_at"] == first_entry["started_at"], "Simultaneous separate entries were not supported")
        detail, _ = first.request("GET", f"/api/sex/{identifier}")
        require(detail == first_entry, "Entry did not persist on a fresh read")
        for method in ("GET", "DELETE"):
            second.request(method, f"/api/sex/{identifier}" + ("?revision=0" if method == "DELETE" else ""), expected=404)
        second.request("PUT", f"/api/sex/{identifier}", {"revision":0,"data":full}, expected=404)
        anonymous.request("GET", f"/api/sex/{identifier}", expected=401)
        other, _ = second.request("GET", query)
        require(other["total"] == 0 and marker not in json.dumps(other), "Cross-account statistics leak entries")
        first.request("POST", "/api/sex", full, origin="https://evil.example", expected=403)
        first.request("PUT", f"/api/sex/{identifier}", {"revision":0,"data":full}, origin="https://evil.example", expected=403)
        first.request("DELETE", f"/api/sex/{identifier}?revision=0", origin="https://evil.example", expected=403)
        journal, _ = first.request("GET", query)
        stats = journal["statistics"]
        require(journal["total"] == stats["total"] == 2 and stats["active_days"] == 1, "Two events on one date merged")
        require((stats["sex"],stats["masturbation"],stats["duration_minutes"],stats["duration_answers"],stats["average_duration_minutes"]) == (1,1,25,1,25.0), "Unknown duration corrupted statistics")
        require(stats["ejaculations"] == 0 and stats["ejaculation_answers"] == 1 and stats["repeat_desired"] == {"yes":0,"no":1,"unknown":1}, "False/zero/unknown statistics are inconsistent")
        require(stats["protection_used"] == {"yes":0,"no":1,"unknown":0}, "Solo events entered protection statistics")
        filtered, _ = first.request("GET", query + "&kind=sex")
        require(filtered["total"] == filtered["statistics"]["total"] == 1 and filtered["entries"][0]["id"] == identifier, "Type filter differs between list and statistics")
        invalids = [entry("invalid"), entry(duration_minutes=0), entry(duration_minutes=1441), entry(ejaculation_count=-1), entry(ejaculation_count=101), entry(toys=["a","A"]), entry(emotions=[" "]), entry(timezone="Mars/Olympus"), entry(local_start="2026-10-20T12:30:01"), entry(partner={}), entry("sex",solo={}), entry("sex",partner={"sex_types":["unknown"]}), entry(local_start="2026-03-29T02:30:00",timezone="Europe/Berlin"), entry(extra="secret")]
        invalids.append(entry(local_start=(datetime.now(timezone.utc)+timedelta(days=2)).replace(second=0,microsecond=0,tzinfo=None).isoformat()))
        for invalid in invalids:
            first.request("POST", "/api/sex", invalid, expected=400)
        for bad_query in ("from=2026-10-28&to=2026-10-01", "from=2020-01-01&to=2026-10-28", "from=2026-10-01&to=2026-10-28&offset=1000001", "from=2026-10-01&to=2026-10-28&kind=other"):
            first.request("GET", "/api/sex?" + bad_query, expected=400)
        print("PASS: encrypted journal API CRUD, full fields, repeated events, optional values, filters, ownership, Origin and validation.")
        changed = copy.deepcopy(full)
        changed["duration_minutes"] = 40
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: first.request("PUT", f"/api/sex/{identifier}", {"revision":0,"data":changed}, expected={200,409}), range(2)))
        require(sum("id" in result[0] for result in results) == 1, "Concurrent changes both overwrote the same revision")
        latest, _ = first.request("GET", f"/api/sex/{identifier}")
        require(latest["revision"] == 1 and latest["data"]["duration_minutes"] == 40, "Revisioned edit did not persist")
        first.request("DELETE", f"/api/sex/{identifier}?revision=0", expected=409)
        changed["kind"] = "masturbation"
        changed["partner"] = None
        changed["solo"] = {"porn_sources":[],"feelings_after":"После изменения"}
        latest, _ = first.request("PUT", f"/api/sex/{identifier}", {"revision":1,"data":changed})
        journal, _ = first.request("GET", query)
        require(journal["statistics"]["sex"] == 0 and journal["statistics"]["masturbation"] == 2 and journal["statistics"]["duration_minutes"] == 40, "Editing type/measurements left stale statistics")
        first.request("DELETE", f"/api/sex/{identifier}?revision={latest['revision']}", expected=204)
        saved_ids.remove(identifier)
        first.request("GET", f"/api/sex/{identifier}", expected=404)
        journal, _ = first.request("GET", query)
        require(journal["total"] == 1 and journal["statistics"]["duration_answers"] == 0, "Deletion retained private results in statistics")
        print("PASS: parallel updates are revision protected; explicit edits/deletion recalculate real statistics.")
        for occurrence in ("earlier","later"):
            create(entry(local_start="2026-10-25T02:30:00",timezone="Europe/Berlin",time_occurrence=occurrence))
        repeated, _ = first.request("GET", "/api/sex?from=2026-10-25&to=2026-10-25")
        instants = sorted(v["started_at"] for v in repeated["entries"])
        require(instants == ["2026-10-25T00:30:00Z","2026-10-25T01:30:00Z"], "DST repeated hour lost its occurrence identity")
        create(entry(local_start="2026-10-21T00:30:00",timezone="Asia/Tokyo"))
        settings, _ = first.request("GET", "/api/settings")
        utc_day, _ = first.request("GET", "/api/sex?from=2026-10-20&to=2026-10-20")
        require(utc_day["total"] == 2, "UTC date range disagrees with event instant")
        first.request("PUT", "/api/settings", dict(settings,timezone="Asia/Tokyo"))
        tokyo_day, _ = first.request("GET", "/api/sex?from=2026-10-21&to=2026-10-21")
        require(tokyo_day["total"] == 1 and list(tokyo_day["statistics"]["days"]) == ["2026-10-21"], "Statistics ignored profile timezone boundaries")
        first.request("PUT", "/api/settings", settings)
        for _ in range(49):
            create(entry())
        page1, _ = first.request("GET", query)
        page2, _ = first.request("GET", query + "&offset=50")
        require(len(page1["entries"]) == 50 and len(page2["entries"]) == 3 and page1["total"] == page2["total"] == 53, "Pagination silently truncated journal or statistics")
        require(not ({v["id"] for v in page1["entries"]} & {v["id"] for v in page2["entries"]}), "Stable pagination duplicated equal-timestamp entries")
        for path in ("/api/tasks", "/api/notes", "/api/today", "/api/calendar?from=2026-10-20&to=2026-10-21"):
            unrelated, _ = first.request("GET", path)
            require(marker not in json.dumps(unrelated), "Private journal leaked into planning or notes")
        raw_request(second,"GET",media["url"],expected=404)
        print("PASS: DST gaps/repeats, original zone and profile-local grouping, complete pagination, private Markdown and isolation from planning.")
    finally:
        for identifier in saved_ids:
            current, _ = first.request("GET", f"/api/sex/{identifier}")
            first.request("DELETE", f"/api/sex/{identifier}?revision={current['revision']}", expected=204)
        first.request("POST", "/api/auth/logout", expected=204)
        second.request("POST", "/api/auth/logout", expected=204)


def main():
    parser = argparse.ArgumentParser(description="Verify Stage 6 against the real API, PostgreSQL and private media.")
    parser.add_argument("--url",default="http://localhost:8081")
    parser.add_argument("--origin")
    parser.add_argument("--mailpit-url",default="http://localhost:8025")
    parser.add_argument("--mail-timeout",type=float,default=30)
    args = parser.parse_args()
    try:
        require(args.mail_timeout > 0,"Mail timeout must be positive")
        run(args)
    except (SmokeFailure, KeyError, ValueError, TypeError) as error:
        print(f"FAIL: {error}" if isinstance(error,SmokeFailure) else "FAIL: Stage 6 response schema mismatch",file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
