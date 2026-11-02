"""Upgrade 1.7: real short timers, immutable snapshots, concurrency and common history."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import time
from auth_smoke import Client, require
from core_smoke import login
from migrations_smoke import sql


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    data = {'work_seconds': 2, 'chill_seconds': 1, 'more_chill_seconds': 1, 'sequence': ['w', 'c', 'w', 'mc'], 'repeat': False}
    config = owner.request('POST', '/api/pomodoro/configs', {'name': 'One pass', 'data': data}, expected=201)[0]
    path = '/api/pomodoro/configs/' + config['id']
    for invalid in [{**data, 'sequence': []}, {**data, 'sequence': ['c']}, {**data, 'sequence': ['w', 'unknown']}, {**data, 'work_seconds': 0}, {**data, 'sequence': ['w'] * 61}]:
        owner.request('POST', '/api/pomodoro/configs', {'name': 'Invalid', 'data': invalid}, expected=400)
    Client(base).request('GET', '/api/pomodoro/configs', expected=401)
    other.request('PUT', path, {'name': 'Foreign', 'data': data, 'revision': 0}, expected=404)
    other.request('DELETE', path, {'revision': 0}, expected=404)
    owner.request('PUT', path, {'name': 'bad origin', 'data': data, 'revision': 0}, origin='https://foreign.example', expected=403)
    other.request('POST', '/api/pomodoro/program', {'config_id': config['id'], 'revision': 0}, expected=404)
    start = {'config_id': config['id'], 'revision': 0, 'task_id': None}
    timer = owner.request('POST', '/api/pomodoro/program', start, expected=201)[0]
    require(timer['interval_kind'] == 'w' and timer['program']['next_kind'] == 'c', 'First/next interval mismatch')
    owner.request('POST', '/api/pomodoro', {'phase': 'work'}, expected=409)
    owner.request('POST', '/api/pomodoro/program', start, expected=409)
    other.request('POST', f"/api/pomodoro/{timer['id']}/pause", expected=404)
    paused = owner.request('POST', f"/api/pomodoro/{timer['id']}/pause", {'revision': 0})[0]
    time.sleep(1.1)
    restored = owner.request('GET', '/api/pomodoro')[0]
    require(restored['status'] == 'paused' and restored['elapsed_seconds'] == paused['elapsed_seconds'], 'Paused clock drifted')
    owner.request('POST', f"/api/pomodoro/{timer['id']}/resume", {'revision': 0}, expected=409)
    owner.request('POST', f"/api/pomodoro/{timer['id']}/resume", {'revision': paused['program']['revision']})
    changed = owner.request('PUT', path, {'name': 'Edited later', 'data': {**data, 'work_seconds': 60}, 'revision': 0})[0]
    owner.request('PUT', path, {'name': 'Stale', 'data': data, 'revision': 0}, expected=409)
    owner.request('DELETE', path, {'revision': changed['revision']}, expected=204)
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        timer = owner.request('GET', '/api/pomodoro')[0]
        if timer is None: break
        require(timer['program_name'] == 'One pass', 'Edited/deleted config changed run snapshot')
        time.sleep(.3)
    require(timer is None, 'One-shot program did not complete automatically')
    history = owner.request('GET', '/api/pomodoro/history')[0]
    complete = [s for s in history['items'] if s['status'] == 'completed']
    require(len(complete) == 4 and sorted(s['interval_kind'] for s in complete) == ['c', 'mc', 'w', 'w'], 'Completed intervals lost or duplicated')
    today = str(datetime.now(timezone.utc).date())
    report = owner.request('GET', f'/api/analytics?from={today}&to={today}')[0]
    require(report['pomodoro']['completed'] == 2 and report['pomodoro']['seconds'] == 4, 'Common analytics counted rest as work or lost intervals')
    loop = owner.request('POST', '/api/pomodoro/configs', {'name': 'Repeat', 'data': {**data, 'work_seconds': 60, 'repeat': True}}, expected=201)[0]
    payload = {'config_id': loop['id'], 'revision': 0}
    def concurrent_start(_): return owner.request('POST', '/api/pomodoro/program', payload, expected=[201, 409])[0]
    with ThreadPoolExecutor(max_workers=2) as pool: results = list(pool.map(concurrent_start, range(2)))
    require(sum('id' in r for r in results) == 1, 'Concurrent starts created more than one run')
    timer = owner.request('GET', '/api/pomodoro')[0]
    reset = owner.request('POST', f"/api/pomodoro/{timer['id']}/reset", {'revision': timer['program']['revision']})[0]
    require(reset['run_id'] != timer['run_id'] and reset['elapsed_seconds'] == 0, 'Reset did not create a fresh snapshot run')
    owner.request('POST', f"/api/pomodoro/{timer['id']}/reset", {'revision': timer['program']['revision']}, expected=409)
    owner.request('POST', f"/api/pomodoro/{reset['id']}/cancel", {'revision': reset['program']['revision']})
    require(owner.request('GET', '/api/pomodoro')[0] is None, 'Cancelled run remained active')
    # Explicitly synthetic long suspension verifies bounded replay and idempotence without hours of waiting.
    short = owner.request('POST', '/api/pomodoro/configs', {'name': 'Synthetic catch-up', 'data': {**data, 'work_seconds': 1, 'sequence': ['w', 'c'], 'repeat': True}}, expected=201)[0]
    timer = owner.request('POST', '/api/pomodoro/program', {'config_id': short['id'], 'revision': 0}, expected=201)[0]
    user = owner.request('GET', '/api/auth/me')[0]['user']['id']
    run = timer['run_id']
    sql(f"UPDATE app.pomodoro_runs SET started_at=now()-interval '16002 seconds',segment_started_at=now()-interval '16002 seconds',anchors=jsonb_build_array(jsonb_build_object('elapsed',0,'at',now()-interval '16002 seconds')) WHERE user_id='{user}' AND id='{run}'")
    sql(f"UPDATE app.pomodoro_sessions SET started_at=now()-interval '16002 seconds' WHERE user_id='{user}' AND run_id='{run}' AND interval_index=0")
    first = owner.request('GET', '/api/pomodoro')[0]
    require(first['program']['interval_index'] >= 16002 and first['program']['history_pending'] > 0, 'Long clock catch-up was not arithmetic/bounded')
    pending_report = owner.request('GET', f'/api/analytics?from={today}&to={today}', expected=409)[0]
    require(pending_report['error']['code'] == 'pomodoro_history_pending', 'Analytics returned misleading partial timer history')
    second = owner.request('GET', '/api/pomodoro')[0]
    for _ in range(10):
        if second['program']['history_pending'] == 0: break
        second = owner.request('GET', '/api/pomodoro')[0]
    require(second['program']['history_pending'] == 0, 'History replay did not drain')
    count = sql(f"SELECT count(*)=count(DISTINCT interval_index) FROM app.pomodoro_sessions WHERE user_id='{user}' AND run_id='{run}'").strip()
    require(count == 't', 'Replay duplicated interval history')
    owner.request('POST', f"/api/pomodoro/{second['id']}/cancel", {'revision': second['program']['revision']}, expected=[200, 409])
    # Retry only if a one-second fixture advanced between read and cancellation.
    active = owner.request('GET', '/api/pomodoro')[0]
    if active: owner.request('POST', f"/api/pomodoro/{active['id']}/cancel", {'revision': active['program']['revision']})
    require(other.request('GET', '/api/pomodoro/history')[0]['items'] == [], 'History crossed owners')
    owner.request('GET', '/api/pomodoro/history?offset=-1', expected=400)
    print('PASS: 1.7 config validation/CRUD/CAS/owner/Origin, real interval transitions, pause/resume, immutable/delete-safe snapshots, atomic starts/reset/stop, bounded long replay without duplicate history, and work-only analytics.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
