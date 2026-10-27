import argparse
from datetime import date, datetime, timedelta, timezone
import json
import struct
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request
from uuid import uuid4
import zlib

from auth_smoke import Client, SmokeFailure, email_address, origin_url, request_code, require, verify


def raw_request(client, method, path, data=None, content_type=None, expected=200):
    headers = {"Accept": "*/*"}
    if content_type:
        headers["Content-Type"] = content_type
    if method not in {"GET", "HEAD"}:
        headers["Origin"] = client.origin
    request = Request(client.base + path, data=data, headers=headers, method=method)
    try:
        response = client.opener.open(request, timeout=30)
    except HTTPError as error:
        response = error
    except (URLError, TimeoutError, OSError) as error:
        raise SmokeFailure(f"{method} {path} connection failed") from error
    with response:
        status = response.status
        body = response.read()
        response_headers = response.headers
    allowed = {expected} if isinstance(expected, int) else set(expected)
    require(status in allowed, f"{method} {path} expected HTTP {sorted(allowed)}, got {status}")
    return body, response_headers


def valid_png():
    def chunk(kind, content):
        checksum = zlib.crc32(kind + content) & 0xFFFFFFFF
        return struct.pack("!I", len(content)) + kind + content + struct.pack("!I", checksum)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack("!IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\0\x20\x30\x40"))
        + chunk(b"IEND", b"")
    )


def login(base, origin, mailpit, timeout):
    client = Client(base, origin)
    email = email_address()
    code = request_code(client, mailpit, email, timeout)
    verify(client, email, code, origin.startswith("https://"))
    return client


def listed(client, path):
    result, _ = client.request("GET", path)
    require(isinstance(result, list), f"GET {path.split('?')[0]} must return an array")
    return result


def task_body(title, **changes):
    return {
        "title": title,
        "description": "**План**\n\n- Первый шаг\n- Второй шаг",
        "status": "todo",
        "tags": ["smoke", "planning"],
        "color": "#227766",
        "priority": "high",
        "parent_id": None,
        "due_at": None,
        "schedule": None,
        **changes,
    }


def occurrences(client, day):
    result, _ = client.request("GET", "/api/today?" + urlencode({"date": day.isoformat()}))
    require(result["date"] == day.isoformat(), "Today returned the wrong calendar date")
    require(result["timezone"] == "UTC", "New account did not use its UTC settings")
    return result["tasks"]


def find_occurrence(items, task_id):
    found = [item for item in items if item["task"]["id"] == task_id]
    require(len(found) == 1, "Expected exactly one scheduled task occurrence")
    return found[0]


def notes_and_folders(first, second, marker):
    folder_body = {"name": "Рабочие заметки " + marker, "color": "#2266AA"}
    folder, _ = first.request("POST", "/api/notes/folders", folder_body, expected=201)
    folder_id = folder["id"]
    folder_body["name"] += " / изменения"
    first.request("PUT", f"/api/notes/folders/{folder_id}", folder_body)
    saved_folder, _ = first.request("GET", f"/api/notes/folders/{folder_id}")
    require(saved_folder["name"] == folder_body["name"], "Folder update was not persisted")
    require(any(item["id"] == folder_id for item in listed(first, "/api/notes/folders")), "Created folder is missing")

    content = "# Личная заметка\n\n**Markdown** и [источник](https://example.org).\n\n<img src=x onerror=alert(1)>"
    note_body = {
        "title": "Заметка " + marker,
        "content": content,
        "tags": ["smoke", "notes"],
        "color": "#663399",
        "folder_id": folder_id,
    }
    note, _ = first.request("POST", "/api/notes", note_body, expected=201)
    note_id = note["id"]
    saved, _ = first.request("GET", f"/api/notes/{note_id}")
    require(all(saved[key] == value for key, value in note_body.items()), "Note did not persist all content and metadata")
    query = urlencode({"q": marker, "folder_id": folder_id})
    found = listed(first, "/api/notes?" + query)
    require([item["id"] for item in found] == [note_id], "Note title/folder search returned incorrect results")
    require([item["id"] for item in listed(first, "/api/notes?" + urlencode({"q": marker, "tag": "notes"}))] == [note_id], "Note tag filter did not match its tags")
    require(not listed(first, "/api/notes?" + urlencode({"q": marker, "tag": "missing"})), "Note tag filter returned an unrelated note")
    note_body["title"] += " / изменения"
    first.request("PUT", f"/api/notes/{note_id}", note_body)
    saved, _ = first.request("GET", f"/api/notes/{note_id}")
    require(saved["title"] == note_body["title"] and saved["content"] == content, "Note edit lost Markdown content")
    for resource in (f"/api/notes/{note_id}", f"/api/notes/folders/{folder_id}"):
        second.request("GET", resource, expected=404)
        second.request("DELETE", resource, expected=404)
    second.request("POST", "/api/notes", note_body, expected=400)
    second.request("PUT", f"/api/notes/{note_id}", dict(note_body, folder_id=None), expected=404)
    first.request("DELETE", f"/api/notes/folders/{folder_id}", expected=204)
    saved, _ = first.request("GET", f"/api/notes/{note_id}")
    require(saved["folder_id"] is None and saved["content"] == content, "Folder archive lost its note")
    first.request("DELETE", f"/api/notes/{note_id}", expected=204)
    require(not listed(first, "/api/notes?" + urlencode({"q": marker})), "Archived note remains in active search")
    print("PASS: folder/note CRUD, Markdown persistence, search, ownership and safe folder archive.")


def tasks_and_schedule(first, second, marker, today):
    due_at = datetime.combine(today, datetime.min.time(), timezone.utc).replace(hour=18).isoformat()
    parent_body = task_body("План " + marker, due_at=due_at)
    parent, _ = first.request("POST", "/api/tasks", parent_body, expected=201)
    parent_id = parent["id"]
    child_body = task_body("Подзадача " + marker, parent_id=parent_id)
    child, _ = first.request("POST", "/api/tasks", child_body, expected=201)
    child_id = child["id"]
    saved_child, _ = first.request("GET", f"/api/tasks/{child_id}")
    require(saved_child["parent_id"] == parent_id, "Subtask parent was not persisted")
    parent_cycle = dict(parent_body, parent_id=child_id)
    first.request("PUT", f"/api/tasks/{parent_id}", parent_cycle, expected=400)
    second.request("POST", "/api/tasks", child_body, expected=400)
    for method in ("GET", "DELETE"):
        second.request(method, f"/api/tasks/{parent_id}", expected=404)
    second.request("PUT", f"/api/tasks/{parent_id}", parent_body, expected=404)
    query = urlencode({"q": "План " + marker, "from": today.isoformat(), "to": today.isoformat(), "tag": "planning"})
    found = listed(first, "/api/tasks?" + query)
    require(any(item["id"] == parent_id for item in found), "Task title/date/tag search did not return its task")
    parent_body["status"] = "in_progress"
    first.request("PUT", f"/api/tasks/{parent_id}", parent_body)
    saved_parent, _ = first.request("GET", f"/api/tasks/{parent_id}")
    require(saved_parent["status"] == "in_progress", "Task status update was not persisted")
    finished, _ = first.request("POST", f"/api/tasks/{parent_id}/occurrences/{today}", {"status": "completed"})
    require(finished["status"] == finished["task"]["status"] == "completed", "One-time snapshot has conflicting statuses")
    require(datetime.fromisoformat(finished["starts_at"].replace("Z", "+00:00")) == datetime.fromisoformat(due_at), "Marking a deadline task lost its planned time")
    parent_body["status"] = "todo"
    first.request("PUT", f"/api/tasks/{parent_id}", parent_body)
    reopened = find_occurrence(occurrences(first, today), parent_id)
    require(reopened["status"] == reopened["task"]["status"] == "todo", "Reopening a task left its calendar completed")
    parent_body["title"] += " / актуальное название"
    first.request("PUT", f"/api/tasks/{parent_id}", parent_body)
    require(find_occurrence(occurrences(first, today), parent_id)["task"]["title"] == parent_body["title"], "A pending snapshot hid current task edits")

    old_daily = {
        "start_date": (today - timedelta(days=800)).isoformat(),
        "time": None,
        "timezone": "UTC",
        "duration_minutes": 15,
        "recurrence": "daily",
        "interval_days": 1,
        "weekdays": [],
        "end_date": None,
    }
    filtered_task, _ = first.request("POST", "/api/tasks", task_body("Фильтр дат " + marker, schedule=old_daily, due_at=due_at), expected=201)
    filter_id = filtered_task["id"]
    for bounds in ({"to": today.isoformat()}, {"from": today.isoformat()}):
        require(any(item["id"] == filter_id for item in listed(first, "/api/tasks?" + urlencode({"q": marker, **bounds}))), "An open date filter lost a matching old recurrence")
    require(find_occurrence(occurrences(first, today), filter_id)["starts_at"] is None, "An all-day recurrence used its deadline as a scheduled time")
    first.request("DELETE", f"/api/tasks/{filter_id}", expected=204)

    tokyo_date = today + timedelta(days=1)
    tokyo_schedule = dict(old_daily, start_date=tokyo_date.isoformat(), time="00:30", timezone="Asia/Tokyo", recurrence="once")
    tokyo_task, _ = first.request("POST", "/api/tasks", task_body("Другая временная зона " + marker, schedule=tokyo_schedule), expected=201)
    tokyo_id = tokyo_task["id"]
    tokyo_occurrence = find_occurrence(occurrences(first, today), tokyo_id)
    require(tokyo_occurrence["date"] == tokyo_date.isoformat(), "Occurrence lost its schedule-local identity date")
    require(not any(item["task"]["id"] == tokyo_id for item in occurrences(first, tokyo_date)), "Timed occurrence was grouped into the schedule zone instead of profile zone")
    query = urlencode({"q": "Другая временная зона " + marker, "from": today.isoformat(), "to": today.isoformat()})
    require(any(item["id"] == tokyo_id for item in listed(first, "/api/tasks?" + query)), "Date search disagrees with the calendar timezone")
    first.request("POST", f"/api/tasks/{tokyo_id}/occurrences/{tokyo_date}", {"status": "completed"})
    require(find_occurrence(occurrences(first, today), tokyo_id)["status"] == "completed", "Cross-zone completion disappeared from its profile day")
    first.request("DELETE", f"/api/tasks/{tokyo_id}", expected=204)

    schedule = {
        "start_date": (today - timedelta(days=2)).isoformat(),
        "time": "09:15",
        "timezone": "UTC",
        "duration_minutes": 30,
        "recurrence": "interval",
        "interval_days": 2,
        "weekdays": [],
        "end_date": None,
    }
    repeating_body = task_body("Повторение " + marker, schedule=schedule)
    repeating, _ = first.request("POST", "/api/tasks", repeating_body, expected=201)
    repeating_id = repeating["id"]
    due_today = find_occurrence(occurrences(first, today), repeating_id)
    require(due_today["date"] == today.isoformat(), "Recurring task appears on the wrong date")
    require(due_today["editable"] is True, "An active occurrence cannot be edited")
    starts_at = datetime.fromisoformat(due_today["starts_at"].replace("Z", "+00:00"))
    require(starts_at.hour == 9 and starts_at.minute == 15, "Scheduled minute precision was lost")
    require(not any(item["task"]["id"] == repeating_id for item in occurrences(first, today + timedelta(days=1))), "Every-two-days task appeared on the intervening date")
    next_due = today + timedelta(days=2)
    following = find_occurrence(occurrences(first, next_due), repeating_id)
    second.request("POST", f"/api/tasks/{repeating_id}/occurrences/{today}", {"status": "completed"}, expected=404)
    completed, _ = first.request("POST", f"/api/tasks/{repeating_id}/occurrences/{today}", {"status": "completed"})
    require(completed["status"] == "completed", "Occurrence completion was not persisted")
    require(completed["editable"] is True, "Mark response lost its current edit capability")
    current_template, _ = first.request("GET", f"/api/tasks/{repeating_id}")
    require(current_template["status"] == "todo", "One occurrence completion changed the recurring template status")
    next_occurrence = find_occurrence(occurrences(first, next_due), repeating_id)
    require(next_occurrence["status"] == following["status"] != "completed", "Completing today also completed a future occurrence")
    invalid_schedule = dict(schedule, interval_days=0)
    first.request("POST", "/api/tasks", task_body("Invalid schedule", schedule=invalid_schedule), expected=400)

    changed_body = dict(repeating_body, title="Новый шаблон " + marker, schedule=dict(schedule, time="10:45"))
    first.request("PUT", f"/api/tasks/{repeating_id}", changed_body)
    history = listed(first, f"/api/tasks/{repeating_id}/history")
    historical = next((item for item in history if item["date"] == today.isoformat()), None)
    require(historical is not None and historical["task"]["title"] == repeating_body["title"], "Editing the template rewrote completed occurrence history")
    require(historical["starts_at"] == completed["starts_at"], "Editing the template changed a historical start time")
    require(historical["editable"] is True, "Changing time incorrectly locked a still-valid occurrence date")
    moved_body = dict(changed_body, schedule=dict(schedule, time="10:45", start_date=next_due.isoformat()))
    first.request("PUT", f"/api/tasks/{repeating_id}", moved_body)
    historical = find_occurrence(occurrences(first, today), repeating_id)
    require(historical["editable"] is False, "A date outside the current rule advertises an unusable status control")
    history = listed(first, f"/api/tasks/{repeating_id}/history")
    require(next(item for item in history if item["date"] == today.isoformat())["editable"] is False, "History capability ignores the current schedule")
    first.request("POST", f"/api/tasks/{repeating_id}/occurrences/{today}", {"status": "todo"}, expected=400)
    first.request("DELETE", f"/api/tasks/{repeating_id}", expected=204)
    history = listed(first, f"/api/tasks/{repeating_id}/history")
    require(any(item["date"] == today.isoformat() and item["status"] == "completed" for item in history), "Archiving a task deleted its completion history")
    calendar, _ = first.request("GET", "/api/calendar?" + urlencode({"from": today.isoformat(), "to": next_due.isoformat()}))
    archived_occurrence = find_occurrence([item for item in calendar["occurrences"] if item["date"] == today.isoformat()], repeating_id)
    require(archived_occurrence["status"] == "completed", "Calendar lost an archived task completion")
    require(archived_occurrence["editable"] is False, "Archived completion advertises an unusable status control")
    require(all(item["editable"] is False for item in history), "Archived history advertises editable results")
    require(
        not any(item["task"]["id"] == repeating_id and item["date"] != today.isoformat() for item in calendar["occurrences"]),
        "Archiving a template continued generating its unrecorded future occurrences",
    )
    require(find_occurrence(occurrences(first, today), repeating_id)["task"]["title"] == repeating_body["title"], "Today lost the historical title of an archived completion")
    second.request("GET", f"/api/tasks/{repeating_id}/history", expected=404)
    first.request("DELETE", f"/api/tasks/{parent_id}", expected=204)
    saved_child, _ = first.request("GET", f"/api/tasks/{child_id}")
    require(saved_child["parent_id"] is None, "Archiving a parent lost or orphaned its subtask")
    first.request("DELETE", f"/api/tasks/{child_id}", expected=204)
    print("PASS: task CRUD/search/subtasks, minute schedule, Today/calendar and independent recurring results.")
    print("PASS: invalid schedules and cross-account writes denied; completion snapshots survive edit/archive.")


def countdowns(first, second, marker, today):
    body = {
        "title": "Событие " + marker,
        "category": "birthday",
        "icon": "cake",
        "target_date": "2000-12-31",
        "repeat_yearly": True,
    }
    countdown, _ = first.request("POST", "/api/countdowns", body, expected=201)
    identifier = countdown["id"]
    next_date = date(today.year, 12, 31)
    if next_date < today:
        next_date = date(today.year + 1, 12, 31)
    require(countdown["next_date"] == next_date.isoformat(), "Annual countdown did not calculate its next anniversary")
    require(countdown["days_remaining"] == (next_date - today).days, "Annual countdown days remaining are incorrect")
    body.update(category="event", title="Изменённое событие " + marker)
    first.request("PUT", f"/api/countdowns/{identifier}", body)
    saved, _ = first.request("GET", f"/api/countdowns/{identifier}")
    require(saved["category"] == "event" and saved["title"] == body["title"], "Countdown category/title changes were not persisted")
    require(any(item["id"] == identifier for item in listed(first, "/api/countdowns")), "Created countdown is missing")
    second.request("GET", f"/api/countdowns/{identifier}", expected=404)
    second.request("PUT", f"/api/countdowns/{identifier}", body, expected=404)
    first.request("DELETE", f"/api/countdowns/{identifier}", expected=204)
    require(not any(item["id"] == identifier for item in listed(first, "/api/countdowns")), "Archived countdown remains active")
    print("PASS: annual countdown computation, category edits, archive and ownership.")


def pomodoro(first, second, check_completion):
    initial, _ = first.request("GET", "/api/pomodoro")
    require(initial is None, "A new account unexpectedly has a timer")
    session, _ = first.request("POST", "/api/pomodoro", {"task_id": None, "phase": "work"}, expected=201)
    identifier = session["id"]
    require(session["status"] == "running" and session["duration_seconds"] > 0, "Timer did not start with a real duration")
    first.request("POST", "/api/pomodoro", {"task_id": None, "phase": "work"}, expected=409)
    first.request("POST", f"/api/pomodoro/{identifier}/finish", expected=409)
    paused, _ = first.request("POST", f"/api/pomodoro/{identifier}/pause")
    require(paused["status"] == "paused", "Timer did not pause")
    persisted, _ = first.request("GET", "/api/pomodoro")
    require(persisted["id"] == identifier and persisted["status"] == "paused", "Paused timer did not persist on a fresh read")
    second.request("POST", f"/api/pomodoro/{identifier}/resume", expected=404)
    resumed, _ = first.request("POST", f"/api/pomodoro/{identifier}/resume")
    require(resumed["status"] == "running" and resumed["elapsed_seconds"] >= paused["elapsed_seconds"], "Timer did not resume accumulated progress")
    cancelled, _ = first.request("POST", f"/api/pomodoro/{identifier}/cancel")
    require(cancelled["status"] == "cancelled", "Timer was not cancelled")
    persisted, _ = first.request("GET", "/api/pomodoro")
    require(persisted is None or persisted["status"] == "cancelled", "Cancelled timer remained active")
    print("PASS: persisted Pomodoro pause/resume/cancel, ownership and premature completion denial.")
    if check_completion:
        settings, _ = first.request("GET", "/api/settings")
        first.request("PUT", "/api/settings", dict(settings, pomodoro_work_minutes=1))
        try:
            timer, _ = first.request("POST", "/api/pomodoro", {"task_id": None, "phase": "work"}, expected=201)
            require(timer["duration_seconds"] == 60, "Timer did not use its current settings")
            deadline = time.monotonic() + 75
            while True:
                current, _ = first.request("GET", "/api/pomodoro")
                require(current and current["id"] == timer["id"], "Running timer disappeared before completion")
                if current["elapsed_seconds"] >= current["duration_seconds"]:
                    break
                require(time.monotonic() < deadline, "Real one-minute timer did not elapse")
                time.sleep(min(5, current["duration_seconds"] - current["elapsed_seconds"] + 0.1))
            finished, _ = first.request("POST", f"/api/pomodoro/{timer['id']}/finish")
            require(finished["status"] == "completed" and finished["ended_at"], "Elapsed timer did not finish")
            current, _ = first.request("GET", "/api/pomodoro")
            require(current is None, "Completed timer remained active")
            first.request("POST", f"/api/pomodoro/{timer['id']}/resume", expected=409)
            print("PASS: real one-minute Pomodoro elapsed, completed and released its active slot.")
        finally:
            first.request("PUT", "/api/settings", settings)


def media(first, second, anonymous, oversized):
    png = valid_png()
    payload, _ = raw_request(first, "POST", "/api/media", png, "image/png", expected=201)
    uploaded = json.loads(payload)
    path = uploaded["url"]
    require(path == f"/api/media/{uploaded['id']}", "Media API returned a public or unexpected URL")
    require(uploaded["size"] == len(png) and uploaded["content_type"] == "image/png", "Upload metadata does not match its image")
    downloaded, headers = raw_request(first, "GET", path)
    require(downloaded == png and headers.get_content_type() == "image/png", "Private S3 roundtrip changed the image bytes or MIME type")
    raw_request(second, "GET", path, expected=404)
    raw_request(anonymous, "GET", path, expected=401)
    raw_request(first, "POST", "/api/media", b"<svg onload='alert(1)'/>", "image/svg+xml", expected={400, 415})
    raw_request(first, "POST", "/api/media", b"not a PNG", "image/png", expected={400, 415})
    if oversized:
        raw_request(first, "POST", "/api/media", png + b"\0" * (8 * 1024 * 1024 + 1 - len(png)), "image/png", expected=413)
    print("PASS: real private S3 PNG upload/download, anonymous/other-user denial and image validation.")


def run(args):
    base = origin_url(args.url)
    origin = origin_url(args.origin or args.url)
    mailpit = Client(origin_url(args.mailpit_url))
    first = login(base, origin, mailpit, args.mail_timeout)
    second = login(base, origin, mailpit, args.mail_timeout)
    anonymous = Client(base, origin)
    marker = uuid4().hex
    today = datetime.now(timezone.utc).date()
    try:
        notes_and_folders(first, second, marker)
        tasks_and_schedule(first, second, marker, today)
        countdowns(first, second, marker, today)
        pomodoro(first, second, args.check_completion)
        media(first, second, anonymous, args.check_oversize)
    finally:
        first.request("POST", "/api/auth/logout", expected=204)
        second.request("POST", "/api/auth/logout", expected=204)


def main():
    parser = argparse.ArgumentParser(description="Verify Stage 3 against the real application and private S3 storage.")
    parser.add_argument("--url", default="http://localhost:8081")
    parser.add_argument("--origin", help="Configured APP_PUBLIC_URL, if different from --url")
    parser.add_argument("--mailpit-url", default="http://localhost:8025")
    parser.add_argument("--mail-timeout", type=float, default=30)
    parser.add_argument("--check-oversize", action="store_true", help="Also send a bounded 8 MiB + 1 upload and require HTTP 413")
    parser.add_argument("--check-completion", action="store_true", help="Also wait for and finish a real one-minute Pomodoro")
    args = parser.parse_args()
    try:
        require(args.mail_timeout > 0, "Mail timeout must be positive")
        run(args)
    except (SmokeFailure, KeyError, TypeError, ValueError, AttributeError) as error:
        if isinstance(error, SmokeFailure):
            print(f"FAIL: {error}", file=sys.stderr)
        else:
            print("FAIL: API response did not match the documented Stage 3 schema", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
