"""Synthetic owner-only acceptance for Contacts; never performs external inference."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    body = {'data': {'first_name': 'PRIVATE_CONTACT_ANNA', 'last_name': 'Иванова', 'middle_name': 'Петровна', 'phones': ['+7 (900) 123-45-67', '+7 900 7654321'], 'birth_date': '2000-02-29', 'description': '**PRIVATE_CONTACT_DESCRIPTION**', 'relationship': 'Семья', 'profession': 'Архитектор', 'activity': 'Проектирование', 'categories': ['Родные'], 'tags': ['Важные']}}
    c = owner.request('POST', '/api/contacts', body, expected=201)[0]
    require(c['revision'] == 0 and c['data']['birth_date'] == '2000-02-29', 'Contact creation lost data')
    path = '/api/contacts/' + c['id']
    require(len(owner.request('GET', '/api/contacts')[0]) == 1, 'Contact missing from list')
    require(other.request('GET', '/api/contacts')[0] == [], 'Other owner can list contacts')
    Client(base).request('GET', '/api/contacts', expected=401)
    for method, payload in [('GET', None), ('PUT', {**body, 'revision': 0}), ('DELETE', {'revision': 0, 'events': 'keep'})]:
        other.request(method, path, payload, expected=404)
    owner.request('PUT', path, {**body, 'revision': 0}, origin='https://foreign.example', expected=403)
    for patch in [{'first_name': '', 'last_name': '', 'middle_name': ''}, {'birth_date': '2099-01-01'}, {'phones': ['abc']}, {'phones': ['+79001234567', '+7 900 123 45 67']}, {'unknown': 'x'}]:
        owner.request('POST', '/api/contacts', {'data': {**body['data'], **patch}}, expected=400)
    owner.request('POST', '/api/contacts', body, expected=409)
    changed = owner.request('PUT', path, {**body, 'revision': 0, 'data': {**body['data'], 'profession': 'Инженер'} })[0]
    owner.request('PUT', path, {**body, 'revision': 0}, expected=409)
    # Competing writers cannot overwrite one revision.
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: owner.request('PUT', path, {'data': changed['data'], 'revision': changed['revision']}, expected=[200, 409])[0], range(2)))
    require(sum('error' in r for r in results) == 1, 'Concurrent contact writes did not enforce CAS')
    c = owner.request('GET', path)[0]
    imported = {'first_name': 'PRIVATE_IMPORTED', 'phones': ['+12025550123'], 'source_keys': ['vcard:stable-import-id']}
    summary = owner.request('POST', '/api/contacts/import', {'items': [{'data': imported}, {'data': imported}]})[0]
    require(summary == {'created': 1, 'updated': 0, 'skipped': 1}, 'Import batch duplicate prevention failed')
    require(owner.request('POST', '/api/contacts/import', {'items': [{'data': imported}]})[0]['skipped'] == 1, 'Repeat import created duplicate')
    existing = next(x for x in owner.request('GET', '/api/contacts')[0] if x['id'] != c['id'])
    changed_import = {**existing['data'], 'first_name': 'PRIVATE_IMPORTED_UPDATED', 'phones': ['+12025550124']}
    summary = owner.request('POST', '/api/contacts/import', {'items': [{'id': existing['id'], 'revision': existing['revision'], 'data': changed_import}]})[0]
    require(summary['updated'] == 1 and len(owner.request('GET', '/api/contacts')[0]) == 2, 'Explicit import update failed')
    other.request('POST', '/api/contacts/import', {'items': [{'id': c['id'], 'revision': c['revision'], 'data': body['data']}]}, expected=404)
    owner.request('POST', '/api/contacts/labels', {'kind': 'categories', 'name': 'Родные', 'replacement': 'Семья'}, expected=204)
    owner.request('POST', '/api/contacts/labels', {'kind': 'tags', 'name': 'Важные', 'replacement': None}, expected=204)
    c = owner.request('GET', path)[0]
    require(c['data']['categories'] == ['Семья'] and c['data']['tags'] == [], 'Label management lost or failed to change contacts')
    # Independent permissions cannot opt Contacts into any AI scenario.
    settings = owner.request('GET', '/api/ai/settings')[0]
    settings = owner.request('PUT', '/api/ai/settings', {**{k: settings[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {k: True for k in settings['permissions']}})[0]
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    for scenario in ['assistant', 'greeting']:
        payload = {'revision': settings['revision'], 'from': '2026-01-01', 'to': '2026-12-31', 'message': 'No private contact information', 'scenario': scenario}
        preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", payload)[0]
        encoded = json.dumps(preview)
        require('PRIVATE_CONTACT' not in encoded and 'PRIVATE_IMPORTED' not in encoded and c['id'] not in encoded, 'AI preview leaked contacts')
    owner.request('DELETE', path, {'revision': c['revision'], 'events': 'keep'}, expected=204)
    owner.request('GET', path, expected=404)
    require(len(owner.request('GET', '/api/contacts')[0]) == 1, 'Deleting contact removed another contact')
    print('PASS: Contacts CRUD, full fields, owner/auth/Origin, validation, CAS/concurrent writes, labels, selective import/update/dedup, deletion and AI isolation without inference.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    run(parser.parse_args())
