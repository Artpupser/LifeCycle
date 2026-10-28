import argparse
from datetime import datetime, timezone
import getpass
import json
import os
import sys
import time
from uuid import uuid4

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login


def run(args):
    key = os.environ.get('OPENAI_API_KEY') or getpass.getpass('OpenAI API key (hidden): ')
    require(bool(key), 'An API key is required for a real OpenAI check')
    base = origin_url(args.url)
    client = login(base, base, Client(args.mailpit_url), 30)
    config, _ = client.request('GET', '/api/ai/settings')
    chat = note = None

    def save(**changes):
        nonlocal config
        body = {k: config[k] for k in ['revision', 'model', 'enabled', 'permissions']}
        body.update(changes)
        config, _ = client.request('PUT', '/api/ai/settings', body)

    def preview(question):
        today = str(datetime.now(timezone.utc).date())
        value, _ = client.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': today, 'to': today, 'message': question})
        return value

    def send(p):
        path = f"/api/ai/chats/{chat['id']}/messages"
        request = {'request_id': str(uuid4()), 'preview_id': p['id']}
        turn, _ = client.request('POST', path, request, expected=202)
        deadline = time.monotonic() + 110
        while turn['status'] == 'pending' and time.monotonic() < deadline:
            time.sleep(0.5)
            turn, _ = client.request('GET', path + '/' + request['request_id'])
        require(turn['status'] == 'completed', 'OpenAI request failed: ' + str(turn.get('error_code')))
        require(bool(turn['data']['answer']) and turn['data']['request'] == p['request'], 'Successful response does not match the approved request')
        require(turn['data']['usage']['total_tokens'] > 0, 'Real OpenAI usage is absent')
        again, _ = client.request('POST', path, request)
        require(again['id'] == turn['id'], 'Successful request retry was not idempotent')
        return turn

    try:
        marker = 'LC' + uuid4().hex[:12].upper()
        note, _ = client.request('POST', '/api/notes', {'title': 'Synthetic OpenAI acceptance', 'content': 'Контрольное слово: **' + marker + '**.'}, expected=201)
        save(api_key=key, enabled=True, model=args.model, permissions={**config['permissions'], 'notes': True})
        key = ''
        chat, _ = client.request('POST', '/api/ai/chats', expected=201)
        p = preview('Назови контрольное слово из разрешённой заметки. Ответь только этим словом.')
        require(marker in json.dumps(p) and p['history_turns'] == 0, 'Approved synthetic context is wrong')
        first = send(p)
        require(marker in first['data']['answer'], 'Model did not use the explicitly allowed note')
        print('Real OpenAI response used the approved synthetic note; usage recorded.')
        p = preview('Повтори контрольное слово из своего предыдущего ответа. Ответь только словом.')
        require(p['history_turns'] == 1, 'Successful chat history is absent from the next request')
        second = send(p)
        require(marker in second['data']['answer'], 'Real multi-turn conversation did not preserve the allowed history')
        print('Real multi-turn OpenAI conversation and idempotent retries passed.')
        save(permissions={k: False for k in config['permissions']})
        p = preview('Какие данные LifeCycle тебе переданы? Ответь одним коротким предложением.')
        require(p['history_turns'] == 0 and marker not in json.dumps(p), 'Revoked data or old history entered a new request')
        third = send(p)
        require(marker not in third['data']['answer'], 'Revoked synthetic data appeared in a new answer')
        print('Real OpenAI response after revocation excluded prior context and history.')
        history, _ = client.request('GET', f"/api/ai/chats/{chat['id']}")
        require(len(history['messages']) == 3 and all(t['status'] == 'completed' for t in history['messages']), 'Completed chat did not persist')
        print('Live OpenAI acceptance passed with three real responses; no personal account data was sent.')
    finally:
        if chat:
            client.request('DELETE', f"/api/ai/chats/{chat['id']}", expected=204)
        if note:
            client.request('DELETE', f"/api/notes/{note['id']}", expected=204)
        config, _ = client.request('GET', '/api/ai/settings')
        save(enabled=False, remove_key=True, permissions={k: False for k in config['permissions']})
        require(not config['key_present'], 'Test API key was not removed')
        print('Test connection, encrypted API key, chat and synthetic note removed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    parser.add_argument('--model', default='gpt-4.1-mini')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, ValueError) as error:
        print(f'Live AI smoke failed: {error}', file=sys.stderr)
        sys.exit(1)
