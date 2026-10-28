import argparse
import copy
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
import sys
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login, listed, occurrences, find_occurrence, task_body


def schedule_cases(client, body, today):
    rule = copy.deepcopy(body)
    rule['habit'].update(sub_habits=[], reminder_enabled=False)
    rule['schedule'].update(start_date=str(today - timedelta(days=4)), time=None, recurrence='interval', interval_days=2, end_date=str(today + timedelta(days=2)))
    interval, _ = client.request('POST', '/api/habits', rule, expected=201)
    iid = interval['id']
    find_occurrence(occurrences(client, today), iid)
    find_occurrence(occurrences(client, today + timedelta(days=2)), iid)
    for day in [today + timedelta(days=1), today + timedelta(days=4)]:
        require(not any(v['task']['id'] == iid for v in occurrences(client, day)), 'Interval or inclusive end generated an invalid occurrence')
    client.request('POST', f'/api/habits/{iid}/marks/{today - timedelta(days=1)}', {'status': 'completed'}, expected=400)
    rule['schedule'].update(recurrence='weekly', weekdays=[today.isoweekday()], end_date=str(today))
    weekly, _ = client.request('POST', '/api/habits', rule, expected=201)
    find_occurrence(occurrences(client, today), weekly['id'])
    require(not any(v['task']['id'] == weekly['id'] for v in occurrences(client, today + timedelta(days=1))), 'Weekly rule ignored weekdays/end')
    rule['schedule'].update(start_date=str(today), time='00:30', timezone='Asia/Tokyo', recurrence='once', end_date=None)
    tokyo, _ = client.request('POST', '/api/habits', rule, expected=201)
    shifted = find_occurrence(occurrences(client, today - timedelta(days=1)), tokyo['id'])
    require(shifted['date'] == str(today) and shifted['starts_at'].startswith(str(today - timedelta(days=1))), 'Habit timezone lost the stable occurrence key')
    client.request('POST', f"/api/habits/{tokyo['id']}/marks/{today}", {'status': 'completed'})
    rule['schedule'].update(start_date='2026-03-28', time='02:30', timezone='Europe/Berlin', recurrence='daily', end_date='2026-03-30')
    dst, _ = client.request('POST', '/api/habits', rule, expected=201)
    transition = find_occurrence(occurrences(client, date(2026, 3, 29)), dst['id'])
    require(transition['starts_at'] == '2026-03-29T01:00:00Z', 'Habit did not reuse the DST resolution of the common schedule engine')
    client.request('POST', f"/api/habits/{dst['id']}/marks/2026-03-29", {'status': 'completed'})
    calendar, _ = client.request('GET', '/api/calendar?from=2026-03-28&to=2026-03-30')
    require(len([v for v in calendar['occurrences'] if v['task']['id'] == dst['id']]) == 3, 'Calendar did not include all habit appearances')
    for item in [interval, weekly, tokyo, dst]:
        client.request('DELETE', f"/api/habits/{item['id']}", expected=204)
    overdue = datetime.now(timezone.utc) - timedelta(minutes=31)
    rule['schedule'].update(start_date=str(overdue.date()), time=overdue.strftime('%H:%M'), timezone='UTC', recurrence='once', end_date=None)
    ended, _ = client.request('POST', '/api/habits', rule, expected=201)
    path = f"/api/habits/{ended['id']}/statistics?from={overdue.date()}&to={overdue.date()}"
    before, _ = client.request('GET', path)
    client.request('DELETE', f"/api/habits/{ended['id']}", expected=204)
    after, _ = client.request('GET', path)
    require(before['missed'] == after['missed'] == 1, 'Archival silently removed a missed occurrence earlier on the same day')


def run(args):
    base = args.url.rstrip('/')
    origin = origin_url(args.origin or base)
    mailpit = Client(args.mailpit_url.rstrip("/"), origin)
    first = login(base, origin, mailpit, 30)
    second = login(base, origin, mailpit, 30)
    now = datetime.now(timezone.utc)
    today = now.date()
    yesterday = today - timedelta(days=1)
    start = today - timedelta(days=6)
    child_ids = [str(uuid4()), str(uuid4())]
    body = {
        'title': 'Ритм ' + str(uuid4()), 'description': '# Привычка\n\n**Markdown**', 'tags': ['habit-smoke'], 'color': '#226677',
        'schedule': {'start_date': start.isoformat(), 'time': None, 'timezone': 'UTC', 'duration_minutes': 15, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None},
        'habit': {'icon': '🌱', 'sub_habits': [{'id': value, 'title': 'Пункт ' + str(index), 'description': '**Шаг**'} for index, value in enumerate(child_ids)], 'reminder_enabled': False, 'reminder_minutes_before': None},
    }
    habit, _ = first.request('POST', '/api/habits', body, expected=201)
    hid = habit['id']
    require(habit['source_kind'] == 'habit' and habit['source_id'] == hid, 'Habit is not linked to its generated task')
    require([v['id'] for v in listed(first, '/api/habits?tag=habit-smoke')] == [hid], 'Habit tag search failed')
    require(not listed(first, '/api/habits?q=absent-query'), 'Habit text search returned unrelated records')
    require(not listed(first, '/api/tasks'), 'Habit leaked into manually editable task list')
    for suffix in ['', '/history', f'/statistics?from={start}&to={today}']:
        second.request('GET', f'/api/habits/{hid}{suffix}', expected=404)
    second.request('PUT', f'/api/habits/{hid}', body, expected=404)
    second.request('DELETE', f'/api/habits/{hid}', expected=404)
    second.request('POST', f'/api/habits/{hid}/marks/{today}', {'status': 'completed'}, expected=404)
    Client(base, origin).request('GET', '/api/habits', expected=401)
    first.request('POST', '/api/habits', body, origin='https://foreign.example', expected=403)
    first.request('PUT', f'/api/tasks/{hid}', task_body('bypass'), expected=409)
    first.request('DELETE', f'/api/tasks/{hid}', expected=409)
    first.request('POST', f'/api/tasks/{hid}/occurrences/{today}', {'status': 'completed'}, expected=409)
    first.request('POST', f'/api/habits/{hid}/marks/{today + timedelta(days=1)}', {'status': 'completed'}, expected=400)
    invalid = copy.deepcopy(body)
    invalid['habit']['sub_habits'][1]['id'] = child_ids[0]
    first.request('POST', '/api/habits', invalid, expected=400)
    first.request('POST', f'/api/habits/{hid}/marks/{today}', {'status': 'completed', 'completed_sub_habits': [str(uuid4())]}, expected=400)
    first.request('POST', '/api/tasks', task_body('Invalid parent', parent_id=hid), expected=400)
    partial = {'status': 'pending', 'completed_sub_habits': child_ids[:1], 'note': '**Часть**'}
    mark, _ = first.request('POST', f'/api/habits/{hid}/marks/{today}', partial)
    require(mark['status'] == 'in_progress' and mark['habit_mark']['status'] == 'pending', 'Partial sum did not update parent progress')
    find_occurrence(occurrences(first, today), hid)
    complete = dict(partial, completed_sub_habits=child_ids, note='# Выполнено')
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: first.request('POST', f'/api/habits/{hid}/marks/{today}', complete)[0], range(2)))
    require(results[0] == results[1] and results[0]['status'] == 'completed', 'Concurrent identical marks were not idempotent')
    first.request('POST', f'/api/habits/{hid}/marks/{yesterday}', {'status': 'skipped', 'note': 'Пропуск'})
    first.request('POST', f'/api/habits/{hid}/marks/{start}', {'status': 'cancelled'})
    stats, _ = first.request('GET', f'/api/habits/{hid}/statistics?from={start}&to={today}')
    require((stats['expected'], stats['completed'], stats['skipped'], stats['cancelled'], stats['missed']) == (7, 1, 1, 1, 4), 'Statistics do not count real scheduled results and missing marks')
    require(stats['longest_missed_streak'] == 5 and stats['completed_sub_habits'] == 2, 'Missing streak or child sum is incorrect')
    old_mark = results[0]
    body['title'] += ' / изменено'
    body['description'] = 'Новое описание'
    body['habit']['sub_habits'] = []
    body['schedule']['recurrence'] = 'interval'
    body['schedule']['interval_days'] = 2
    first.request('PUT', f'/api/habits/{hid}', body)
    saved = find_occurrence(occurrences(first, today), hid)
    require(saved['task']['title'] == old_mark['task']['title'] and saved['habit_mark']['note'] == '# Выполнено', 'Editing changed a saved snapshot')
    stats_after, _ = first.request('GET', f'/api/habits/{hid}/statistics?from={start}&to={today}')
    require(stats_after['expected'] == 7 and stats_after['missed'] == 4, 'Editing recurrence destroyed historical missing occurrences')
    first.request('POST', f'/api/habits/{hid}/marks/{yesterday}', {'status': 'completed', 'completed_sub_habits': child_ids})
    history = listed(first, f'/api/habits/{hid}/history')
    require(next(v for v in history if v['date'] == str(yesterday))['task']['title'] == old_mark['task']['title'], 'Historical correction used the new template')
    manual, _ = first.request('POST', '/api/tasks', task_body('Задача рядом', schedule={**body['schedule'], 'recurrence': 'daily'}), expected=201)
    mixed = occurrences(first, today)
    find_occurrence(mixed, manual['id'])
    find_occurrence(mixed, hid)
    first.request('DELETE', f'/api/habits/{hid}', expected=204)
    require(not listed(first, '/api/habits'), 'Archived habit remains active')
    preserved = find_occurrence(occurrences(first, today), hid)
    require(not preserved['editable'] and preserved['habit_mark']['note'] == '# Выполнено', 'Archive destroyed history or kept it editable')
    require(not any(v['task']['id'] == hid for v in occurrences(first, today + timedelta(days=2))), 'Archive generated future habit tasks')
    first.request('POST', f'/api/habits/{hid}/marks/{today}', complete, expected=404)
    first.request('GET', f'/api/habits/statistics?from={today}&to={today + timedelta(days=366)}', expected=400)

    settings, _ = first.request('GET', '/api/settings')
    settings['reminders_enabled'] = True
    settings['reminder_minutes_before'] = 0
    first.request('PUT', '/api/settings', settings)
    reminder_time = now - timedelta(minutes=1)
    remind = copy.deepcopy(body)
    remind['title'] = 'Напоминание ' + str(uuid4())
    remind['schedule'].update(start_date=reminder_time.date().isoformat(), recurrence='daily', time=reminder_time.strftime('%H:%M'))
    remind['habit'].update(reminder_enabled=True, reminder_minutes_before=None)
    reminder_habit, _ = first.request('POST', '/api/habits', remind, expected=201)
    rid = reminder_habit['id']
    notifications = listed(first, '/api/reminders')
    require(any(v['task_id'] == rid for v in notifications), 'Server did not issue a due reminder')
    settings['reminders_enabled'] = False
    first.request('PUT', '/api/settings', settings)
    require(not listed(first, '/api/reminders'), 'Account reminder switch was ignored')
    settings['reminders_enabled'] = True
    first.request('PUT', '/api/settings', settings)
    remind['habit']['reminder_enabled'] = False
    first.request('PUT', f'/api/habits/{rid}', remind)
    require(not any(v['task_id'] == rid for v in listed(first, '/api/reminders')), 'Habit reminder switch was ignored')
    remind['habit']['reminder_enabled'] = True
    first.request('PUT', f'/api/habits/{rid}', remind)
    require(not listed(second, '/api/reminders'), 'Reminder leaked across accounts')
    second.request('POST', f'/api/reminders/{rid}/{reminder_time.date()}/dismiss', expected=404)
    first.request('POST', f'/api/reminders/{rid}/{reminder_time.date()}/dismiss', expected=204)
    first.request('POST', f'/api/reminders/{rid}/{reminder_time.date()}/dismiss', expected=204)
    require(not any(v['task_id'] == rid for v in listed(first, '/api/reminders')), 'Reminder acknowledgement did not persist')
    first.request('DELETE', f'/api/habits/{rid}', expected=204)
    schedule_cases(first, body, today)
    first.request('POST', '/api/auth/logout', expected=204)
    second.request('POST', '/api/auth/logout', expected=204)
    print('PASS: habits CRUD/search, ownership/CSRF, shared schedules, Today/calendar, child sums and concurrent idempotent marks.')
    print('PASS: real statistics/streaks, schedule version history, explicit corrections, archival and task API guards.')
    print('PASS: due reminders, settings, account isolation and persistent idempotent acknowledgement.')
    print('PASS: weekly/interval/end rules, profile-day timezone boundaries and real calendar appearances across DST.')


def main():
    parser = argparse.ArgumentParser(description='Stage 4 verification against real LifeCycle services')
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--origin')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, TypeError, ValueError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
