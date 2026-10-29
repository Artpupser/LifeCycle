import argparse
import json
import sys
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, HTTPCookieProcessor, Request, build_opener
from uuid import uuid4
from datetime import datetime, timezone

from auth_smoke import Client, SmokeFailure, origin_url, require
from core_smoke import login


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def raw(client, path, expected):
    opener = build_opener(HTTPCookieProcessor(client.cookies), NoRedirect())
    try:
        response = opener.open(Request(client.base + path), timeout=15)
    except HTTPError as error:
        response = error
    with response:
        require(response.status == expected, 'Unexpected OAuth route status')
        return response.headers


def run(args):
    base = origin_url(args.url)
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    config, _ = owner.request('GET', '/api/ai/settings')
    require(config['provider'] == 'openai' and config['auth_mode'] == 'api_key', 'Migration defaults changed')
    require(config['login_available'], 'Local ChatGPT login is unavailable')
    def save(expected=200, **changes):
        nonlocal config
        body = {k: config[k] for k in ['revision', 'model', 'provider', 'auth_mode', 'enabled', 'permissions']}
        body.update(changes)
        result, _ = owner.request('PUT', '/api/ai/settings', body, expected=expected)
        if expected == 200:
            config = result
        return result
    save(api_key='sk-openai-synthetic-' + uuid4().hex)
    save(provider='openrouter', model='openai/gpt-4.1-mini')
    require(not config['key_present'], 'OpenAI key crossed into OpenRouter')
    save(expected=400, enabled=True)
    save(api_key='sk-or-synthetic-' + uuid4().hex)
    require(config['key_present'], 'OpenRouter key is absent')
    chat, _ = owner.request('POST', '/api/ai/chats', expected=201)
    path = '/api/ai/chats/' + chat['id']
    today = str(datetime.now(timezone.utc).date())
    def preview():
        value, _ = owner.request('POST', path + '/preview', {'revision': config['revision'], 'from': today, 'to': today, 'message': 'Synthetic preview; do not send.'})
        return value
    p = preview()
    require(p['request']['provider'] == {'data_collection': 'deny', 'zdr': True}, 'OpenRouter privacy controls are absent')
    save(provider='openai', model='gpt-4.1-mini')
    require(config['key_present'], 'OpenAI key was lost when switching providers')
    save(enabled=True)
    owner.request('POST', path + '/messages', {'request_id': str(uuid4()), 'preview_id': p['id']}, expected=409)
    save(provider='openrouter', model='openai/gpt-4.1-mini', enabled=False)
    require(config['key_present'], 'OpenRouter key was lost')
    save(remove_key=True)
    require(not config['key_present'], 'OpenRouter key removal failed')
    save(provider='openai', model='gpt-4.1-mini', auth_mode='login')
    save(expected=400, api_key='sk-invalid-' + uuid4().hex)
    save(expected=400, enabled=True)
    p = preview()
    require(p['request']['stream'] is True and 'max_output_tokens' not in p['request'], 'ChatGPT plan request violates the documented contract')
    require(p['request']['store'] is False, 'ChatGPT request can be stored')
    accounts, _ = owner.request('GET', '/api/ai/accounts')
    require(accounts == [], 'A fresh account has another user connection')
    owner.request('GET', '/api/ai/models', expected=409)
    owner.request('POST', '/api/ai/accounts/' + str(uuid4()), {'revision': config['revision']}, expected=404)
    Client(base).request('POST', '/api/ai/login/start', {'revision': 0}, expected=401)
    owner.request('POST', '/api/ai/login/start', {'revision': config['revision']}, origin='https://attacker.example', expected=403)
    owner.request('POST', '/api/ai/login/start', {'revision': config['revision'] - 1}, expected=409)
    owner.request('POST', '/api/ai/login/start', {'revision': config['revision'], 'account_id': str(uuid4())}, expected=404)
    attempt, _ = owner.request('POST', '/api/ai/login/start', {'revision': config['revision']})
    require(set(attempt) == {'url'} and attempt['url'].startswith('/api/ai/login/authorize?id='), 'Credentials entered the browser JSON')
    raw(other, attempt['url'], 409)
    headers = raw(owner, attempt['url'], 303)
    require(headers['Cache-Control'] == 'no-store', 'OAuth redirect can be cached')
    parsed = urlsplit(headers['Location'])
    params = parse_qs(parsed.query)
    require(parsed.scheme == 'https' and parsed.hostname == 'auth.openai.com', 'Wrong OAuth authority')
    require(params['client_id'] == ['dynamic_agent_client'] and params['agent_name_hint'] == ['LifeCycle'], 'Wrong dynamic client registration')
    require(params['code_challenge_method'] == ['S256'] and 'chatgpt.tokens.use.direct' in params['scope'][0], 'PKCE or plan consent is absent')
    callback = urlsplit(params['redirect_uri'][0])
    require(callback.hostname == '127.0.0.1' and callback.path == '/api/ai/login/callback', 'Callback is not the required loopback URI')
    raw(owner, attempt['url'], 409)
    state = params['state'][0]
    raw(owner, '/api/ai/login/callback?state=' + 'x' * 43 + '&error=access_denied', 409)
    headers = raw(owner, '/api/ai/login/callback?state=' + state + '&error=access_denied', 303)
    finish = urlsplit(headers['Location'])
    require(finish.hostname == urlsplit(base).hostname, 'Completion did not return to the original host')
    raw(other, finish.path + '?' + finish.query, 409)
    headers = raw(owner, finish.path + '?' + finish.query, 303)
    require(headers['Location'] == '/ai?login_error=ai_login_denied', 'OAuth denial was not safely displayed')
    raw(owner, finish.path + '?' + finish.query, 409)
    raw(owner, '/api/ai/login/callback?state=' + state + '&error=access_denied', 409)
    require(owner.request('GET', '/api/ai/accounts')[0] == [], 'A denied flow created credentials')
    attempt, _ = owner.request('POST', '/api/ai/login/start', {'revision': config['revision']})
    headers = raw(owner, attempt['url'], 303)
    pending_state = parse_qs(urlsplit(headers['Location']).query)['state'][0]
    save(permissions={**config['permissions'], 'notes': True})
    raw(owner, '/api/ai/login/callback?state=' + pending_state + '&error=access_denied', 409)
    save(auth_mode='api_key', remove_key=True, permissions={k: False for k in config['permissions']})
    owner.request('DELETE', path, expected=204)
    print('AI connections passed: separate encrypted keys, provider revisions, exact privacy/stream contracts, OAuth PKCE/state/one-time attempts, ownership, denial and safe redirects. No inference or successful external sign-in was simulated.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://localhost:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    try:
        run(parser.parse_args())
    except (SmokeFailure, KeyError, ValueError) as error:
        print(f'AI connections smoke failed: {error}', file=sys.stderr)
        sys.exit(1)
