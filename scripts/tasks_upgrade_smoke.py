"""Upgrade 1.5 on real PostgreSQL: boards, safe organization, tags and minute planning."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login, task_body


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    marker = uuid4().hex
    schedule = {'start_date': str(today), 'time': '23:30', 'timezone': 'UTC', 'duration_minutes': 120, 'recurrence': 'once', 'end_date': None}
    tag = owner.request('POST', '/api/task-tags', {'name': 'shared_' + marker}, expected=201)[0]
    t1 = owner.request('POST', '/api/tasks', task_body('First ' + marker, schedule=schedule, tags=[tag['name']]), expected=201)[0]
    t2 = owner.request('POST', '/api/tasks', task_body('Second ' + marker, tags=[tag['name']]), expected=201)[0]
    history_task = owner.request('POST', '/api/tasks', task_body('History ' + marker, tags=[tag['name']]), expected=201)[0]
    owner.request('POST', f"/api/tasks/{history_task['id']}/occurrences/{today}", {'status': 'completed'})
    foreign_task = other.request('POST', '/api/tasks', task_body('Foreign task', tags=[]), expected=201)[0]
    a = owner.request('POST', '/api/boards', {'name': 'Heartbeat ' + marker}, expected=201)[0]
    b = owner.request('POST', '/api/boards', {'name': 'Project ' + marker}, expected=201)[0]
    ap = '/api/boards/' + a['board']['id']
    bp = '/api/boards/' + b['board']['id']
    Client(base).request('GET', '/api/boards', expected=401)
    other.request('GET', ap, expected=404)
    other.request('DELETE', ap, {'revision': a['board']['revision']}, expected=404)
    other.request('PUT', ap, {k: a['board'][k] for k in ['revision','name','view','zoom']}, expected=404)
    other.request('PUT', ap, {**a['board'], 'name': 'Foreign'}, expected=400)  # extra id is rejected
    owner.request('POST', ap + '/columns', {'revision': a['board']['revision'], 'name': 'Blocked', 'position': 0}, origin='https://foreign.example', expected=403)
    def current(path):
        return owner.request('GET', path)[0]
    def mutate(path, suffix, data, method='PUT', expected=200):
        revision = current(path)['board']['revision']
        return owner.request(method, path + suffix, {'revision': revision, **data}, expected=expected)[0]
    mutate(ap, '/items/' + foreign_task['id'], {'column_id': a['columns'][0]['id']}, expected=404)
    mutate(ap, '/items/' + t1['id'], {'column_id': b['columns'][0]['id']}, expected=404)
    for task in [t1, t2]:
        mutate(ap, '/items/' + task['id'], {'column_id': a['columns'][0]['id']})
    stale = a['board']['revision']
    owner.request('PUT', ap + '/items/' + t1['id'], {'revision': stale, 'column_id': a['columns'][1]['id']}, expected=409)
    a = mutate(ap, '/items/' + t2['id'], {'column_id': a['columns'][0]['id'], 'before_id': t1['id']})
    require([i['task_id'] for i in a['items']] == [t2['id'], t1['id']], 'Task order not persisted')
    # The same board revision can only be consumed by one concurrent mutation.
    payload = {'revision': a['board']['revision'], 'column_id': a['columns'][1]['id']}
    def competing(task):
        return owner.request('PUT', ap + '/items/' + task['id'], payload, expected={200, 409})[0]
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(competing, [t1, t2]))
    require(current(ap)['board']['revision'] == payload['revision'] + 1 and sum('board' in result for result in results) == 1, 'Concurrent mutations were not serialized by revision')
    a = current(ap)
    source = next(c for c in a['columns'] if any(i['column_id'] == c['id'] for i in a['items']))
    target = next(c for c in a['columns'] if c['id'] != source['id'])
    mutate(ap, '/columns/' + source['id'], {}, method='DELETE', expected=409)
    a = mutate(ap, '/columns/' + source['id'], {'target_id': target['id']}, method='DELETE')
    require(len(a['items']) == 2 and all(i['column_id'] != source['id'] for i in a['items']), 'Column deletion lost tasks')
    a = mutate(ap, '/columns', {'name': 'Review', 'position': 0}, method='POST')
    review = a['columns'][0]
    a = mutate(ap, '/columns/' + review['id'], {'name': 'Reviewed', 'position': len(a['columns']) - 1})
    require(a['columns'][-1]['name'] == 'Reviewed', 'Column rename/reorder lost')
    a = mutate(ap, '', {'name': 'Renamed ' + marker, 'view': 'gantt', 'zoom': 'day'})
    require(current(ap)['board']['view'] == 'gantt' and current(ap)['board']['zoom'] == 'day', 'Per-board display preferences lost')
    count = len(owner.request('GET', '/api/tasks')[0])
    mutate(ap, '/tasks', {'column_id': a['columns'][0]['id'], 'task': task_body('Invalid', parent_id=foreign_task['id'])}, method='POST', expected=400)
    require(len(owner.request('GET', '/api/tasks')[0]) == count, 'Failed board task creation partially committed')
    a = mutate(ap, '/tasks', {'column_id': a['columns'][0]['id'], 'task': task_body('Board-created ' + marker, tags=[])}, method='POST')
    added = next(i['task_id'] for i in a['items'] if i['task_id'] not in [t1['id'], t2['id']])
    old_revision = a['board']['revision']
    mutate(bp, '/items/' + t2['id'], {'column_id': b['columns'][0]['id']})
    require(current(ap)['board']['revision'] == old_revision + 1 and all(i['task_id'] != t2['id'] for i in current(ap)['items']), 'Cross-board move duplicated membership')
    mutate(bp, '/items/' + t2['id'], {}, method='DELETE')
    require(owner.request('GET', '/api/tasks/' + t2['id'])[0]['title'] == t2['title'], 'Removing membership deleted task')
    other.request('PUT', '/api/task-tags/' + tag['id'], {'revision': 0, 'name': 'foreign'}, expected=404)
    renamed = 'renamed_' + marker
    tag = owner.request('PUT', '/api/task-tags/' + tag['id'], {'revision': 0, 'name': renamed})[0]
    owner.request('PUT', '/api/task-tags/' + tag['id'], {'revision': 0, 'name': 'stale'}, expected=409)
    require(len(owner.request('GET', '/api/tasks?tag=' + renamed)[0]) == 3, 'Tag rename not synchronized across tasks')
    history = owner.request('GET', '/api/tasks/' + history_task['id'] + '/history')[0]
    require(history[0]['task']['tags'] == history_task['tags'], 'Tag rename rewrote historical snapshot')
    owner.request('DELETE', '/api/task-tags/' + tag['id'], {'revision': tag['revision']}, expected=204)
    require(all(not owner.request('GET', '/api/tasks/' + t['id'])[0]['tags'] for t in [t1, t2]), 'Tag deletion did not remove only associations')
    t1 = owner.request('GET', '/api/tasks/' + t1['id'])[0]
    plan_path = '/api/tasks/' + t1['id'] + '/plan'
    start = str(today + timedelta(days=1)) + 'T23:45:00Z'
    payload = {'expected_updated_at': t1['updated_at'], 'starts_at': start, 'duration_minutes': 90, 'occurrence_date': str(today)}
    other.request('PUT', plan_path, payload, expected=404)
    owner.request('PUT', plan_path, {**payload, 'duration_minutes': 366 * 1440 + 1}, expected=400)
    t1 = owner.request('PUT', plan_path, payload)[0]
    owner.request('PUT', plan_path, payload, expected=409)
    require(t1['schedule']['start_date'] == str(today + timedelta(days=1)) and t1['schedule']['time'] == '23:45' and t1['schedule']['duration_minutes'] == 90, 'Minute planning not saved')
    day = str(today + timedelta(days=1))
    today_plan = owner.request('GET', '/api/today?date=' + day)[0]['tasks']
    calendar = owner.request('GET', f'/api/calendar?from={day}&to={day}')[0]['occurrences']
    for rows in [today_plan, calendar]:
        match = next(r for r in rows if r['task']['id'] == t1['id'])
        require(match['starts_at'].startswith(day + 'T23:45:00') and match['task']['schedule']['duration_minutes'] == 90, 'Gantt/Today/Calendar diverged')
    # Fall-back: reject the second repeated minute because schedule rules choose the first.
    dst = owner.request('POST', '/api/tasks', task_body('DST ' + marker, tags=[], schedule={**schedule, 'start_date': '2026-10-25', 'time': '02:30', 'timezone': 'Europe/Berlin'}), expected=201)[0]
    dst_path = '/api/tasks/' + dst['id'] + '/plan'
    payload = {'expected_updated_at': dst['updated_at'], 'starts_at': '2026-10-25T01:30:00Z', 'duration_minutes': 60}
    owner.request('PUT', dst_path, payload, expected=400)
    dst = owner.request('PUT', dst_path, {**payload, 'starts_at': '2026-10-25T00:30:00Z'})[0]
    # Finalized results remain read-only, and a future interval edit preserves past snapshots.
    finalized = owner.request('GET', '/api/tasks/' + history_task['id'])[0]
    owner.request('PUT', '/api/tasks/' + finalized['id'] + '/plan', {'expected_updated_at': finalized['updated_at'], 'starts_at': start, 'duration_minutes': 60}, expected=409)
    series = owner.request('POST', '/api/tasks', task_body('Series ' + marker, tags=[], schedule={**schedule, 'start_date': '2026-03-27', 'time': '09:00', 'timezone': 'Europe/Berlin', 'recurrence': 'interval', 'interval_days': 2, 'end_date': '2026-04-02'}), expected=201)[0]
    owner.request('POST', '/api/tasks/' + series['id'] + '/occurrences/2026-03-27', {'status': 'completed'})
    before = owner.request('GET', '/api/tasks/' + series['id'] + '/history')[0]
    series = owner.request('PUT', '/api/tasks/' + series['id'] + '/plan', {'expected_updated_at': series['updated_at'], 'occurrence_date': '2026-03-31', 'starts_at': '2026-03-31T08:00:00Z', 'duration_minutes': 75})[0]
    require(series['schedule']['start_date'] == '2026-03-27' and series['schedule']['time'] == '10:00', 'Editing a future occurrence moved the series anchor')
    require(owner.request('GET', '/api/tasks/' + series['id'] + '/history')[0] == before, 'Rescheduling rewrote completed history')
    future = owner.request('GET', '/api/calendar?from=2026-03-31&to=2026-03-31')[0]['occurrences']
    require(next(r for r in future if r['task']['id'] == series['id'])['starts_at'].startswith('2026-03-31T08:00:00'), 'Recurring minutes drifted across DST')
    owner.request('DELETE', '/api/tasks/' + series['id'], expected=204)
    # Undo of an AI-created task must respect a board link added later by the owner.
    config = owner.request('GET', '/api/ai/settings')[0]
    config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {**config['permissions'], 'tasks': True, 'changes': True}})[0]
    ai_id = str(uuid4())
    proposal = owner.request('POST', '/api/ai/actions', {'revision': config['revision'], 'summary': 'Synthetic board integration', 'actions': [{'entity': 'task', 'operation': 'create', 'id': ai_id, 'expected_updated_at': None, 'data': task_body('AI linked ' + marker, tags=[])}]}, expected=201)[0]
    owner.request('POST', '/api/ai/actions/' + proposal['id'] + '/apply', {'confirmed': True})
    mutate(ap, '/items/' + ai_id, {'column_id': current(ap)['columns'][0]['id']})
    owner.request('POST', '/api/ai/actions/' + proposal['id'] + '/undo', {'confirmed': True}, expected=409)
    owner.request('GET', '/api/tasks/' + ai_id)
    mutate(ap, '/items/' + ai_id, {}, method='DELETE')
    owner.request('POST', '/api/ai/actions/' + proposal['id'] + '/undo', {'confirmed': True})
    owner.request('GET', '/api/tasks/' + ai_id, expected=404)
    a = current(ap)
    owner.request('DELETE', ap, {'revision': a['board']['revision']}, expected=204)
    for task_id in [t1['id'], t2['id'], added]:
        owner.request('GET', '/api/tasks/' + task_id)
    b = current(bp)
    owner.request('DELETE', bp, {'revision': b['board']['revision']}, expected=204)
    for task_id in [t1['id'], t2['id'], history_task['id'], added, dst['id']]:
        owner.request('DELETE', '/api/tasks/' + task_id, expected=204)
    other.request('DELETE', '/api/tasks/' + foreign_task['id'], expected=204)
    print('PASS: owned boards, custom ordered columns/tasks, CAS/concurrency, atomic creation, cross-board membership, safe deletion, shared tags and immutable history, minute planning/UTC/DST and Today/Calendar integration.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
