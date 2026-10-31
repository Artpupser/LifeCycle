"""Upgrade 1.1–1.3 acceptance on synthetic users, with optional local DB fixtures.

Uses python3-cryptography only for encrypted synthetic fixtures; never calls inference.
"""
import argparse
import base64
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login
from migrations_smoke import sql


def seal(context, value):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    container = json.loads(subprocess.check_output(['podman', 'inspect', 'lifecycle_backend_1'], text=True))[0]
    env = dict(item.split('=', 1) for item in container['Config']['Env'] if '=' in item)
    nonce = os.urandom(12)
    return (nonce + AESGCM(base64.b64decode(env['DATA_ENCRYPTION_KEY'])).encrypt(nonce, json.dumps(value).encode(), context.encode())).hex()


def run(args):
    base = origin_url(args.url)
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    config, _ = owner.request('GET', '/api/ai/settings')
    def save(**changes):
        nonlocal config
        body = {k: config[k] for k in ['revision', 'model', 'provider', 'auth_mode', 'enabled', 'permissions']}
        body.update(changes)
        config, _ = owner.request('PUT', '/api/ai/settings', body)
    save(api_key='sk-openai-synthetic-' + uuid4().hex)
    save(provider='openrouter', model='openai/gpt-4.1-mini', api_key='sk-or-synthetic-' + uuid4().hex)
    require(config['openai_key_present'] and config['openrouter_key_present'], 'Saved connections are not independently visible')
    owner.request('DELETE', '/api/ai/connections/openai', {'revision': config['revision'] - 1}, expected=409)
    owner.request('DELETE', '/api/ai/connections/openai', {'revision': config['revision']}, expected=204)
    config, _ = owner.request('GET', '/api/ai/settings')
    require(not config['openai_key_present'] and config['openrouter_key_present'], 'Inactive provider key was not deleted independently')
    owner.request('DELETE', '/api/ai/connections/openrouter', {'revision': config['revision']}, expected=204)
    config, _ = owner.request('GET', '/api/ai/settings')
    require(not config['key_present'], 'Selected API key remains')
    # Only insert an explicitly synthetic disconnected account owned by this new test user.
    user = owner.request('GET', '/api/auth/me')[0]['user']['id']
    aid = str(uuid4())
    account = {'client_id': 'synthetic-client', 'subject': 'synthetic-subject', 'email': 'synthetic@example.test', 'credentials': None}
    encrypted = seal(f'ai:account:{user}:{aid}', account)
    sql(f"INSERT INTO app.ai_accounts(id,user_id,encrypted_data) VALUES('{aid}','{user}',decode('{encrypted}','hex')); UPDATE app.ai_settings SET active_account_id='{aid}',auth_mode='login',provider='openai',model='gpt-4.1-mini',revision=revision+1 WHERE user_id='{user}'")
    config, _ = owner.request('GET', '/api/ai/settings')
    preserved = owner.request('POST', '/api/notes', {'title': 'Preserve through AI unlink', 'content': '**User data**'}, expected=201)[0]
    accounts = owner.request('GET', '/api/ai/accounts')[0]
    require(len(accounts) == 1 and not accounts[0]['connected'], 'Synthetic disconnected binding unavailable')
    other.request('DELETE', '/api/ai/accounts/' + aid, {'revision': 0, 'forget': True}, expected=404)
    owner.request('DELETE', '/api/ai/accounts/' + aid, {'revision': config['revision'], 'forget': True})
    config, _ = owner.request('GET', '/api/ai/settings')
    require(owner.request('GET', '/api/ai/accounts')[0] == [], 'Disconnected binding survived deletion')
    require(config['active_account_id'] is None and not config['enabled'], 'Active reference survived full unlink')
    require(owner.request('GET', '/api/notes/' + preserved['id'])[0]['content'] == '**User data**', 'Unlink removed LifeCycle data')
    owner.request('DELETE', '/api/notes/' + preserved['id'], expected=204)
    owner.request('POST', '/api/ai/login/start', {'revision': config['revision']})
    require(sql(f"SELECT count(*) FROM app.ai_accounts WHERE id='{aid}'").strip() == '0', 'Encrypted connection data remains in database')
    owner.request('POST', '/api/ai/accounts/' + aid, {'revision': config['revision']}, expected=404)
    owner.request('GET', '/api/auth/me')
    print('PASS 1.1: independent connection status/key deletion, stale revision, full deletion of disconnected ChatGPT binding, ownership and preserved LifeCycle session.')
    if not args.connections_only:
        training(owner, other)
        assistant(owner, other)


def training(owner, other):
    from copy import deepcopy
    from workouts_smoke import exercise, entry, plan
    config = owner.request('GET', '/api/ai/settings')[0]
    def save(**changes):
        nonlocal config
        config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision', 'model', 'provider', 'auth_mode', 'enabled', 'permissions']}, **changes})[0]
    def prepare(actions, expected=201):
        return owner.request('POST', '/api/ai/actions', {'revision': config['revision'], 'summary': 'Synthetic reviewed training proposal', 'actions': actions}, expected=expected)[0]
    def action(kind, identifier, data, version=None):
        return {'entity': kind, 'operation': 'update' if version else 'create', 'id': identifier, 'expected_updated_at': version, 'data': data}
    def cmd(item, name, expected=200, confirmed=True):
        return owner.request('POST', f"/api/ai/actions/{item['id']}/{name}", {'confirmed': confirmed}, expected=expected)[0]
    eid, wid = str(uuid4()), str(uuid4())
    ex = exercise('AI synthetic exercise ' + eid)
    w = plan('AI synthetic plan ' + wid, [entry(eid)])
    w['rounds'][0]['exercises'][0]['intensity'] = 'Лёгкая, RPE 3/10'
    actions = [action('exercise', eid, ex), action('workout', wid, w)]
    prepare(actions, expected=403)
    save(permissions={**config['permissions'], 'workouts': True, 'changes': True})
    owner.request('GET', '/api/ai/preferences', expected=404)
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    today = str(datetime.now(timezone.utc).date())
    preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': today, 'to': today, 'message': 'Synthetic plan; preview only.'})[0]
    data = json.loads(preview['request']['input'][-2]['content'].split('\n', 1)[1])
    require('personalization' not in data and data['action_protocol']['confirmation_required'], 'Retired form leaked or unified training tools missing')
    proposal = prepare(actions)
    owner.request('GET', '/api/exercises/' + eid, expected=404)
    owner.request('GET', '/api/workouts/' + wid, expected=404)
    other.request('POST', f"/api/ai/actions/{proposal['id']}/apply", {'confirmed': True}, expected=404)
    cmd(proposal, 'apply', expected=400, confirmed=False)
    cmd(proposal, 'apply')
    cmd(proposal, 'apply')  # idempotent
    saved = owner.request('GET', '/api/workouts/' + wid)[0]
    require(not saved['ai_shared'], 'New workout is not private by default')
    owner.request('PUT', '/api/workouts/' + wid + '/ai-access', {'revision': 0, 'ai_shared': True})
    owner.request('PUT', '/api/exercises/' + eid + '/ai-access', {'revision': 0, 'ai_shared': True})
    config = owner.request('GET', '/api/ai/settings')[0]
    require(saved['data']['rounds'][0]['exercises'][0]['intensity'] == 'Лёгкая, RPE 3/10', 'Editor and AI use different models')
    require(len(owner.request('GET', '/api/exercises')[0]) == 1, 'Duplicate application created a copy')
    searched = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': today, 'to': today, 'message': 'Search preview only.', 'search': ex['title']})[0]
    searched_context = json.loads(searched['request']['input'][-2]['content'].split('\n', 1)[1])
    require(len(searched_context['workouts']['exercises']) == 1 and not searched_context['workouts']['plans'], 'Library search returned unrelated records')

    save(permissions={**config['permissions'], 'habits': True})
    planned_habit = owner.request('POST', '/api/habits', {'title': 'Linked planned workout ' + str(uuid4()), 'schedule': {'start_date': today, 'time': None, 'timezone': 'UTC', 'duration_minutes': 20, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None}, 'habit': {'workout_id': wid, 'sub_habits': []}}, expected=201)[0]
    owner.request('POST', f"/api/habits/{planned_habit['id']}/marks/{today}", {'status': 'skipped', 'note': 'PRIVATE_HABIT_NOTE'})
    linked_preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': today, 'to': today, 'message': 'Explain explicit skipped training only.'})[0]
    linked_context = json.loads(linked_preview['request']['input'][-2]['content'].split('\n', 1)[1])
    require(linked_context['workouts']['planned_occurrences'][0]['mark_status'] == 'skipped', 'Explicit skipped workout mark missing from AI planning context')
    require('PRIVATE_HABIT_NOTE' not in json.dumps(linked_context), 'Training planning context exposed a private habit note')
    owner.request('DELETE', '/api/habits/' + planned_habit['id'], expected=204)
    save(permissions={**config['permissions'], 'habits': False})
    duplicate = action('exercise', str(uuid4()), ex)
    prepare([duplicate], expected=409)
    expires = prepare([action('exercise', str(uuid4()), exercise('Expired proposal ' + str(uuid4())))])
    sql(f"UPDATE app.ai_actions SET created_at=now()-interval '16 minutes' WHERE id='{expires['id']}'")
    cmd(expires, 'apply', expected=409)
    temporary_id = str(uuid4())
    dependency = owner.request('POST', '/api/exercises', exercise('Removed dependency ' + temporary_id), expected=201)[0]
    owner.request('PUT', '/api/exercises/' + dependency['id'] + '/ai-access', {'revision': 0, 'ai_shared': True})
    config = owner.request('GET', '/api/ai/settings')[0]
    staged_id = str(uuid4())
    atomic = prepare([action('exercise', staged_id, exercise('Atomic apply rollback ' + staged_id)), action('workout', str(uuid4()), plan('Atomic rollback plan ' + str(uuid4()), [entry(dependency['id'])]))])
    owner.request('DELETE', '/api/exercises/' + dependency['id'], expected=204)
    cmd(atomic, 'apply', expected=403)
    owner.request('GET', '/api/exercises/' + staged_id, expected=404)
    failed_id = str(uuid4())
    invalid = deepcopy(w)
    invalid['title'] = 'Invalid plan ' + str(uuid4())
    invalid['rounds'][0]['exercises'][0]['exercise_id'] = str(uuid4())
    prepare([action('exercise', failed_id, exercise('Rollback ' + failed_id)), action('workout', str(uuid4()), invalid)], expected=400)
    owner.request('GET', '/api/exercises/' + failed_id, expected=404)
    too_much = deepcopy(w)
    too_much['rounds'][0]['exercises'][0]['repetitions'] = 10001
    prepare([action('workout', wid, too_much, saved['updated_at'])], expected=400)
    pending = prepare([action('workout', wid, {'title': 'AI changed title'}, saved['updated_at'])])
    manual = deepcopy(saved['data']); manual['title'] = 'Manual edit wins'
    owner.request('PUT', '/api/workouts/' + wid, manual)
    cmd(pending, 'apply', expected=409)
    require(owner.request('GET', '/api/workouts/' + wid)[0]['data']['title'] == 'Manual edit wins', 'AI overwrote concurrent manual edit')
    current = owner.request('GET', '/api/workouts/' + wid)[0]
    update = prepare([action('workout', wid, {'description': '**Reviewed Markdown**'}, current['updated_at'])])
    cmd(update, 'apply')
    cmd(update, 'undo')
    require(owner.request('GET', '/api/workouts/' + wid)[0]['data'] == current['data'], 'Undo did not restore old plan')
    # Original create can no longer be undone after subsequent edits, even when content matches.
    cmd(proposal, 'undo', expected=409)
    owner.request('PUT', '/api/profile', {'conditions': ['Synthetic restriction requiring manual review']})
    current = owner.request('GET', '/api/workouts/' + wid)[0]
    prepare([action('workout', wid, {'title': 'Unsafe automatic change'}, current['updated_at'])], expected=409)
    owner.request('PUT', '/api/profile', {'conditions': []})
    fresh_id = str(uuid4())
    fresh = prepare([action('exercise', fresh_id, exercise('Undo after revoke ' + fresh_id))])
    cmd(fresh, 'apply')
    stale = prepare([action('exercise', str(uuid4()), exercise('Permission stale ' + str(uuid4())))])
    save(permissions={k: False for k in config['permissions']})
    cmd(stale, 'apply', expected=409)
    cmd(fresh, 'undo')
    cmd(fresh, 'undo')
    owner.request('GET', '/api/exercises/' + fresh_id, expected=404)
    owner.request('DELETE', '/api/workouts/' + wid, expected=204)
    owner.request('DELETE', '/api/exercises/' + eid, expected=204)
    print('PASS 1.2: real editor validation, atomic proposals, confirmation, duplicate/foreign-ID guards, load limits, medical restriction gate, revision conflicts, patch preservation, undo, idempotency and revocation.')


def assistant(owner, other):
    from copy import deepcopy
    from concurrent.futures import ThreadPoolExecutor
    from datetime import timedelta
    from core_smoke import task_body
    config = owner.request('GET', '/api/ai/settings')[0]
    def save(**changes):
        nonlocal config
        config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision', 'model', 'provider', 'auth_mode', 'enabled', 'permissions']}, **changes})[0]
    def action(entity, identifier, data, version=None):
        return {'entity': entity, 'operation': 'update' if version else 'create', 'id': identifier, 'expected_updated_at': version, 'data': data}
    def prepare(actions, expected=201):
        return owner.request('POST', '/api/ai/actions', {'revision': config['revision'], 'summary': 'Synthetic personal day plan grounded in supplied facts', 'actions': actions}, expected=expected)[0]
    def command(item, cmd, expected=200):
        return owner.request('POST', f"/api/ai/actions/{item['id']}/{cmd}", {'confirmed': True}, expected=expected)[0]
    save(permissions={**config['permissions'], 'tasks': True, 'notes': True, 'changes': True})
    today = datetime.now(timezone.utc).date()
    previous = today - timedelta(days=1)
    nid, tid = str(uuid4()), str(uuid4())
    marker = 'synthetic-grounded-' + uuid4().hex
    note = {'title': 'AI day plan ' + nid, 'content': '# План\n\n**' + marker + '**\n<script>throw new Error("unsafe")</script>', 'tags': ['ai-plan'], 'color': '#226677', 'folder_id': None}
    schedule = {'start_date': str(today), 'time': '00:30', 'timezone': 'Asia/Tokyo', 'duration_minutes': 20, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None}
    task = task_body('AI daily task ' + tid, schedule=schedule)
    proposal = prepare([action('note', nid, note), action('task', tid, task)])
    owner.request('GET', '/api/notes/' + nid, expected=404)
    with ThreadPoolExecutor(max_workers=2) as pool:
        values = list(pool.map(lambda _: command(proposal, 'apply'), range(2)))
    require(values[0]['id'] == values[1]['id'] and values[0]['status'] == 'applied', 'Concurrent application duplicated a personal plan')
    future = owner.request('POST', '/api/tasks', task_body('Future task outside selected AI range', schedule={**schedule, 'start_date': str(today + timedelta(days=730)), 'recurrence': 'once'}), expected=201)[0]
    calendar = owner.request('GET', f'/api/calendar?from={previous}&to={today}')[0]
    occurrence = next(o for o in calendar['occurrences'] if o['task']['id'] == tid)
    require(occurrence['date'] == str(today) and occurrence['starts_at'].startswith(str(previous) + 'T15:30'), 'AI schedule differs from the existing timezone contract')
    day = owner.request('GET', '/api/today?date=' + str(previous))[0]
    require(any(o['task']['id'] == tid for o in day['tasks']), 'AI-created task absent from Today')
    require(owner.request('GET', '/api/notes/' + nid)[0]['content'] == note['content'], 'Markdown note changed during AI action')
    current = owner.request('GET', '/api/tasks/' + tid)[0]
    changed_schedule = deepcopy(schedule); changed_schedule['time'] = '01:30'
    update = prepare([action('task', tid, {'schedule': changed_schedule}, current['updated_at'])])
    command(update, 'apply')
    command(update, 'undo')
    require(owner.request('GET', '/api/tasks/' + tid)[0]['schedule'] == schedule, 'Task undo did not restore its shared schedule')
    owner.request('PUT', '/api/notes/' + nid + '/ai-access', {'revision': 0, 'ai_shared': True})
    config = owner.request('GET', '/api/ai/settings')[0]
    current_note = owner.request('GET', '/api/notes/' + nid)[0]
    note_update = prepare([action('note', nid, {'title': 'Reviewed note title'}, current_note['updated_at'])])
    command(note_update, 'apply')
    require(owner.request('GET', '/api/notes/' + nid)[0]['content'] == note['content'], 'Patch erased existing Markdown')
    command(note_update, 'undo')
    # Unknown operations/fields cannot change settings or per-note grants.
    prepare([action('permissions', str(uuid4()), {'notes': True})], expected=400)
    prepare([action('note', str(uuid4()), {**note, 'title': 'Bad grant ' + str(uuid4()), 'ai_access': 'ai_shared'})], expected=400)
    foreign_note = other.request('POST', '/api/notes', {'title': 'Other private owner', 'content': 'NEVER_SHARE_' + marker}, expected=201)[0]
    prepare([action('note', foreign_note['id'], {'title': 'Foreign edit'}, foreign_note['updated_at'])], expected=403)
    bad_id = str(uuid4())
    bad_schedule = deepcopy(schedule); bad_schedule['duration_minutes'] = 0
    prepare([action('note', bad_id, {**note, 'title': 'Rollback note ' + bad_id}), action('task', str(uuid4()), task_body('Bad schedule ' + str(uuid4()), schedule=bad_schedule))], expected=400)
    owner.request('GET', '/api/notes/' + bad_id, expected=404)
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': str(previous), 'to': str(today), 'message': 'Ground recommendations in IDs, dates and shared preferences.'})[0]
    context = json.loads(preview['request']['input'][-2]['content'].split('\n', 1)[1])
    require(set(context['action_protocol']['entities']) == {'task', 'note'}, 'Action catalog exceeds granted modules')
    require('personalization' not in context and 'NEVER_SHARE_' not in json.dumps(context), 'Unshared preferences or another owner entered context')
    require(any(t['id'] == tid and 'updated_at' in t for t in context['tasks']['templates']), 'Task source versions missing')
    require(any(n['id'] == nid and 'updated_at' in n for n in context['notes']['items']), 'Note source versions missing')
    require(future['id'] not in json.dumps(context['tasks']), 'Task templates expanded the permitted date range')
    searched = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': str(previous), 'to': str(today), 'message': 'Search only shared note.', 'search': marker})[0]
    searched_context = json.loads(searched['request']['input'][-2]['content'].split('\n', 1)[1])
    require(len(searched_context['notes']['items']) == 1 and not searched_context['tasks']['templates'], 'Search did not filter the permitted data')

    stale = prepare([action('note', str(uuid4()), {**note, 'title': 'Stale grant ' + str(uuid4())})])
    save(permissions={k: False for k in config['permissions']})
    command(stale, 'apply', expected=409)
    after = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': str(today), 'to': str(today), 'message': 'After revocation.'})[0]
    require(marker not in json.dumps(after), 'Revoked facts entered a new preview')
    # An independent new pair can be undone atomically even after revoking all AI grants.
    save(permissions={**config['permissions'], 'notes': True, 'tasks': True, 'changes': True})
    undo_nid, undo_tid = str(uuid4()), str(uuid4())
    undo_item = prepare([action('note', undo_nid, {**note, 'title': 'Undo note ' + undo_nid}), action('task', undo_tid, task_body('Undo task ' + undo_tid, schedule=schedule))])
    command(undo_item, 'apply')
    save(permissions={k: False for k in config['permissions']})
    command(undo_item, 'undo')
    owner.request('GET', '/api/notes/' + undo_nid, expected=404)
    owner.request('GET', '/api/tasks/' + undo_tid, expected=404)
    owner.request('DELETE', '/api/tasks/' + future['id'], expected=204)
    owner.request('DELETE', '/api/tasks/' + tid, expected=204)
    owner.request('DELETE', '/api/notes/' + nid, expected=204)
    other.request('DELETE', '/api/notes/' + foreign_note['id'], expected=204)
    print('PASS 1.3: grounded source versions, explicit task/note tools, shared timezone schedules in Today/calendar, Markdown preservation, atomic mixed plans, concurrency, undo, owner isolation and permission revocation.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--connections-only', action='store_true')
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    try:
        run(parser.parse_args())
    except (SmokeFailure, RuntimeError, ValueError, KeyError) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
