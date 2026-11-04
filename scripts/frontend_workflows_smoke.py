"""Synthetic API acceptance for the November frontend workflow changes."""
import argparse
from datetime import datetime, timezone
from uuid import uuid4
from auth_smoke import Client, origin_url, require
from core_smoke import login


def run(args):
    origin = origin_url(args.origin)
    mail = Client(args.mailpit_url, origin)
    owner = login(args.url, origin, mail, 30)
    other = login(args.url, origin, mail, 30)
    today = datetime.now(timezone.utc).date().isoformat()
    rule = {'start_date': today, 'time': None, 'timezone': 'UTC', 'duration_minutes': 1, 'recurrence': 'daily', 'interval_days': 1, 'weekdays': [], 'end_date': None}
    body = {'title': 'Habit QA', 'description': '', 'tags': [], 'color': '#123456', 'schedule': rule, 'habit': {'icon': 'tabler:glass-full'}}
    habit = owner.request('POST', '/api/habits', body, expected=201)[0]
    for patch in [{'time': '09:00'}, {'recurrence': 'once'}]:
        owner.request('POST', '/api/habits', {**body, 'schedule': {**rule, **patch}}, expected=400)
    for field in ['sub_habits', 'reminder_enabled']:
        owner.request('POST', '/api/habits', {**body, 'habit': {**body['habit'], field: [] if field == 'sub_habits' else True}}, expected=400)
    marked = owner.request('POST', f"/api/habits/{habit['id']}/marks/{today}", {'status': 'completed', 'note': 'Saved'})[0]
    require(marked['status'] == 'completed' and 'completed_sub_habits' not in marked['habit_mark'], 'Habit checkbox contract is not simplified')
    settings = owner.request('GET', '/api/settings')[0]
    require('reminders_enabled' not in settings, 'Habit reminders remain in preferences')
    label = owner.request('POST', '/api/labels', {'name': 'QA toy ' + str(uuid4())[:8], 'kind': 'toy'}, expected=201)[0]
    event = {'kind': 'masturbation', 'local_start': today + 'T00:00:00', 'timezone': 'UTC', 'duration_minutes': None, 'toys': [label['name']], 'lubricant_used': None, 'setting': 'Дома', 'was_clothed': None, 'emotions': ['Спокойствие'], 'repeat_desired': None, 'note': '', 'partner': None, 'solo': {'porn_sources': [], 'feelings_after': ''}}
    entry = owner.request('POST', '/api/sex', event, expected=201)[0]
    require('ejaculation_count' not in entry['data'], 'Per-entry count field still returned')
    journal = owner.request('GET', f'/api/sex?from={today}&to={today}&offset=0')[0]
    require(journal['statistics']['ejaculations'] == 1, 'One entry must count as one ejaculation')
    owner.request('PUT', '/api/labels/' + label['id'], {'name': 'Renamed toy', 'color': label['color'], 'revision': label['revision']})
    updated = owner.request('GET', '/api/sex/' + entry['id'])[0]
    require(updated['data']['toys'] == ['Renamed toy'] and updated['revision'] > entry['revision'], 'Shared collection rename did not reach encrypted entries')
    config = owner.request('GET', '/api/ai/settings')[0]
    local = {k: config[k] for k in ['revision', 'model', 'enabled', 'permissions']}
    local.update(provider='ollama', auth_mode='api_key', ollama_url=args.ollama_url, model='qa-model:latest', enabled=True)
    saved = owner.request('PUT', '/api/ai/settings', local)[0]
    require(saved['provider'] == 'ollama' and saved['enabled'] and not saved['key_present'], 'Local provider incorrectly requires a remote key')
    owner.request('PUT', '/api/ai/settings', {**local, 'revision': saved['revision'], 'ollama_url': 'http://169.254.169.254'}, expected=400)
    if args.check_ollama:
        models = owner.request('GET', '/api/ai/ollama/models')[0]
        require('qa-model:latest' in models['models'], 'Local model list failed')
        chat = owner.request('POST', '/api/ai/chats', {}, expected=201)[0]
        preview = owner.request('POST', f"/api/ai/chats/{chat['id']}/preview", {'revision': saved['revision'], 'message': 'QA question', 'from': today, 'to': today})[0]
        require('messages' in preview['request'] and 'input' not in preview['request'], 'Preview is not the actual native Ollama request')
        request_id = str(uuid4())
        owner.request('POST', f"/api/ai/chats/{chat['id']}/messages", {'request_id': request_id, 'preview_id': preview['id']}, expected=202)
        import time
        for _ in range(30):
            turn = owner.request('GET', f"/api/ai/chats/{chat['id']}/messages/{request_id}")[0]
            if turn['status'] != 'pending':
                break
            time.sleep(.2)
        require(turn['status'] == 'completed' and 'QA answer' in turn['data']['answer'], 'Local chat did not complete')
    feed = owner.request('GET', f'/api/history?from={today}&to={today}')[0]
    require(any(item['section'] == 'habits' for item in feed['items']) and any(item['section'] == 'sex' for item in feed['items']), 'Global action history misses mutations')
    item = feed['items'][0]
    other.request('DELETE', '/api/history/activity/' + item['id'], expected=404)
    owner.request('DELETE', '/api/history/activity/' + item['id'], expected=204)
    feed2 = owner.request('GET', f'/api/history?from={today}&to={today}')[0]
    require(not any(row['id'] == item['id'] for row in feed2['items']), 'Removed action remains in global history')
    require(owner.request('GET', f'/api/sex?from={today}&to={today}')[0]['statistics']['total'] == 1, 'History removal destroyed results')
    print('PASS: simplified habits, validation, collections and encrypted rename, per-entry statistics, Ollama configuration, action history and ownership.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8080')
    parser.add_argument('--origin', default='http://127.0.0.1:5173')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    parser.add_argument('--ollama-url', default='http://ollama:11434')
    parser.add_argument('--check-ollama', action='store_true')
    run(parser.parse_args())
