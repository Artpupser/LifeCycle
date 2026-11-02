"""Upgrade 1.4: atomic owner-controlled note sharing and filtered AI context."""
import argparse
import json
from datetime import datetime, timezone
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    marker = 'notes14_' + uuid4().hex
    notes = [owner.request('POST', '/api/notes', {'title': marker + str(i), 'content': '**Markdown preserved**'}, expected=201)[0] for i in range(2)]
    foreign = other.request('POST', '/api/notes', {'title': 'foreign'}, expected=201)[0]
    body = {'items': [{'id': n['id'], 'revision': 0} for n in notes], 'ai_shared': True, 'confirmed': True}
    path = '/api/notes/ai-access'
    Client(base).request('PUT', path, body, expected=401)
    owner.request('PUT', path, body, origin='https://foreign.example', expected=403)
    owner.request('PUT', path, {**body, 'confirmed': False}, expected=400)
    owner.request('PUT', path, {**body, 'items': [body['items'][0]] * 2}, expected=400)
    owner.request('PUT', path, {**body, 'items': [body['items'][0], {'id': foreign['id'], 'revision': 0}]}, expected=404)
    require(not owner.request('GET', '/api/notes/' + notes[0]['id'])[0]['ai_shared'], 'Batch partially committed across owners')
    c = owner.request('GET', '/api/ai/settings')[0]
    result = owner.request('PUT', path, body)[0]
    require(all(n['ai_shared'] and n['ai_access_revision'] == 1 for n in result), 'Bulk sharing did not persist')
    require(owner.request('GET', '/api/ai/settings')[0]['revision'] == c['revision'] + 1, 'Batch must invalidate AI once')
    def filtered(access):
        return owner.request('GET', f'/api/notes?q={marker}&ai_access={access}')[0]
    require(len(filtered('ai_shared')) == 2 and not filtered('private'), 'Access filter mismatch')
    owner.request('GET', '/api/notes?ai_access=invalid', expected=400)
    owner.request('PUT', path, {**body, 'ai_shared': False, 'items': [{'id': notes[0]['id'], 'revision': 1}, {'id': notes[1]['id'], 'revision': 0}]}, expected=409)
    require(len(filtered('ai_shared')) == 2, 'Stale batch partially committed')
    c = owner.request('GET', '/api/ai/settings')[0]
    c = owner.request('PUT', '/api/ai/settings', {**{k: c[k] for k in ['revision', 'model', 'enabled', 'provider', 'auth_mode']}, 'permissions': {**c['permissions'], 'notes': True}})[0]
    chat = owner.request('POST', '/api/ai/chats', expected=201)[0]
    today = str(datetime.now(timezone.utc).date())
    def preview(config):
        return owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': config['revision'], 'from': today, 'to': today, 'message': 'Read explicitly shared notes only'})[0]
    require(marker in json.dumps(preview(c)), 'Shared notes missing in exact request')
    revoke = {**body, 'ai_shared': False, 'items': [{'id': n['id'], 'revision': 1} for n in notes]}
    owner.request('PUT', path, revoke)
    owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': c['revision'], 'from': today, 'to': today, 'message': 'stale'}, expected=409)
    c = owner.request('GET', '/api/ai/settings')[0]
    require(marker not in json.dumps(preview(c)), 'Revoked notes leaked to AI')
    require(len(filtered('private')) == 2 and not filtered('ai_shared'), 'Revoked filter mismatch')
    for n in notes:
        saved = owner.request('GET', '/api/notes/' + n['id'])[0]
        require(saved['content'] == n['content'] and saved['updated_at'] == n['updated_at'], 'Sharing changed source content/version')
        owner.request('DELETE', '/api/notes/' + n['id'], expected=204)
    other.request('DELETE', '/api/notes/' + foreign['id'], expected=204)
    print('PASS: note access filters, atomic confirmed bulk grants/revocation, ownership/Origin/CAS, AI invalidation and Markdown preservation.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
