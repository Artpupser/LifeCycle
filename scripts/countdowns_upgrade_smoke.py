"""Upgrade 1.6: calendar anchored events and isolated, manual-only AI greetings."""
import argparse
import json
from datetime import datetime, timedelta, timezone
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    settings = owner.request('GET', '/api/settings')[0]
    owner.request('PUT', '/api/settings', {**settings, 'timezone': 'UTC'})
    body = {'title': 'Daily event', 'category': 'Custom category', 'icon': 'calendar', 'target_date': str(today - timedelta(days=2)), 'recurrence': 'daily', 'description': '**Event Markdown**', 'target_time': '09:00:15', 'timezone': 'UTC', 'details': {'full_name': 'PRIVATE_EVENT_PERSON', 'phone': 'PRIVATE_PHONE'}}
    event = owner.request('POST', '/api/countdowns', body, expected=201)[0]
    identifier = event['id']
    require(event['recurrence'] == 'daily' and event['seconds_elapsed'] > 0 and event['repetitions'] in [1, 2], 'Daily computation mismatch')
    other.request('GET', '/api/countdowns/' + identifier, expected=404)
    other.request('PUT', '/api/countdowns/' + identifier, body, expected=404)
    other.request('DELETE', '/api/countdowns/' + identifier, expected=404)
    Client(base).request('GET', '/api/countdowns', expected=401)
    owner.request('PUT', '/api/countdowns/' + identifier, body, origin='https://foreign.example', expected=403)
    for patch in [{'recurrence': 'weekly'}, {'timezone': 'Invalid/Zone'}, {'display': {'clock': 'invalid'}}, {'target_date': '1899-01-01'}, {'details': {'unknown': True}}]:
        owner.request('POST', '/api/countdowns', {**body, **patch}, expected=400)
    day = owner.request('GET', '/api/today?date=' + str(today))[0]
    calendar = owner.request('GET', f'/api/calendar?from={today}&to={today + timedelta(days=2)}')[0]
    require(len([e for e in day['events'] if e['countdown']['id'] == identifier]) == 1, 'Today must contain exactly one daily event')
    require(len([e for e in calendar['events'] if e['countdown']['id'] == identifier]) == 3, 'Calendar recurrence mismatch')
    require(all(e['countdown']['description'] == body['description'] for e in calendar['events']), 'Event Markdown was lost')
    # Cross-zone timed event lands on the previous profile day, while all-day events keep their date.
    timed = owner.request('POST', '/api/countdowns', {**body, 'target_date': str(today + timedelta(days=1)), 'target_time': '00:30:00', 'timezone': 'Asia/Tokyo', 'recurrence': 'once'}, expected=201)[0]
    day = owner.request('GET', '/api/today?date=' + str(today))[0]
    require(any(e['countdown']['id'] == timed['id'] for e in day['events']), 'Timed event was not projected to profile day')
    legacy = {'title': 'Legacy birthday', 'category': 'birthday', 'icon': 'cake', 'target_date': '2000-02-29', 'repeat_yearly': True}
    old = owner.request('POST', '/api/countdowns', legacy, expected=201)[0]
    require(old['recurrence'] == 'yearly' and old['repeat_yearly'], 'Legacy yearly API broken')
    future = owner.request('POST', '/api/countdowns', {**body, 'target_date': '2099-12-31', 'recurrence': 'yearly'}, expected=201)[0]
    require(future['next_date'] == '2099-12-31' and future['full_years'] is None and future['repetitions'] == 0, 'Future origin generated past anniversaries')
    monthly = owner.request('POST', '/api/countdowns', {**body, 'target_date': '2024-01-31', 'recurrence': 'monthly'}, expected=201)[0]
    cal = owner.request('GET', '/api/calendar?from=2024-02-01&to=2024-03-31')[0]
    require([e['date'] for e in cal['events'] if e['countdown']['id'] == monthly['id']] == ['2024-02-29', '2024-03-31'], 'Month-end anchor drifted')
    # CAS resolves concurrent writes, and legacy clients preserve the new metadata.
    payload = {**body, 'expected_updated_at': event['updated_at']}
    owner.request('PUT', '/api/countdowns/' + identifier, payload)
    owner.request('PUT', '/api/countdowns/' + identifier, payload, expected=409)
    owner.request('PUT', '/api/countdowns/' + identifier, {**legacy, 'target_date': body['target_date'], 'repeat_yearly': False})
    updated = owner.request('GET', '/api/countdowns/' + identifier)[0]
    require(updated['description'] == body['description'] and updated['target_time'] == '09:00:15' and updated['details']['full_name'] == 'PRIVATE_EVENT_PERSON', 'Legacy save erased metadata')
    # Even with broad user permissions the greeting preview must exclude ALL application records/history/tools.
    profile = owner.request('GET', '/api/profile')[0]
    owner.request('PUT', '/api/profile', {**profile, 'name': 'PRIVATE_PROFILE_PERSON'})
    note = owner.request('POST', '/api/notes', {'title': 'PRIVATE_APPLICATION_NOTE', 'content': 'secret'}, expected=201)[0]
    owner.request('PUT', f"/api/notes/{note['id']}/ai-access", {'revision': 0, 'ai_shared': True})
    config = owner.request('GET', '/api/ai/settings')[0]
    config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {k: True for k in config['permissions']}})[0]
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': str(today), 'to': str(today), 'message': 'Congratulate MANUALLY_ALLOWED_NAME', 'scenario': 'greeting'})[0]
    encoded = json.dumps(preview)
    require('PRIVATE_' not in encoded and 'MANUALLY_ALLOWED_NAME' in encoded and preview['history_turns'] == 0 and 'action_protocol' not in encoded, 'Greeting preview leaked application context')
    owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': str(today), 'to': str(today), 'message': 'x', 'scenario': 'invalid'}, expected=400)
    for item in [event, timed, old, future, monthly]: owner.request('DELETE', '/api/countdowns/' + item['id'], expected=204)
    require(not owner.request('GET', '/api/today?date=' + str(today))[0]['events'], 'Deleted events remained in Today')
    print('PASS: 1.6 recurrence/month-end/leap/future dates, exact time/timezones, Today/calendar without duplicates, legacy metadata, owner/Origin/CAS, and manual-only AI greeting preview (no inference).')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
