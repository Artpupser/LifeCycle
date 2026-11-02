"""Upgrade 1.8: encrypted optional life history, legacy preservation and CAS."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import json
from auth_smoke import Client, require
from core_smoke import login
from migrations_smoke import sql


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    initial = owner.request('GET', '/api/profile')[0]
    require(initial['revision'] == 0 and initial['harmful_habits'] == [] and initial['origin']['maternal_birth_order'] is None and initial['firsts']['school_entry_year'] is None, 'Default profile invented historical values')
    Client(base).request('GET', '/api/profile', expected=401)
    Client(base).request('PUT', '/api/profile', {'name': 'x'}, expected=401)
    habit = {'id': str(uuid4()), 'name': 'Курение', 'current': True, 'ever': True, 'periods': [{'id': str(uuid4()), 'start_date': '2010-01-01', 'end_date': '2015-02-01', 'note': 'PRIVATE_PAST_PERIOD'}, {'id': str(uuid4()), 'start_date': '2020-02-01', 'end_date': None, 'note': 'PRIVATE_CURRENT_PERIOD'}]}
    body = {'revision': 0, 'name': 'Current name', 'birth_date': '1990-02-28', 'birth_country': 'Birth country', 'origin': {'region': 'Birth region', 'given_name': 'PRIVATE_BIRTH_NAME', 'surname': 'PRIVATE_BIRTH_SURNAME', 'sex': 'female', 'childhood_languages': ['Русский', 'Татарский'], 'maternal_birth_order': 2, 'multiple_birth_count': 2}, 'firsts': {'school_entry_year': 1997, 'school_graduation_year': 2007, 'education': 'First education', 'profession': 'First profession', 'job': 'PRIVATE_FIRST_JOB', 'residence_country': 'First country', 'foreign_language': 'First language', 'achievement': 'PRIVATE_FIRST_ACHIEVEMENT', 'completed_project': 'First project'}, 'harmful_habits': [habit]}
    owner.request('PUT', '/api/profile', body, origin='https://foreign.example', expected=403)
    saved = owner.request('PUT', '/api/profile', body)[0]
    require(saved['revision'] == 1 and saved['harmful_habits'] == [habit] and saved['origin']['childhood_languages'] == body['origin']['childhood_languages'], 'Historical profile failed round trip')
    owner.request('PUT', '/api/profile', body, expected=409)
    # A legacy partial PUT updates current data, without wiping historical categories or siblings.
    changed = owner.request('PUT', '/api/profile', {'name': 'New current name', 'gender': 'male', 'residence_country': 'New current country', 'origin': {'region': 'Corrected region'}})[0]
    require(changed['origin']['given_name'] == 'PRIVATE_BIRTH_NAME' and changed['origin']['surname'] == 'PRIVATE_BIRTH_SURNAME' and changed['origin']['sex'] == 'female' and changed['firsts'] == saved['firsts'] and changed['harmful_habits'] == [habit], 'Current/partial update erased historical facts')
    tomorrow = str(datetime.now(timezone.utc).date() + timedelta(days=2))
    for invalid in [{'origin': {'maternal_birth_order': 0}}, {'origin': {'multiple_birth_count': 0}}, {'origin': {'sex': 'invalid'}}, {'origin': {'childhood_languages': [''] * 21}}, {'firsts': {'school_graduation_year': 1996}}, {'firsts': {'school_entry_year': 1880}}, {'harmful_habits': [{**habit, 'ever': False}]}, {'harmful_habits': [habit, habit]}, {'harmful_habits': [{**habit, 'periods': [{**habit['periods'][0], 'end_date': '2009-01-01'}]}]}, {'harmful_habits': [{**habit, 'periods': [{**habit['periods'][0], 'end_date': tomorrow}]}]}, {'owner_id': str(uuid4())}, {'origin': {'unknown': 'field'}}]:
        owner.request('PUT', '/api/profile', invalid, expected=400)
    require(owner.request('GET', '/api/profile')[0] == changed, 'Rejected profile mutation changed state/revision')
    def update(value): return owner.request('PUT', '/api/profile', {'revision': changed['revision'], 'nickname': value}, expected=[200, 409])[0]
    with ThreadPoolExecutor(max_workers=2) as pool: replies = list(pool.map(update, ['Tab A', 'Tab B']))
    require(sum('revision' in r for r in replies) == 1, 'CAS allowed two edits of one revision')
    habit = {**habit, 'current': False}
    current = owner.request('PUT', '/api/profile', {'harmful_habits': [habit]})[0]
    require(current['harmful_habits'][0]['periods'] == saved['harmful_habits'][0]['periods'], 'Current status overwrote past periods')
    require(other.request('GET', '/api/profile')[0]['origin']['given_name'] == '', 'Profile crossed owners')
    user = owner.request('GET', '/api/auth/me')[0]['user']['id']
    encrypted = sql(f"SELECT encode(encrypted_data,'hex') FROM app.profiles WHERE user_id='{user}'").strip()
    require(encrypted and 'PRIVATE_BIRTH_NAME'.encode().hex() not in encrypted and 'PRIVATE_PAST_PERIOD'.encode().hex() not in encrypted, 'Profile history not encrypted at rest')
    config = owner.request('GET', '/api/ai/settings')[0]
    def allow(value):
        nonlocal config
        config = owner.request('GET', '/api/ai/settings')[0]
        config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {**config['permissions'], 'profile': value}})[0]
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    today = str(datetime.now(timezone.utc).date())
    def preview(revision=None, expected=200):
        return owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'] if revision is None else revision, 'from': today, 'to': today, 'message': 'Use only permitted profile data'}, expected=expected)[0]
    require('PRIVATE_' not in json.dumps(preview()), 'New profile data leaked without profile permission')
    allow(True)
    consented = preview()
    require('PRIVATE_BIRTH_NAME' in json.dumps(consented) and 'PRIVATE_FIRST_JOB' in json.dumps(consented), 'Explicit full-profile preview omitted historical data')
    old_revision = config['revision']
    cleared = owner.request('PUT', '/api/profile', {'revision': current['revision'], 'origin': {'given_name': ''}, 'firsts': {'job': ''}, 'harmful_habits': [], 'birth_date': None})[0]
    require(cleared['origin']['given_name'] == '' and cleared['firsts']['job'] == '' and cleared['firsts']['achievement'] == current['firsts']['achievement'] and cleared['birth_date'] is None and not cleared['harmful_habits'], 'Explicit clearing erased unrelated history or failed')
    require(sql(f"SELECT count(*) FROM app.ai_previews WHERE user_id='{user}' AND id='{consented['id']}'").strip() == '0', 'Cleared profile remained in a sendable cached preview')
    preview(old_revision, expected=409)
    config = owner.request('GET', '/api/ai/settings')[0]
    require('PRIVATE_FIRST_JOB' not in json.dumps(preview()) and 'PRIVATE_BIRTH_NAME' not in json.dumps(preview()), 'Cleared values remained in new AI context')
    allow(False)
    require('PRIVATE_' not in json.dumps(preview()), 'Revoked profile permission leaked history')
    print('PASS: 1.8 optional origins/firsts/habit periods, legacy nested preservation, validation/owner/Origin/concurrent CAS, explicit clearing, encryption at rest, AI opt-in/revocation and stale-preview invalidation (no inference).')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
