import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import sys
import time
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login, task_body


def run(args):
    base = origin_url(args.url)
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    marker = 'private-ai-' + uuid4().hex
    config, headers = owner.request('GET', '/api/ai/settings')
    require(headers.get('Cache-Control') == 'no-store', 'AI settings can be cached')
    require(not config['enabled'] and not config['key_present'] and not any(config['permissions'].values()), 'AI is not default-off')
    defaults = dict(config['permissions'])

    def save(**values):
        nonlocal config
        body = {k: config[k] for k in ['model', 'enabled', 'permissions', 'revision']}
        body.update(values)
        config, _ = owner.request('PUT', '/api/ai/settings', body)
        require('api_key' not in config and 'encrypted_key' not in config, 'AI key exposed')
        return body

    chat, _ = owner.request('POST', '/api/ai/chats', expected=201)
    cid = chat['id']
    path = f'/api/ai/chats/{cid}'

    def preview(message='Как улучшить мой план?', expected=200, **extra):
        body = {'revision': config['revision'], 'from': str(yesterday), 'to': str(today), 'message': message, **extra}
        result, _ = owner.request('POST', path + '/preview', body, expected=expected)
        return result

    def context(value):
        return json.loads(value['request']['input'][-2]['content'].split('\n', 1)[1])

    owner.request('PUT', '/api/profile', {'name': marker, 'conditions': [marker], 'height_cm': 180})
    note, _ = owner.request('POST', '/api/notes', {'title': marker, 'content': '**' + marker + '**'}, expected=201)
    rule = {'start_date': str(yesterday), 'time': '12:30', 'timezone': 'UTC', 'duration_minutes': 20, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None}
    task, _ = owner.request('POST', '/api/tasks', task_body(marker, schedule=rule), expected=201)
    owner.request('POST', f"/api/tasks/{task['id']}/occurrences/{yesterday}", {'status': 'completed'})
    habit, _ = owner.request('POST', '/api/habits', {'title': 'habit-' + marker, 'schedule': rule, 'habit': {'icon': '🌱', 'sub_habits': [], 'reminder_enabled': False}}, expected=201)
    owner.request('POST', f"/api/habits/{habit['id']}/marks/{yesterday}", {'status': 'completed'})
    private, _ = owner.request('POST', '/api/sex', {'kind': 'sex', 'local_start': str(yesterday) + 'T12:00:00', 'timezone': 'UTC', 'duration_minutes': 10, 'partner': {'name': marker}, 'note': marker}, expected=201)
    owner.request('PUT', '/api/analytics/privacy', {'include_profile': True, 'include_intimacy': True})
    p = preview()
    require(set(context(p)) == {'from', 'to', 'timezone', 'generated_at'}, 'Local Analytics consent leaked into AI')
    require(marker not in json.dumps(p), 'Default AI context exposed private data')
    owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': p['id']}, expected=409)
    Client(base).request('GET', '/api/ai/settings', expected=401)
    other.request('GET', path, expected=404)
    other.request('DELETE', path, expected=404)
    other.request('POST', path + '/preview', {'revision': 0, 'from': str(today), 'to': str(today), 'message': 'test'}, expected=404)
    owner.request('PUT', '/api/ai/settings', {'revision': config['revision'], 'model': config['model'], 'enabled': False, 'permissions': defaults}, origin='https://untrusted.example', expected=403)
    preview(from_=str(today), expected=400)
    preview(to=str(yesterday - timedelta(days=1)), expected=400)
    preview(to='2026-99-99', expected=400)
    preview(message='', expected=400)

    stale = dict(config)
    for scope in defaults:
        save(permissions={**defaults, scope: True})
        data = context(preview())
        require(set(data) == {'from', 'to', 'timezone', 'generated_at', scope}, f'{scope} grant leaked another category')
        if scope == 'analytics':
            require(data[scope]['tasks']['completed'] == 1 and marker not in json.dumps(data), 'AI aggregate differs from real results or includes text')
        if scope == 'tasks':
            require(data[scope]['total_occurrences'] == 2 and marker in json.dumps(data), 'AI tasks do not use shared occurrences')
        if scope == 'notes':
            require(data[scope]['items'][0]['markdown'] == '**' + marker + '**', 'Markdown note did not enter allowed context')
        if scope == 'profile':
            require(data[scope]['conditions'] == [marker], 'Explicit profile grant does not provide the profile')
        if scope == 'intimacy':
            require(data[scope]['total'] == 1 and marker not in json.dumps(data), 'Intimacy grant exposed private text')
    owner.request('PUT', '/api/ai/settings', {k: stale[k] for k in ['revision', 'model', 'enabled', 'permissions']}, expected=409)
    save(permissions=defaults)
    require(marker not in json.dumps(preview()), 'Revoked data entered a new preview')
    malicious = {k: config[k] for k in ['revision', 'model', 'enabled', 'permissions']}
    malicious['model'] = 'https://attacker.example/model'
    owner.request('PUT', '/api/ai/settings', malicious, expected=400)
    malicious['model'] = config['model']
    malicious['permissions'] = {'everything': True}
    owner.request('PUT', '/api/ai/settings', malicious, expected=400)
    save(api_key='sk-invalid-' + marker)
    require(config['key_present'] and marker not in json.dumps(config), 'Key was not stored privately')
    save(enabled=True)
    stale_preview = preview()
    save(permissions={**defaults, 'notes': True})
    owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': stale_preview['id']}, expected=409)
    save(permissions=defaults)

    if args.check_provider_error:
        p = preview(message='Ответь словом OK.')
        request = {'request_id': str(uuid4()), 'preview_id': p['id']}
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: owner.request('POST', path + '/messages', request, expected={200, 202})[0], range(2)))
        require(results[0]['id'] == results[1]['id'], 'Duplicate send created two turns')
        deadline = time.monotonic() + 100
        turn = results[0]
        while turn['status'] == 'pending' and time.monotonic() < deadline:
            time.sleep(0.5)
            turn, _ = owner.request('GET', path + '/messages/' + request['request_id'])
        require(turn['status'] == 'failed' and turn['error_code'] in {'ai_credentials', 'ai_unavailable', 'ai_timeout'}, 'Invalid key did not produce a safe external error')
        require('sk-invalid-' not in json.dumps(turn), 'Provider failure exposed the key')
        old, _ = owner.request('POST', path + '/messages', request)
        require(old['id'] == turn['id'], 'Retry of failed request dispatched a new request')
        messages, _ = owner.request('GET', path)
        require(len(messages['messages']) == 1, 'Idempotent send duplicated history')
        other.request('GET', path + '/messages/' + request['request_id'], expected=404)
        print('Real HTTPS provider failure and request idempotency passed; this is not a successful OpenAI response.')
        for index in range(4):
            p = preview(message='Synthetic cancellation check.')
            pending, _ = owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': p['id']}, expected=202)
            if index == 0:
                save(permissions={**defaults, 'workouts': True})
                result, _ = owner.request('GET', path + '/messages/' + pending['id'])
                require(result['status'] != 'pending', 'Permission revision did not cancel a queued answer')
                save(permissions=defaults)
            else:
                result, _ = owner.request('DELETE', path + '/messages/' + pending['id'])
                require(result['status'] != 'pending', 'Cancellation did not stop the request')
        p = preview()
        owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': p['id']}, expected=429)
        owner.request('DELETE', path, expected=204)
        chat, _ = owner.request('POST', '/api/ai/chats', expected=201)
        path = f"/api/ai/chats/{chat['id']}"
        p = preview()
        owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': p['id']}, expected=429)
        print('Cancellation, permission changes and rate limits surviving chat deletion passed.')

    save(enabled=False, remove_key=True)
    require(not config['key_present'] and not config['enabled'], 'Key removal failed')
    owner.request('DELETE', path, expected=204)
    owner.request('GET', path, expected=404)
    owner.request('DELETE', f"/api/notes/{note['id']}", expected=204)
    owner.request('DELETE', f"/api/tasks/{task['id']}", expected=204)
    owner.request('DELETE', f"/api/habits/{habit['id']}", expected=204)
    current, _ = owner.request('GET', f"/api/sex/{private['id']}")
    owner.request('DELETE', f"/api/sex/{private['id']}?revision={current['revision']}", expected=204)
    print('AI API smoke passed: independent default-off grants, exact previews, real contexts, revocation, key lifecycle, ownership, Origin and deletion.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    parser.add_argument('--check-provider-error', action='store_true')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, ValueError) as error:
        print(f'AI smoke failed: {error}', file=sys.stderr)
        sys.exit(1)
