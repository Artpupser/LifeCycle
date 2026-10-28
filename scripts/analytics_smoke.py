import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import sys
import time
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login, task_body, find_occurrence, occurrences
from workouts_smoke import exercise, entry, plan, command


def run(args):
    base = origin_url(args.url)
    first, second = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    now = datetime.now(timezone.utc)
    today, yesterday = now.date(), now.date() - timedelta(days=1)
    path = f'/api/analytics?from={yesterday}&to={today}'
    privacy = '/api/analytics/privacy'
    disabled = {'include_profile': False, 'include_intimacy': False}
    anonymous = Client(base)
    for endpoint in [path, privacy]:
        anonymous.request('GET', endpoint, expected=401)
    first.request('PUT', privacy, dict(disabled, include_profile=True), origin='https://foreign.example', expected=403)
    first.request('PUT', privacy, {'include_profile': True}, expected=400)
    first.request('PUT', privacy, dict(disabled, user_id=str(uuid4())), expected=400)
    for query in ['from=bad&to=bad', f'from={today}&to={yesterday}', 'from=2026-01-01&to=2027-01-02', f'from={today}&to={today}&include_profile=true']:
        first.request('GET', '/api/analytics?' + query, expected=400)
    empty, headers = first.request('GET', path)
    require(headers.get('Cache-Control') == 'no-store', 'Analytics may be cached')
    require(empty['privacy'] == disabled and 'profile' not in empty and 'intimacy' not in empty, 'Sensitive summaries enabled by default')
    require(empty['event_count'] == 0 and len(empty['days']) == 2 and empty['tasks']['completion_rate'] is None, 'Empty report invents results')

    marker = 'private-' + uuid4().hex
    profile, _ = first.request('GET', '/api/profile')
    profile.update(name=marker, conditions=[marker], birth_date='2000-01-01', height_cm=180, weight_kg=75)
    first.request('PUT', '/api/profile', profile)
    intimate, _ = first.request('POST', '/api/sex', {'kind': 'sex', 'local_start': str(yesterday)+'T12:30:00', 'timezone': 'UTC', 'duration_minutes': 20, 'note': marker, 'partner': {'name': marker}}, expected=201)
    unknown, _ = first.request('POST', '/api/sex', {'kind': 'masturbation', 'local_start': str(yesterday)+'T12:30:00', 'timezone': 'UTC'}, expected=201)
    notes, _ = first.request('POST', '/api/notes', {'title': marker, 'content': marker}, expected=201)
    rule = {'start_date': str(yesterday), 'time': None, 'timezone': 'UTC', 'duration_minutes': 15, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None}
    task, _ = first.request('POST', '/api/tasks', task_body('Analytics task', schedule=rule), expected=201)
    tid = task['id']
    first.request('POST', f'/api/tasks/{tid}/occurrences/{yesterday}', {'status': 'completed'})
    before, _ = first.request('GET', path)
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: first.request('POST', f'/api/tasks/{tid}/occurrences/{yesterday}', {'status': 'completed'}), range(2)))
    after, _ = first.request('GET', path)
    require(after['event_count'] == before['event_count'] and after['tasks']['completed'] == 1, 'Identical marks double-count events or results')
    first.request('POST', f'/api/tasks/{tid}/occurrences/{yesterday}', {'status': 'rejected'})
    first.request('POST', f'/api/tasks/{tid}/occurrences/{yesterday}', {'status': 'completed'})
    child, _ = first.request('POST', '/api/tasks', task_body('Independent child', parent_id=tid), expected=201)
    folder, _ = first.request('POST', '/api/notes/folders', {'name': 'Temporary folder'}, expected=201)
    linked, _ = first.request('POST', '/api/notes', {'title': 'Keep note', 'folder_id': folder['id']}, expected=201)
    first.request('DELETE', f"/api/notes/folders/{folder['id']}", expected=204)
    first.request('GET', f"/api/notes/folders/{folder['id']}", expected=404)
    require(first.request('GET', f"/api/notes/{linked['id']}")[0]['folder_id'] is None, 'Folder deletion removed a note')
    habit_body = {'title': 'Analytics habit', 'schedule': rule, 'habit': {'icon': '🌱', 'sub_habits': [], 'reminder_enabled': False}}
    habit, _ = first.request('POST', '/api/habits', habit_body, expected=201)
    hid = habit['id']
    first.request('POST', f'/api/habits/{hid}/marks/{yesterday}', {'status': 'completed', 'note': marker})
    first.request('POST', f'/api/habits/{hid}/marks/{today}', {'status': 'skipped'})
    ex, _ = first.request('POST', '/api/exercises', exercise('Analytics exercise'), expected=201)
    workout, _ = first.request('POST', '/api/workouts', plan('Analytics workout', [entry(ex['id'])]), expected=201)
    session, _ = first.request('POST', '/api/workout-sessions', {'workout_id': workout['id']})
    session = command(first, session, 'next', actual_repetitions=10)
    require(session['status'] == 'completed', 'Real workout was not completed')
    settings, _ = first.request('GET', '/api/settings')
    settings['pomodoro_work_minutes'] = settings['pomodoro_break_minutes'] = 1
    first.request('PUT', '/api/settings', settings)
    pomo, _ = first.request('POST', '/api/pomodoro', {'task_id': tid, 'phase': 'work'}, expected=201)
    first.request('DELETE', f'/api/tasks/{tid}', expected=204)
    first.request('GET', f'/api/tasks/{tid}', expected=404)
    require(first.request('GET', f"/api/tasks/{child['id']}")[0]['parent_id'] is None, 'Task deletion lost its child')
    require(first.request('GET', '/api/pomodoro')[0]['task_id'] is None, 'Deleted task still referenced by timer')
    require(first.request('GET', f'/api/tasks/{tid}/history')[0][0]['status'] == 'completed', 'Deletion removed a saved completion')
    require(not find_occurrence(occurrences(first, yesterday), tid)['editable'], 'Deleted task result remains editable')
    first.request('DELETE', f'/api/habits/{hid}', expected=204)
    first.request('GET', f'/api/habits/{hid}', expected=404)
    first.request('DELETE', f"/api/workouts/{workout['id']}", expected=204)
    first.request('DELETE', f"/api/exercises/{ex['id']}", expected=204)
    for kind, identifier in [('workouts', workout['id']), ('exercises', ex['id']), ('notes', notes['id'])]:
        second.request('DELETE', f'/api/{kind}/{identifier}', expected=404)
        if kind == 'notes':
            first.request('DELETE', f'/api/{kind}/{identifier}', expected=204)
        first.request('GET', f'/api/{kind}/{identifier}', expected=404)
    countdown, _ = first.request('POST', '/api/countdowns', {'title': 'Delete countdown', 'category': 'Test', 'icon': 'flag', 'target_date': str(today), 'repeat_yearly': False}, expected=201)
    first.request('DELETE', f"/api/countdowns/{countdown['id']}", expected=204)
    first.request('GET', f"/api/countdowns/{countdown['id']}", expected=404)

    report, _ = first.request('GET', path)
    require(report['tasks']['completed'] == 1 and report['tasks']['scheduled'] == 1, 'Deleted task results or future cutoff are wrong')
    require(report['habits']['completed'] == 1 and report['habits']['skipped'] == 1 and report['habits']['completion_rate'] == 50, 'Habit rollup differs from real marks')
    direct, _ = first.request('GET', f'/api/habits/{hid}/statistics?from={yesterday}&to={today}')
    require(report['habits']['ranking'][0] == direct, 'Analytics does not reuse habit metrics')
    require(report['workouts']['completed'] == 1 and report['workouts']['exercise_steps'] == 1 and report['workouts']['repetitions'] == 10, 'Workout rollup lost real results after deletion')
    require(report['event_count'] == sum(d['events'] for d in report['days']) == sum(report['event_types'].values()), 'Event totals and daily buckets disagree')
    require('profile' not in report and 'intimacy' not in report and marker not in json.dumps(report), 'Private text leaked into aggregate output')
    for allowed in [dict(disabled, include_profile=True), {'include_profile': True, 'include_intimacy': True}]:
        first.request('PUT', privacy, allowed)
        granted, _ = first.request('GET', path)
        require(granted['profile'] == {'age_years': today.year - 2000, 'height_cm': 180, 'weight_kg': 75}, 'Profile summary is inaccurate')
        require(('intimacy' in granted) == allowed['include_intimacy'] and marker not in json.dumps(granted), 'Consent scope or data minimization failed')
    require(granted['intimacy']['total'] == 2 and granted['intimacy']['duration_answers'] == 1 and granted['intimacy']['average_duration_minutes'] == 20, 'Intimate aggregation merged events or included unknown duration')
    first.request('DELETE', f"/api/sex/{intimate['id']}?revision=0", expected=204)
    require(first.request('GET', path)[0]['intimacy']['total'] == 1, 'Sensitive summary retained deleted entries')
    first.request('PUT', privacy, disabled)
    revoked, _ = first.request('GET', path)
    require('profile' not in revoked and 'intimacy' not in revoked and revoked['privacy'] == disabled, 'Revocation did not take effect')
    other, _ = second.request('GET', path)
    require(other['event_count'] == 0 and other['privacy'] == disabled, 'Cross-account analytics or consent leakage')
    future = today + timedelta(days=3)
    future_report, _ = first.request('GET', f'/api/analytics?from={future}&to={future}')
    require(future_report['habits']['expected'] == 0 and future_report['event_count'] == 0, 'Deleted templates generate future metrics')
    for zone in ['Asia/Tokyo', 'America/Los_Angeles']:
        settings['timezone'] = zone
        first.request('PUT', '/api/settings', settings)
        shifted, _ = first.request('GET', path)
        require(shifted['event_count'] == report['event_count'] and shifted['timezone'] == zone, 'Profile zone changed total event count within surrounding days')
    settings['timezone'] = 'UTC'
    first.request('PUT', '/api/settings', settings)
    dst, _ = first.request('GET', '/api/analytics?from=2026-03-28&to=2026-03-30')
    require(len(dst['days']) == 3 and dst['event_count'] == 0, 'DST range lost a calendar day')
    tokyo_rule = dict(rule, start_date=str(today), time='00:30', timezone='Asia/Tokyo', recurrence='once')
    tokyo_task, _ = first.request('POST', '/api/tasks', task_body('Tokyo analytics boundary', schedule=tokyo_rule), expected=201)
    first.request('POST', f"/api/tasks/{tokyo_task['id']}/occurrences/{today}", {'status': 'completed'})
    utc_report, _ = first.request('GET', path)
    require(next(d for d in utc_report['days'] if d['date'] == str(yesterday))['tasks_completed'] == 2, 'UTC analytics ignored a timed occurrence from Tokyo')
    settings['timezone'] = 'Asia/Tokyo'
    first.request('PUT', '/api/settings', settings)
    tokyo_report, _ = first.request('GET', f'/api/analytics?from={today}&to={today}')
    require(tokyo_report['tasks']['completed'] == tokyo_report['days'][0]['tasks_completed'] == 1, 'Analytics did not regroup the same result in the profile timezone')
    settings['timezone'] = 'UTC'
    first.request('PUT', '/api/settings', settings)
    dst_rule = dict(rule, start_date='2026-03-29', time='02:30', timezone='Europe/Berlin', recurrence='once')
    dst_task, _ = first.request('POST', '/api/tasks', task_body('DST analytics', schedule=dst_rule), expected=201)
    first.request('POST', f"/api/tasks/{dst_task['id']}/occurrences/2026-03-29", {'status': 'completed'})
    dst, _ = first.request('GET', '/api/analytics?from=2026-03-28&to=2026-03-30')
    require(dst['tasks']['completed'] == 1 and dst['days'][1]['tasks_completed'] == 1, 'DST-resolved scheduled result is missing from analytics')
    for identifier in [tokyo_task['id'], dst_task['id']]:
        first.request('DELETE', f'/api/tasks/{identifier}', expected=204)
    if args.check_completion:
        deadline = time.monotonic() + 64
        while time.monotonic() < deadline:
            current, _ = first.request('GET', '/api/pomodoro')
            if current['elapsed_seconds'] >= 60:
                break
            time.sleep(1)
        first.request('POST', f"/api/pomodoro/{pomo['id']}/finish")
        focus, _ = first.request('GET', path)
        require(focus['pomodoro'] == {'completed': 1, 'cancelled': 0, 'seconds': 60}, 'Completed focus is missing or double-counted')
        require(sum(d['focus_seconds'] for d in focus['days']) == 60, 'Daily focus differs from total')
    else:
        first.request('POST', f"/api/pomodoro/{pomo['id']}/cancel")
    race_task, _ = first.request('POST', '/api/tasks', task_body('Concurrent deletion'), expected=201)
    with ThreadPoolExecutor(max_workers=2) as pool:
        started = pool.submit(first.request, 'POST', '/api/pomodoro', {'task_id': race_task['id'], 'phase': 'work'}, {201, 404})
        deleted = pool.submit(first.request, 'DELETE', f"/api/tasks/{race_task['id']}", None, 204)
        timer, _ = started.result()
        deleted.result()
    if 'id' in timer:
        require(first.request('GET', '/api/pomodoro')[0]['task_id'] is None, 'Concurrent deletion left a dangling Pomodoro link')
        first.request('POST', f"/api/pomodoro/{timer['id']}/cancel")
    first.request('DELETE', f"/api/sex/{unknown['id']}?revision=0", expected=204)
    for kind, identifier in [('tasks', child['id']), ('notes', linked['id'])]:
        first.request('DELETE', f'/api/{kind}/{identifier}', expected=204)
    first.request('POST', '/api/auth/logout', expected=204)
    second.request('POST', '/api/auth/logout', expected=204)
    print('PASS: real event aggregation, idempotent/concurrent marks, daily buckets, outcomes and historical deletions.')
    print('PASS: default privacy, scoped consent/revocation, minimal profile/intimate summaries, no-store, Origin and account isolation.')
    print('PASS: hard-delete API for all former archive modules, detached children/folders/timer, preserved workout/habit/task results.')
    print('PASS: ranges, empty values, profile timezones, DST date coverage and actual Pomodoro completion.' if args.check_completion else 'PASS: ranges, empty values, profile timezones and DST date coverage.')


def main():
    parser = argparse.ArgumentParser(description='Stage 7 acceptance against real services')
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    parser.add_argument('--check-completion', action='store_true')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, TypeError, ValueError, AttributeError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
