"""Interaction upgrade: personalized boards, multiday/cancelled tasks and removable habit analytics."""
import argparse
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    marker = uuid4().hex
    board = owner.request('POST', '/api/boards', {'name': marker, 'emoji': '🚀'}, expected=201)[0]
    path = '/api/boards/' + board['board']['id']
    require(board['board']['emoji'] == '🚀', 'Board emoji lost')
    column = board['columns'][0]
    payload = {'revision': board['board']['revision'], 'name': column['name'], 'color': '#DB2777', 'position': 2}
    other.request('PUT', path + '/columns/' + column['id'], payload, expected=404)
    owner.request('PUT', path + '/columns/' + column['id'], {**payload, 'color': 'red'}, expected=400)
    board = owner.request('PUT', path + '/columns/' + column['id'], payload)[0]
    require(board['columns'][-1]['id'] == column['id'] and board['columns'][-1]['color'] == '#DB2777', 'Column reorder/color failed')
    board = owner.request('PUT', path, {'revision': board['board']['revision'], 'name': marker, 'view': 'kanban', 'zoom': 'day'})[0]
    require(board['board']['emoji'] == '🚀', 'Legacy board rename cleared emoji')
    board = owner.request('PUT', path + '/columns/' + column['id'], {'revision': board['board']['revision'], 'name': 'Renamed'})[0]
    require(board['columns'][-1]['color'] == '#DB2777', 'Legacy column rename cleared color')
    board = owner.request('POST', path + '/tasks', {'revision': board['board']['revision'], 'column_id': column['id'], 'task': {'title': 'Quick ' + marker}})[0]
    task_id = board['items'][0]['task_id']
    rule = {'start_date': str(today - timedelta(days=2)), 'time': '09:00', 'timezone': 'UTC', 'duration_minutes': 5 * 1440, 'recurrence': 'once', 'end_date': None}
    owner.request('PUT', '/api/tasks/' + task_id, {'title': 'Long ' + marker, 'schedule': rule})
    rows = owner.request('GET', f'/api/today?date={today}')[0]['tasks']
    require(any(v['task']['id'] == task_id and v['date'] == rule['start_date'] for v in rows), 'Multiday task lost today/original key')
    require(any(v['id'] == task_id for v in owner.request('GET', f'/api/tasks?from={today}&to={today}')[0]), 'Multiday date search failed')
    owner.request('POST', f"/api/tasks/{task_id}/occurrences/{rule['start_date']}", {'status': 'rejected'})
    require(owner.request('GET', '/api/tasks/' + task_id)[0]['status'] == 'rejected', 'Cancellation not persisted')
    require(any(v['task']['id'] == task_id and v['status'] == 'rejected' for v in owner.request('GET', f'/api/today?date={today}')[0]['tasks']), 'Cancelled multiday snapshot lost')
    habit_body = {'title': 'Draft ' + marker, 'schedule': {**rule, 'start_date': str(today), 'time': None, 'duration_minutes': 15, 'recurrence': 'daily'}, 'habit': {'icon': '🌱', 'sub_habits': [], 'reminder_enabled': False, 'reminder_minutes_before': None}}
    draft = owner.request('POST', '/api/habits', habit_body, expected=201)[0]
    owner.request('DELETE', '/api/habits/' + draft['id'], expected=204)
    require(not owner.request('GET', f'/api/habits/statistics?from={today}&to={today}')[0], 'Discarded habit left empty analytics')
    habit = owner.request('POST', '/api/habits', {**habit_body, 'title': 'Recorded ' + marker}, expected=201)[0]
    history = '/api/habits/' + habit['id'] + '/history'
    owner.request('DELETE', history, {'confirmed': True}, expected=409)
    owner.request('POST', f"/api/habits/{habit['id']}/marks/{today}", {'status': 'completed'})
    owner.request('DELETE', '/api/habits/' + habit['id'], expected=204)
    stats = owner.request('GET', f'/api/habits/statistics?from={today}&to={today}')[0]
    require(len(stats) == 1 and not stats[0]['active'] and stats[0]['completed'] == 1, 'Recorded analytics not preserved')
    other.request('DELETE', history, {'confirmed': True}, expected=404)
    owner.request('DELETE', history, {'confirmed': False}, expected=400)
    owner.request('DELETE', history, {'confirmed': True}, origin='https://foreign.example', expected=403)
    owner.request('DELETE', history, {'confirmed': True}, expected=204)
    require(not owner.request('GET', f'/api/habits/statistics?from={today}&to={today}')[0], 'Explicit history deletion did not remove analytics')
    owner.request('GET', history, expected=404)
    owner.request('DELETE', '/api/tasks/' + task_id, expected=204)
    board = owner.request('GET', path)[0]
    owner.request('DELETE', path, {'revision': board['board']['revision']}, expected=204)
    print('PASS: emoji, column color/order/ownership, legacy compatibility, title-only creation, multiday calendar/search/cancellation and confirmed owned habit analytics deletion.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
