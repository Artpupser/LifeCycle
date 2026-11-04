"""Acceptance of typed labels, current calendar state and owner isolation in an isolated DB."""
import argparse
from datetime import date, timedelta
from auth_smoke import Client, origin_url, require
from core_smoke import login


def run(args):
    origin = origin_url(args.origin)
    mail = Client(args.mailpit_url, origin)
    owner = login(args.url, origin, mail, 30)
    other = login(args.url, origin, mail, 30)
    labels = owner.request('GET', '/api/labels')[0]
    functions = {item['function_key']: item for item in labels if item.get('function_key')}
    require(set(functions) == {'ai_access', 'cost'}, 'Missing typed capabilities')
    cost = functions['cost']
    tag = owner.request('POST', '/api/labels', {'name': 'Icon QA', 'icon': 'twemoji:grinning-face'}, expected=201)[0]
    require(tag['icon'] == 'twemoji:grinning-face', 'Icon was not saved')
    owner.request('PUT', '/api/labels/' + tag['id'], {'name': 'Icon QA updated', 'color': tag['color'], 'icon': 'tabler:zodiac-leo', 'revision': tag['revision']})
    changed_tag = next(item for item in owner.request('GET', '/api/labels')[0] if item['id'] == tag['id'])
    retained = owner.request('PUT', '/api/labels/' + tag['id'], {'name': changed_tag['name'], 'color': changed_tag['color'], 'revision': changed_tag['revision']})[0]
    require(retained['icon'] == 'tabler:zodiac-leo', 'Legacy update erased an existing icon')
    require(any(item.get('icon') == 'tabler:zodiac-leo' for item in owner.request('GET', '/api/labels')[0]), 'Icon update lost')
    owner.request('DELETE', '/api/labels/' + cost['id'], {'revision': cost['revision']}, expected=400)
    note = owner.request('POST', '/api/notes', {'title': 'Functional note'}, expected=201)[0]
    path = '/api/labels/subjects/notes/' + note['id']
    body = {'label_id': cost['id'], 'value': {'amount': '000100.1', 'currency': 'RUB'}, 'revision': None}
    owner.request('PUT', path, body, expected=204)
    subject = owner.request('GET', path)[0]
    value = subject['values'][0]
    require(value['value'] == {'amount': '100.10', 'currency': 'RUB'}, 'Exact money normalization failed')
    owner.request('PUT', path, body, expected=409)
    owner.request('PUT', path, {**body, 'revision': value['revision'], 'value': {'amount': '-1', 'currency': 'RUB'}}, expected=400)
    other.request('GET', path, expected=404)
    other.request('PUT', path, body, expected=404)
    require(other.request('GET', '/api/labels/values')[0] == [], 'Values crossed owner boundary')
    owner.request('PUT', path, {**body, 'revision': value['revision'], 'value': None}, expected=204)
    owner.request('PUT', path, body, expected=204)
    new = owner.request('GET', path)[0]['values'][0]
    require(new['revision'] != value['revision'], 'Revision reused after detach/reattach')
    owner.request('PUT', path, {**body, 'revision': value['revision']}, expected=409)
    ai = subject['ai_access']
    owner.request('PUT', '/api/notes/' + note['id'] + '/ai-access', {'ai_shared': True, 'revision': ai['ai_access_revision']})
    require(owner.request('GET', path)[0]['ai_access']['ai_shared'], 'Functional AI adapter does not see existing permissions')
    owner.request('PUT', path, {**body, 'label_id': functions['ai_access']['id']}, expected=400)
    owner.request('DELETE', '/api/notes/' + note['id'], expected=204)
    require(owner.request('GET', '/api/labels/values')[0] == [], 'Subject deletion left capability values')
    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    rule = {'start_date': str(yesterday), 'time': '10:00', 'timezone': 'UTC', 'duration_minutes': 4320, 'recurrence': 'once', 'interval_days': 1, 'weekdays': [], 'end_date': None}
    task = owner.request('POST', '/api/tasks', {'title': 'Multi-day current state', 'schedule': rule}, expected=201)[0]
    calendar = f'/api/calendar?from={yesterday}&to={tomorrow}'
    def contains(identifier):
        return any(row['task']['id'] == identifier for row in owner.request('GET', calendar)[0]['occurrences'])
    require(contains(task['id']), 'Pending multi-day task missing')
    owner.request('POST', f"/api/tasks/{task['id']}/occurrences/{yesterday}", {'status': 'completed'})
    require(not contains(task['id']), 'Completed multi-day task remains in calendar')
    editable = {key: task[key] for key in ['title', 'description', 'tags', 'color', 'priority', 'parent_id', 'due_at', 'schedule']}
    owner.request('PUT', '/api/tasks/' + task['id'], {**editable, 'status': 'todo'})
    require(contains(task['id']), 'Historical snapshot overrides current reopened task')
    rule.update(duration_minutes=15, recurrence='daily')
    recurring = owner.request('POST', '/api/tasks', {'title': 'Per-occurrence state', 'schedule': rule}, expected=201)[0]
    owner.request('POST', f"/api/tasks/{recurring['id']}/occurrences/{yesterday}", {'status': 'completed'})
    rows = [row for row in owner.request('GET', calendar)[0]['occurrences'] if row['task']['id'] == recurring['id']]
    require(rows and all(row['date'] != str(yesterday) for row in rows) and any(row['date'] == str(today) for row in rows), 'One completion hid the rest of the series')
    print('Functional labels, icons, exact money, ABA revisions, deletion, AI adapter, owner isolation and multi-day/recurring calendar: OK')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8080')
    parser.add_argument('--origin', default='http://127.0.0.1:5173')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    run(parser.parse_args())
