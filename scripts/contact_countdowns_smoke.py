"""Contacts → Countdown integration and privacy, on synthetic accounts only."""
import argparse
import json
from datetime import datetime, timezone
from auth_smoke import Client, require
from core_smoke import login
from migrations_smoke import sql


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    settings = owner.request('GET', '/api/settings')[0]
    owner.request('PUT', '/api/settings', {**settings, 'timezone': 'UTC'})
    data = {'first_name': 'PRIVATE_LINKED_PERSON', 'phones': ['+12025550125'], 'birth_date': f'2000-{today.month:02}-{today.day:02}', 'description': 'PRIVATE_LINKED_DESCRIPTION'}
    c = owner.request('POST', '/api/contacts', {'data': data}, expected=201)[0]
    path = '/api/contacts/' + c['id']
    require(owner.request('GET', '/api/countdowns')[0] == [], 'Birthday created without consent')
    c = owner.request('PUT', path, {'revision': c['revision'], 'data': {**c['data'], 'birthday_enabled': True}})[0]
    events = owner.request('GET', '/api/countdowns')[0]
    require(len(events) == 1, 'Birthday missing or duplicated')
    event = events[0]
    ep = '/api/countdowns/' + event['id']
    require(event['contact_id'] == c['id'] and event['contact_birthday'] and event['target_date'] == data['birth_date'] and data['first_name'] in event['title'], 'Birthday does not resolve contact facts')
    require(event['full_years'] == today.year - 2000 and event['recurrence'] == 'yearly', 'Birthday age/rule mismatch')
    day = owner.request('GET', f'/api/today?date={today}')[0]
    require(len(day['events']) == 1, 'Birthday missing/duplicated in Today')
    # A forged contact cannot be linked through an otherwise owner-authenticated event.
    generic = {'title': 'Meeting', 'category': 'Meetings', 'icon': 'calendar', 'target_date': str(today), 'description': '**Meeting Markdown**', 'contact_id': c['id']}
    other.request('POST', '/api/countdowns', generic, expected=404)
    other.request('POST', ep + '/unlink', {'expected_updated_at': event['updated_at']}, expected=404)
    owner.request('POST', ep + '/unlink', {'expected_updated_at': event['updated_at']}, origin='https://foreign.example', expected=403)
    regular = owner.request('POST', '/api/countdowns', generic, expected=201)[0]
    owner.request('PUT', '/api/countdowns/' + regular['id'], {**generic, 'contact_birthday': True}, expected=409)
    # Changing contact facts updates existing events, not copies.
    c = owner.request('PUT', path, {'revision': c['revision'], 'data': {**c['data'], 'first_name': 'PRIVATE_RENAMED_PERSON', 'birth_date': '2000-02-29'}})[0]
    updated = owner.request('GET', ep)[0]
    require(updated['id'] == event['id'] and updated['target_date'] == '2000-02-29' and 'PRIVATE_RENAMED_PERSON' in updated['title'], 'Birthday update lost identity or stayed stale')
    owner.request('POST', ep + '/unlink', {'expected_updated_at': event['updated_at']}, expected=409)
    require(owner.request('GET', '/api/countdowns/' + regular['id'])[0]['details']['full_name'] == 'PRIVATE_RENAMED_PERSON', 'Regular linked event did not update')
    # Leap years and clamped anniversaries still use the shared recurrence engine.
    leap = owner.request('GET', '/api/calendar?from=2027-02-27&to=2027-03-01')[0]['events']
    require([e['date'] for e in leap if e['countdown']['id'] == event['id']] == ['2027-02-28'], 'Linked leap birthday has wrong occurrence')
    # Missing dates suspend, without fabricated public dates and without deleting settings/ID.
    c = owner.request('PUT', path, {'revision': c['revision'], 'data': {**c['data'], 'birth_date': None}})[0]
    suspended = owner.request('GET', ep)[0]
    require(suspended['suspended'] and suspended['target_date'] is None and suspended['next_at'] is None and suspended['full_years'] is None, 'Missing birthday must suspend, not invent a date')
    require(not [e for e in owner.request('GET', '/api/calendar?from=2027-02-27&to=2027-03-01')[0]['events'] if e['countdown']['id'] == event['id']], 'Suspended birthday leaked into calendar')
    c = owner.request('PUT', path, {'revision': c['revision'], 'data': {**c['data'], 'birth_date': data['birth_date']}})[0]
    restored = owner.request('GET', ep)[0]
    require(not restored['suspended'] and len(owner.request('GET', '/api/countdowns')[0]) == 2, 'Restoring date created a duplicate')
    if args.check_storage:
        stored = sql(f"SELECT title,target_date,details::text FROM app.countdowns WHERE id='{event['id']}'").strip()
        require(stored == 'День рождения|1900-01-01|{}', 'Contact facts were copied unencrypted into birthday storage')
        require(sql(f"SELECT count(*) FROM app.activity_events WHERE entity_id IN ('{c['id']}','{event['id']}','{regular['id']}')").strip() == '0', 'Private contact changes reached activity/AI event log')
        blob = sql(f"SELECT encode(encrypted_data,'hex') FROM app.contacts WHERE id='{c['id']}'").strip()
        require(data['first_name'].encode().hex() not in blob and b'PRIVATE_RENAMED_PERSON'.hex() not in blob, 'Contact data stored in plaintext')
    owner.request('POST', ep + '/unlink', {'expected_updated_at': restored['updated_at']}, expected=204)
    detached = owner.request('GET', ep)[0]
    c = owner.request('GET', path)[0]
    require(detached['contact_id'] is None and not c['data']['birthday_enabled'] and detached['target_date'] == data['birth_date'], 'Unlink failed to preserve independent birthday or disable recreation')
    c = owner.request('PUT', path, {'revision': c['revision'], 'data': {**c['data'], 'first_name': 'PRIVATE_LATER_NAME'}})[0]
    require(owner.request('GET', ep)[0]['title'] == detached['title'], 'Detached event changed with contact')
    # Explicit keep/delete policies and CAS guard contact deletion.
    owner.request('DELETE', path, {'revision': c['revision']}, expected=400)
    owner.request('DELETE', path, {'revision': c['revision'], 'events': 'keep'}, expected=204)
    kept = owner.request('GET', '/api/countdowns/' + regular['id'])[0]
    require(kept['contact_id'] is None and kept['details']['full_name'] == 'PRIVATE_LATER_NAME', 'Deleting contact did not preserve independent regular event')
    if args.check_storage:
        require(sql(f"SELECT details::text,contact_snapshot IS NOT NULL FROM app.countdowns WHERE id='{regular['id']}'").strip() == '{}|t', 'Detached contact snapshot was not encrypted')
    # Editing an independent snapshot preserves encrypted storage.
    changed = owner.request('PUT', ep, {**generic, 'title': 'PRIVATE_INDEPENDENT_TITLE', 'target_date': data['birth_date'], 'contact_id': None, 'expected_updated_at': detached['updated_at']})[0]
    require(changed['title'] == 'PRIVATE_INDEPENDENT_TITLE' and changed['details'] == detached['details'], 'Editing independent snapshot lost facts')
    if args.check_storage:
        require(sql(f"SELECT title,NOT EXISTS(SELECT 1 FROM jsonb_each_text(details) WHERE value<>''),contact_snapshot IS NOT NULL FROM app.countdowns WHERE id='{event['id']}'").strip() == 'Событие|t|t', 'Editing detached event disclosed snapshot in plaintext')
    d = owner.request('POST', '/api/contacts', {'data': {**data, 'first_name': 'PRIVATE_DELETE_LINKS', 'birthday_enabled': True}}, expected=201)[0]
    linked = [e for e in owner.request('GET', '/api/countdowns')[0] if e['contact_id'] == d['id']]
    owner.request('DELETE', '/api/contacts/' + d['id'], {'revision': d['revision'], 'events': 'delete'}, expected=204)
    for e in linked: owner.request('GET', '/api/countdowns/' + e['id'], expected=404)
    require(len(owner.request('GET', '/api/countdowns')[0]) == 2, 'Deleting links removed unrelated events')
    # A legacy birthday can adopt Contacts as its source without changing its ID or adding a second event.
    legacy = owner.request('POST', '/api/countdowns', {**generic, 'contact_id': None, 'title': 'Legacy birthday', 'icon': 'cake', 'recurrence': 'yearly', 'details': {'full_name': 'PRIVATE_LEGACY_NAME'}}, expected=201)[0]
    promoted = owner.request('POST', '/api/contacts', {'data': {**data, 'first_name': 'PRIVATE_LEGACY_NAME'}}, expected=201)[0]
    adopted = owner.request('PUT', '/api/countdowns/' + legacy['id'], {**generic, 'icon': 'cake', 'contact_id': promoted['id'], 'contact_birthday': True, 'expected_updated_at': legacy['updated_at']})[0]
    require(adopted['id'] == legacy['id'] and adopted['contact_birthday'] and adopted['target_date'] == data['birth_date'], 'Legacy birthday adoption failed')
    require(len([e for e in owner.request('GET', '/api/countdowns')[0] if e['contact_id'] == promoted['id']]) == 1, 'Legacy adoption created a duplicate')
    require(owner.request('GET', '/api/contacts/' + promoted['id'])[0]['data']['birthday_enabled'], 'Legacy adoption did not update contact consent')
    # Private events are excluded even from indirectly AI-visible aggregates.
    settings = owner.request('GET', '/api/ai/settings')[0]
    settings = owner.request('PUT', '/api/ai/settings', {**{k: settings[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {k: True for k in settings['permissions']}})[0]
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    for scenario in ['assistant', 'greeting']:
        preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': settings['revision'], 'from': str(today), 'to': str(today), 'message': 'Generate a greeting with manually allowed facts only', 'scenario': scenario})[0]
        encoded = json.dumps(preview)
        require('PRIVATE_' not in encoded and c['id'] not in encoded and event['id'] not in encoded and 'countdown_created' not in encoded, 'Linked or detached contact leaked through AI context')
    print('PASS: Contacts→Countdown consent, owner isolation, dynamic name/date sync, CAS, leap/Today/calendar, suspension/restoration, dedup, unlink, deletion keep/delete, encrypted snapshots and direct/indirect AI isolation.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    parser.add_argument('--check-storage', action='store_true')
    run(parser.parse_args())
