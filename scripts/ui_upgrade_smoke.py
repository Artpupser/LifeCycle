"""UX follow-up: persisted tag colors and the unified workspace membership contract."""
import argparse
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    marker = uuid4().hex
    tag = owner.request('POST', '/api/task-tags', {'name': 'Color ' + marker, 'color': '#DC2626'}, expected=201)[0]
    require(tag['color'] == '#DC2626', 'Tag color did not roundtrip')
    owner.request('POST', '/api/task-tags', {'name': 'Bad', 'color': '#nothex'}, expected=400)
    owner.request('PUT', '/api/task-tags/' + tag['id'], {'name': tag['name'], 'color': 'red', 'revision': 0}, expected=400)
    other.request('PUT', '/api/task-tags/' + tag['id'], {'name': tag['name'], 'color': '#FFFFFF', 'revision': 0}, expected=404)
    owner.request('PUT', '/api/task-tags/' + tag['id'], {'name': tag['name'], 'color': '#FFFFFF', 'revision': 0}, origin='https://foreign.example', expected=403)
    task = owner.request('POST', '/api/tasks', {'title': 'Workspace ' + marker, 'tags': [tag['name']]}, expected=201)[0]
    tag = owner.request('PUT', '/api/task-tags/' + tag['id'], {'name': tag['name'], 'color': '#2563EB', 'revision': 0})[0]
    require(tag['color'] == '#2563EB', 'Tag color update lost')
    require(owner.request('GET', '/api/tasks/' + task['id'])[0]['updated_at'] == task['updated_at'], 'Changing presentation color invalidated task content')
    owner.request('PUT', '/api/task-tags/' + tag['id'], {'name': tag['name'], 'color': '#FFFFFF', 'revision': 0}, expected=409)
    renamed = owner.request('PUT', '/api/task-tags/' + tag['id'], {'name': 'Renamed ' + marker, 'revision': tag['revision']})[0]
    require(renamed['color'] == '#2563EB', 'Legacy tag rename reset color')
    task = owner.request('GET', '/api/tasks/' + task['id'])[0]
    require(task['tags'] == [renamed['name']], 'Rename lost shared associations')
    board = owner.request('POST', '/api/boards', {'name': 'Workspace board ' + marker}, expected=201)[0]
    path = '/api/boards/' + board['board']['id']
    board = owner.request('PUT', path + '/items/' + task['id'], {'revision': board['board']['revision'], 'column_id': board['columns'][0]['id']})[0]
    Client(base).request('GET', '/api/boards/memberships', expected=401)
    require(not other.request('GET', '/api/boards/memberships')[0], 'Memberships crossed ownership')
    membership = owner.request('GET', '/api/boards/memberships')[0]
    require(len(membership) == 1 and membership[0]['task_id'] == task['id'] and membership[0]['column_name'] == board['columns'][0]['name'], 'Unified task membership is inconsistent')
    owner.request('DELETE', path, {'revision': board['board']['revision']}, expected=204)
    require(not owner.request('GET', '/api/boards/memberships')[0], 'Deleted board left stale membership')
    owner.request('GET', '/api/tasks/' + task['id'])
    owner.request('DELETE', '/api/tasks/' + task['id'], expected=204)
    owner.request('DELETE', '/api/task-tags/' + tag['id'], {'revision': renamed['revision']}, expected=204)
    print('PASS: owned color persistence/validation/CAS/Origin, presentation-only updates, compatible rename, shared tags and isolated unified memberships.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
