import argparse
import copy
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import sys
import time
from uuid import uuid4
from urllib.parse import urlencode

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import find_occurrence, listed, login, occurrences, raw_request, valid_png


def exercise(title, kind='repetitions', **changes):
    return dict(title=title, kind=kind, description='**Техника**', images=[], sources=['https://example.org/technique'], **changes)


def entry(exercise_id, repetitions=10, seconds=0, **changes):
    return dict(id=str(uuid4()), exercise_id=exercise_id, repetitions=repetitions, duration_seconds=seconds, rest_seconds=0, progression=None, **changes)


def plan(title, entries):
    return {'title': title, 'description': '# План\n\n**Markdown**', 'tags': ['workout-smoke'], 'rounds': [{'id': str(uuid4()), 'title': 'Круг 1', 'repeat': 1, 'rest_seconds': 0, 'exercises': entries}]}


def command(client, session, action, expected=200, **changes):
    value, _ = client.request('POST', f"/api/workout-sessions/{session['id']}/{action}", {'revision': session['revision'], **changes}, expected=expected)
    return value


def run(args):
    base = args.url.rstrip('/')
    origin = origin_url(base)
    mailpit = Client(args.mailpit_url.rstrip('/'), origin)
    first, second = (login(base, origin, mailpit, 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    marker = str(uuid4())
    reps_body = exercise('Отжимания ' + marker)
    reps, _ = first.request('POST', '/api/exercises', reps_body, expected=201)
    hold, _ = first.request('POST', '/api/exercises', exercise('Планка ' + marker, 'duration'), expected=201)
    combo, _ = first.request('POST', '/api/exercises', exercise('Удержания ' + marker, 'repetitions_duration'), expected=201)
    require([v['id'] for v in listed(first, '/api/exercises?' + urlencode({'q': 'Отжимания'}))] == [reps['id']], 'Exercise search failed')
    image_raw, _ = raw_request(first, 'POST', '/api/media', valid_png(), 'image/png', 201)
    image_id = json.loads(image_raw)['id']
    reps_body['images'] = [image_id]
    reps_body['description'] += f'\n\n![Техника](/api/media/{image_id})'
    first.request('PUT', f"/api/exercises/{reps['id']}", reps_body)
    second.request('POST', '/api/exercises', dict(reps_body, title='Чужое изображение'), expected=400)
    first.request('POST', '/api/exercises', dict(reps_body, sources=['javascript:alert(1)']), expected=400)
    first.request('POST', '/api/exercises', dict(reps_body, images=[image_id]*4), expected=400)
    for path in ['/api/exercises', '/api/workouts', '/api/workout-sessions', '/api/workout-sessions/active']:
        Client(base, origin).request('GET', path, expected=401)
    first.request('POST', '/api/exercises', reps_body, origin='https://foreign.example', expected=403)
    body = plan('Силовая ' + marker, [entry(reps['id'])])
    body['rounds'][0]['exercises'][0]['progression'] = {'start_date': str(today-timedelta(days=5)), 'days': 10, 'target_repetitions': 20, 'target_duration_seconds': 0}
    workout, _ = first.request('POST', '/api/workouts', body, expected=201)
    wid = workout['id']
    require([v['id'] for v in listed(first, '/api/workouts?tag=workout-smoke')] == [wid], 'Workout tag search failed')
    require(not listed(first, '/api/workouts?q=absent-query'), 'Workout search returned unrelated plan')
    second.request('POST', '/api/workouts', body, expected=400)
    for kind, identifier in [('exercises', reps['id']), ('workouts', wid)]:
        second.request('GET', f'/api/{kind}/{identifier}', expected=404)
        second.request('DELETE', f'/api/{kind}/{identifier}', expected=404)
    first.request('DELETE', f"/api/exercises/{reps['id']}", expected=409)
    first.request('PUT', f"/api/exercises/{reps['id']}", dict(reps_body, kind='duration'), expected=409)
    invalid = copy.deepcopy(body)
    invalid['rounds'][0]['exercises'][0]['duration_seconds'] = 30
    first.request('POST', '/api/workouts', invalid, expected=400)
    invalid = copy.deepcopy(body)
    invalid['rounds'][0]['exercises'] *= 2
    first.request('POST', '/api/workouts', invalid, expected=400)

    habit_body = {'title': 'Тренировка Today ' + marker, 'description': '**Связка**', 'tags': [], 'color': '#226677', 'schedule': {'start_date': str(today), 'time': None, 'timezone': 'UTC', 'duration_minutes': 30, 'recurrence': 'weekly', 'interval_days': 1, 'weekdays': [today.isoweekday()], 'end_date': None}, 'habit': {'icon': '🏋', 'workout_id': wid, 'sub_habits': [], 'reminder_enabled': False}}
    habit, _ = first.request('POST', '/api/habits', habit_body, expected=201)
    hid = habit['id']
    second.request('POST', '/api/habits', habit_body, expected=404)
    invalid_habit = copy.deepcopy(habit_body)
    invalid_habit['habit']['sub_habits'] = [{'id': str(uuid4()), 'title': 'Sub'}]
    first.request('POST', '/api/habits', invalid_habit, expected=400)
    first.request('DELETE', f'/api/workouts/{wid}', expected=409)
    occurrence = find_occurrence(occurrences(first, today), hid)
    require(occurrence['task']['habit']['workout_id'] == wid, 'Today lost workout link')
    first.request('POST', '/api/workout-sessions', {'workout_id': wid, 'habit_id': hid, 'date': str(today+timedelta(days=7))}, expected=400)
    start = {'workout_id': wid, 'habit_id': hid, 'date': str(today)}
    with ThreadPoolExecutor(max_workers=2) as pool:
        sessions = list(pool.map(lambda _: first.request('POST', '/api/workout-sessions', start)[0], range(2)))
    session = sessions[0]
    require(sessions[0]['id'] == sessions[1]['id'], 'Concurrent start duplicated a workout')
    require(session['snapshot']['steps'][0]['repetitions'] == 15, 'Progression did not calculate the occurrence load')
    second.request('GET', f"/api/workout-sessions/{session['id']}", expected=404)
    second.request('POST', f"/api/workout-sessions/{session['id']}/cancel", {'revision': 0}, expected=404)
    require(not listed(second, '/api/workout-sessions'), 'History leaked to another owner')
    first.request('POST', '/api/workout-sessions', {'workout_id': wid}, expected=409)
    body['title'] += ' / изменено'
    body['rounds'][0]['exercises'][0]['repetitions'] = 25
    body['rounds'][0]['exercises'][0]['progression'] = None
    first.request('PUT', f'/api/workouts/{wid}', body)
    changed = dict(reps_body, title='Новое название упражнения')
    first.request('PUT', f"/api/exercises/{reps['id']}", changed)
    fresh, _ = first.request('GET', f"/api/workout-sessions/{session['id']}")
    require(fresh['snapshot']['steps'][0]['repetitions'] == 15 and fresh['snapshot']['steps'][0]['title'] == reps_body['title'], 'Editing changed the active snapshot')
    session = command(first, session, 'note', note='# Отличная тренировка')
    old_revision = session['revision']
    with ThreadPoolExecutor(max_workers=2) as pool:
        done = list(pool.map(lambda _: first.request('POST', f"/api/workout-sessions/{session['id']}/next", {'revision': old_revision, 'actual_repetitions': 15}, expected={200,409}), range(2)))
    require(sum('error' in payload for payload, _ in done) == 1, 'Stale concurrent next advanced twice')
    session, _ = first.request('GET', f"/api/workout-sessions/{session['id']}")
    require(session['status'] == 'completed' and session['habit_completed'], 'Workout did not atomically complete its habit')
    require(session['note'] == '# Отличная тренировка', 'Session note was lost')
    require(find_occurrence(occurrences(first, today), hid)['status'] == 'completed', 'Today was not completed')
    cal, _ = first.request('GET', f'/api/calendar?from={today}&to={today}')
    require(find_occurrence(cal['occurrences'], hid)['status'] == 'completed', 'Calendar differs from Today')
    stats, _ = first.request('GET', f'/api/habits/{hid}/statistics?from={today}&to={today}')
    require(stats['completed'] == 1, 'Habit statistics do not include workout completion')
    again, _ = first.request('POST', '/api/workout-sessions', start)
    require(again['id'] == session['id'], 'Completed occurrence restarted a second workout')
    first.request('POST', '/api/workout-sessions', dict(start, workout_id=str(uuid4())), expected=409)
    print('PASS: library, private images, real CRUD/search, ownership/CSRF, validation and archive guards.')
    print('PASS: linear progression, immutable active snapshots, concurrent start/commands and Today/calendar/habit statistics.')

    timed_body = plan('Таймеры ' + marker, [entry(combo['id'], 2, 1), entry(hold['id'], 0, 2)])
    timed_body['rounds'][0].update(repeat=2, rest_seconds=1)
    timed_body['rounds'][0]['exercises'][0]['rest_seconds'] = 1
    timed, _ = first.request('POST', '/api/workouts', timed_body, expected=201)
    timed_id = timed['id']
    running, _ = first.request('POST', '/api/workout-sessions', {'workout_id': timed_id})
    require([v['duration_seconds'] for v in running['snapshot']['steps']] == [2,1,2,1,2,1,2], 'Round, repeat or rest ordering is incorrect')
    command(first, running, 'next', expected=409)
    paused = command(first, running, 'pause')
    time.sleep(1.1)
    restored, _ = first.request('GET', f"/api/workout-sessions/{running['id']}")
    require(restored['elapsed_seconds'] == paused['elapsed_seconds'] and restored['status'] == 'paused', 'Paused timer kept running')
    running = command(first, restored, 'resume')
    time.sleep(2.1)
    running = command(first, running, 'next')
    require(running['step_index'] == 1 and running['results'][0]['actual_repetitions'] == 2, 'Combined repetitions timer was not confirmed')
    running = command(first, running, 'skip')
    require(running['step_index'] == 2, 'Rest skip failed')
    running = command(first, running, 'skip')
    running = command(first, running, 'cancel')
    require(running['status'] == 'cancelled' and len(running['results']) == 3, 'Cancellation destroyed partial results')
    first.request('DELETE', f'/api/workouts/{timed_id}', expected=204)
    first.request('DELETE', f"/api/exercises/{hold['id']}", expected=204)
    saved, _ = first.request('GET', f"/api/workout-sessions/{running['id']}")
    require(saved['snapshot']['steps'][2]['title'] == hold['data']['title'], 'Archive removed historical exercise data')
    first.request('POST', '/api/workout-sessions', {'workout_id': timed_id}, expected=404)

    habit_body['habit']['workout_id'] = wid
    retry_habit, _ = first.request('POST', '/api/habits', dict(habit_body, title='Частичное выполнение'), expected=201)
    partial_start = dict(start, habit_id=retry_habit['id'])
    partial, _ = first.request('POST', '/api/workout-sessions', partial_start)
    partial = command(first, partial, 'next', actual_repetitions=24)
    require(partial['status'] == 'partial' and not partial['habit_completed'], 'Insufficient repetitions completed the habit')
    require(find_occurrence(occurrences(first, today), retry_habit['id'])['status'] == 'todo', 'Partial session changed habit completion')
    retry, _ = first.request('POST', '/api/workout-sessions', partial_start)
    first.request('POST', f"/api/habits/{retry_habit['id']}/marks/{today}", {'status': 'cancelled', 'note': '**Решение пользователя**'})
    retry = command(first, retry, 'next', actual_repetitions=25)
    require(retry['status'] == 'completed' and not retry['habit_completed'], 'Workout overwrote a manual cancellation')
    require(find_occurrence(occurrences(first, today), retry_habit['id'])['habit_mark']['status'] == 'cancelled', 'Manual habit result was lost')
    first.request('DELETE', f"/api/habits/{retry_habit['id']}", expected=204)
    moved_habit, _ = first.request('POST', '/api/habits', dict(habit_body, title='Изменение правила во время сессии'), expected=201)
    moved, _ = first.request('POST', '/api/workout-sessions', dict(start, habit_id=moved_habit['id']))
    moved_body = copy.deepcopy(habit_body)
    moved_body['schedule']['start_date'] = str(today+timedelta(days=7))
    first.request('PUT', f"/api/habits/{moved_habit['id']}", moved_body)
    moved = command(first, moved, 'next', actual_repetitions=25)
    require(moved['status'] == 'completed' and not moved['habit_completed'], 'Changing a linked schedule blocked session completion or created an invalid mark')
    first.request('DELETE', f"/api/habits/{moved_habit['id']}", expected=204)
    archived_habit, _ = first.request('POST', '/api/habits', dict(habit_body, title='Архив во время сессии'), expected=201)
    archived, _ = first.request('POST', '/api/workout-sessions', dict(start, habit_id=archived_habit['id']))
    first.request('DELETE', f"/api/habits/{archived_habit['id']}", expected=204)
    archived = command(first, archived, 'next', actual_repetitions=25)
    require(archived['status'] == 'completed' and not archived['habit_completed'], 'Archiving a linked habit blocked snapshot completion')
    tokyo_body = copy.deepcopy(habit_body)
    tokyo_body['schedule'].update(timezone='Asia/Tokyo', time='00:30')
    tokyo, _ = first.request('POST', '/api/habits', tokyo_body, expected=201)
    shifted = find_occurrence(occurrences(first, today-timedelta(days=1)), tokyo['id'])
    tokyo_session, _ = first.request('POST', '/api/workout-sessions', dict(start, habit_id=tokyo['id'], date=shifted['date']))
    require(tokyo_session['snapshot']['date'] == str(today), 'Workout used profile calendar day instead of the habit occurrence key')
    command(first, tokyo_session, 'cancel')
    first.request('DELETE', f"/api/habits/{tokyo['id']}", expected=204)
    first.request('DELETE', f'/api/habits/{hid}', expected=204)
    first.request('DELETE', f'/api/workouts/{wid}', expected=204)
    standalone, _ = first.request('POST', '/api/workouts', body, expected=201)
    live, _ = first.request('POST', '/api/workout-sessions', {'workout_id': standalone['id']})
    first.request('DELETE', f"/api/workouts/{standalone['id']}", expected=204)
    first.request('DELETE', f"/api/exercises/{reps['id']}", expected=204)
    live = command(first, live, 'next', actual_repetitions=25)
    require(live['status'] == 'completed', 'Archiving the active plan/exercise prevented frozen session completion')
    require(any(v['id'] == session['id'] for v in listed(first, '/api/workout-sessions')), 'Archived workout disappeared from history')
    first.request('POST', '/api/auth/logout', expected=204)
    second.request('POST', '/api/auth/logout', expected=204)
    print('PASS: real timer expiry, early-completion guard, pause/reload/resume, repeats/rests, skipping and cancellation.')
    print('PASS: historical snapshots survive archive, insufficient loads stay partial and manual habit decisions are preserved.')
    print('PASS: changing or archiving a linked habit during execution does not block session completion.')
    print('PASS: stable habit occurrence keys across profile timezone boundaries and completing a snapshot after plan/exercise archive.')


def main():
    parser = argparse.ArgumentParser(description='Stage 5 verification against real services')
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, TypeError, ValueError, AttributeError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
