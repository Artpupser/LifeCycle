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
    # Repeated assignments have independent identities, revisions and encryption contexts.
    custom = owner.request('POST', '/api/labels', {'name': 'Delivery cost', 'kind': 'functional', 'function_key': 'cost', 'icon': 'tabler:truck'}, expected=201)[0]
    require(not custom['is_system'], 'A custom capability was marked as system-owned')
    owner.request('POST', '/api/labels', {'name': 'AI clone', 'kind': 'functional', 'function_key': 'ai_access'}, expected=400)
    owner.request('POST', path, {'label_id': cost['id'], 'value': {'amount': '20', 'currency': 'USD'}}, expected=201)
    owner.request('POST', path, {'label_id': custom['id'], 'value': {'amount': '7.5', 'currency': 'EUR'}}, expected=201)
    repeated = owner.request('GET', path)[0]['values']
    require(len(repeated) == 3 and len({row['id'] for row in repeated}) == 3, 'Repeated values replaced each other')
    duplicate = next(row for row in repeated if row['label_id'] == cost['id'] and row['id'] != new['id'])
    owner.request('PUT', path, {**body, 'revision': new['revision']}, expected=409)
    update = {'label_id': cost['id'], 'assignment_id': duplicate['id'], 'revision': duplicate['revision'], 'value': {'amount': '21', 'currency': 'USD'}}
    owner.request('PUT', path, update, expected=204)
    owner.request('PUT', path, update, expected=409)
    other.request('POST', path, {'label_id': cost['id'], 'value': {'amount': '1', 'currency': 'RUB'}}, expected=404)
    owner.request('DELETE', '/api/labels/' + custom['id'], {'revision': custom['revision']}, expected=204)
    require(len(owner.request('GET', path)[0]['values']) == 2, 'Custom definition deletion did not clear its values')

    # Native ordinary tags and subjects without tag fields share the registry API.
    owner.request('PUT', path, {'tags': [retained['name']], 'previous_tags': []}, expected=204)
    require(owner.request('GET', path)[0]['tags'] == [retained['name']], 'Native note tag adapter failed')
    require(next(row for row in owner.request('GET', '/api/notes')[0] if row['id'] == note['id'])['tags'] == [retained['name']], 'Label selection did not update native feature tags')
    owner.request('PUT', path, {'tags': [], 'previous_tags': []}, expected=409)
    exercise = owner.request('POST', '/api/exercises', {'title': 'Tag binding exercise', 'kind': 'repetitions'}, expected=201)[0]
    exercise_path = '/api/labels/subjects/exercises/' + exercise['id']
    owner.request('PUT', exercise_path, {'tags': [retained['name']], 'previous_tags': []}, expected=204)
    other.request('PUT', exercise_path, {'tags': [retained['name']]}, expected=404)
    owner.request('PUT', '/api/labels/' + retained['id'], {'name': 'Shared renamed tag', 'color': retained['color'], 'revision': retained['revision']})
    require(owner.request('GET', exercise_path)[0]['tags'] == ['Shared renamed tag'], 'Fallback binding did not follow registry rename')
    require(owner.request('GET', path)[0]['tags'] == ['Shared renamed tag'], 'Native tag did not follow registry rename')
    latest_tag = next(row for row in owner.request('GET', '/api/labels')[0] if row['id'] == retained['id'])
    owner.request('DELETE', '/api/labels/' + retained['id'], {'revision': latest_tag['revision']}, expected=204)
    require(owner.request('GET', exercise_path)[0]['tags'] == [], 'Deleted tag left a fallback binding')
    owner.request('PUT', exercise_path, {'tags': ['Deletion cleanup']}, expected=204)
    owner.request('DELETE', '/api/exercises/' + exercise['id'], expected=204)
    require(not any(row['subject_id'] == exercise['id'] for row in owner.request('GET', '/api/labels/subject-tags')[0]), 'Deleted subject left ordinary tag bindings')
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
    print('Repeated/custom functional labels, shared native/fallback tags, icons, exact money, ABA revisions, cleanup, AI permissions, owner isolation and calendar: OK')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8080')
    parser.add_argument('--origin', default='http://127.0.0.1:5173')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    run(parser.parse_args())
