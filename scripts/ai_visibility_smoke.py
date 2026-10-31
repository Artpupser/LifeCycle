"""Individual AI visibility, disclosure paths and revocation against real local services."""
import argparse
import json
from datetime import datetime, timezone
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login
from migrations_smoke import sql
from workouts_smoke import exercise, entry, plan


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    today = str(datetime.now(timezone.utc).date())
    config = owner.request('GET', '/api/ai/settings')[0]
    permissions = {**config['permissions'], 'workouts': True, 'notes': True, 'changes': True, 'analytics': True, 'habits': True}
    config = owner.request('PUT', '/api/ai/settings', {**{k: config[k] for k in ['revision','model','enabled','provider','auth_mode']}, 'permissions': permissions})[0]
    require('workout_editor' not in config['permissions'] and 'personalization' not in config['permissions'], 'Retired switches remain in visible settings')
    owner.request('GET', '/api/ai/preferences', expected=404)
    def create(kind, data):
        return owner.request('POST', '/api/' + kind, data, expected=201)[0]
    private_note = create('notes', {'title': 'PRIVATE_NOTE_' + uuid4().hex, 'content': 'Hidden source text'})
    shared_note = create('notes', {'title': 'SHARED_NOTE_' + uuid4().hex, 'content': '**Allowed Markdown**'})
    private_ex = create('exercises', exercise('PRIVATE_EXERCISE_' + uuid4().hex))
    shared_ex = create('exercises', exercise('SHARED_EXERCISE_' + uuid4().hex))
    standalone = create('exercises', exercise('PRIVATE_STANDALONE_' + uuid4().hex))
    shared_standalone = create('exercises', exercise('SHARED_STANDALONE_' + uuid4().hex))
    private_workout = create('workouts', plan('PRIVATE_WORKOUT_' + uuid4().hex, [entry(private_ex['id'], repetitions=1)]))
    shared_workout = create('workouts', plan('SHARED_WORKOUT_' + uuid4().hex, [entry(shared_ex['id'], repetitions=1)]))
    require(not private_note['ai_shared'] and not shared_workout['ai_shared'] and not shared_ex['ai_shared'] and not shared_standalone['ai_shared'], 'New records are not private by default')
    owner.request('POST', '/api/notes', {'title':'Cannot self-grant', 'ai_shared':True}, expected=400)
    owner.request('POST', '/api/exercises', {**exercise('Cannot self-grant exercise'), 'ai_shared':True}, expected=400)
    for kind, item in [('notes', shared_note), ('workouts', shared_workout), ('exercises', shared_ex), ('exercises', shared_standalone)]:
        path=f"/api/{kind}/{item['id']}/ai-access"
        Client(base).request('PUT', path, {'revision':0,'ai_shared':True}, expected=401)
        other.request('PUT', path, {'revision':0,'ai_shared':True}, expected=404)
        owner.request('PUT', path, {'revision':0,'ai_shared':True}, origin='https://foreign.example', expected=403)
        access=owner.request('PUT', path, {'revision':0,'ai_shared':True})[0]
        require(access['ai_shared'] and access['ai_access_revision']==1, 'Object grant did not persist')
        owner.request('PUT', path, {'revision':0,'ai_shared':False}, expected=409)
        owner.request('PUT', path, {'revision':1,'ai_shared':True})
    preferences_path='/api/workouts/preferences'
    blank={'goals':None,'equipment':None,'restrictions':None}
    require(owner.request('GET',preferences_path)[0]=={'revision':0,'data':blank}, 'Unknown training fields were invented')
    values={'goals':'TRAINING_GOALS_'+uuid4().hex,'equipment':'TRAINING_EQUIPMENT_'+uuid4().hex,'restrictions':'TRAINING_RESTRICTIONS_'+uuid4().hex}
    Client(base).request('GET',preferences_path,expected=401)
    Client(base).request('PUT',preferences_path,{'revision':0,'data':values},expected=401)
    owner.request('PUT',preferences_path,{'revision':0,'data':values},origin='https://foreign.example',expected=403)
    preferences=owner.request('PUT',preferences_path,{'revision':0,'data':values})[0]
    require(preferences=={'revision':1,'data':values}, 'Training conditions did not round-trip')
    require(other.request('GET',preferences_path)[0]['data']==blank,'Training conditions crossed ownership')
    owner.request('PUT',preferences_path,{'revision':0,'data':values},expected=409)
    require(owner.request('PUT',preferences_path,preferences)[0]['revision']==1,'Identical save changed revision')
    owner.request('PUT',preferences_path,{'revision':1,'data':{**values,'equipment':'🙂'*2001}},expected=400)
    owner.request('PUT',preferences_path,{'revision':1,'data':{**values,'ai_shared':True}},expected=400)
    user=owner.request('GET','/api/auth/me')[0]['user']['id']
    encrypted=sql(f"SELECT encode(encrypted_data,'hex') FROM app.workout_preferences WHERE user_id='{user}'").strip()
    require(encrypted and all(v.encode().hex() not in encrypted for v in values.values()),'Training conditions were not encrypted at rest')
    for workout in [private_workout, shared_workout]:
        session=owner.request('POST','/api/workout-sessions',{'workout_id':workout['id']})[0]
        owner.request('POST',f"/api/workout-sessions/{session['id']}/next",{'revision':session['revision'],'actual_repetitions':1})
    habit=create('habits', {'title':'PRIVATE_HABIT_'+uuid4().hex,'schedule':{'start_date':today,'time':None,'timezone':'UTC','duration_minutes':20,'recurrence':'daily'},'habit':{'workout_id':private_workout['id'],'sub_habits':[]}})
    owner.request('POST',f"/api/habits/{habit['id']}/marks/{today}",{'status':'skipped','note':'PRIVATE_HABIT_NOTE'})
    chat=create('ai/chats',None)
    def preview():
        c=owner.request('GET','/api/ai/settings')[0]
        p=owner.request('POST',f"/api/ai/chats/{chat['id']}/preview",{'revision':c['revision'],'from':today,'to':today,'message':'Use only explicitly shared records.'})[0]
        return p,json.loads(p['request']['input'][-2]['content'].split('\n',1)[1])
    p,data=preview()
    encoded=json.dumps(p,ensure_ascii=False)
    require('PRIVATE_' not in encoded, 'Unshared source leaked directly, through exercise/library or linked habit context')
    require(shared_note['title'] in encoded and shared_workout['data']['title'] in encoded and shared_ex['data']['title'] in encoded, 'Selected sources missing')
    require(any(e['id']==shared_standalone['id'] for e in data['workouts']['exercises']),'Independently shared exercise without a workout is missing')
    require(data['workouts']['preferences']['data']==values, 'Saved goals, equipment and restrictions absent from exact preview')
    owner.request('PUT',f"/api/exercises/{shared_ex['id']}/ai-access",{'revision':1,'ai_shared':False})
    _,without_exercise=preview()
    require(shared_ex['id'] not in [e['id'] for e in without_exercise['workouts']['exercises']] and without_exercise['workouts']['plans'],'Shared plan silently overrides an exercise denial')
    c=owner.request('GET','/api/ai/settings')[0]
    owner.request('POST',f"/api/ai/chats/{chat['id']}/preview",{'revision':p['config_revision'],'from':today,'to':today,'message':'Old grant must be stale'},expected=409)
    body={'revision':c['revision'],'summary':'Denied exercise update','actions':[{'entity':'exercise','operation':'update','id':shared_ex['id'],'expected_updated_at':shared_ex['updated_at'],'data':{'description':'Must not write'}}]}
    owner.request('POST','/api/ai/actions',body,expected=403)
    owner.request('PUT',f"/api/exercises/{shared_ex['id']}/ai-access",{'revision':2,'ai_shared':True})
    c=owner.request('GET','/api/ai/settings')[0]
    wid=str(uuid4())
    proposal=owner.request('POST','/api/ai/actions',{'revision':c['revision'],'summary':'Reuse a shared standalone exercise','actions':[{'entity':'workout','operation':'create','id':wid,'expected_updated_at':None,'data':plan('Standalone source plan '+wid,[entry(shared_standalone['id'],repetitions=1)])}]},expected=201)[0]
    owner.request('POST',f"/api/ai/actions/{proposal['id']}/apply",{'confirmed':True})
    saved_plan=owner.request('GET',f'/api/workouts/{wid}')[0]
    require(not saved_plan['ai_shared'] and saved_plan['data']['rounds'][0]['exercises'][0]['exercise_id']==shared_standalone['id'],'Standalone source could not be used in a confirmed AI plan')
    owner.request('POST',f"/api/ai/actions/{proposal['id']}/undo",{'confirmed':True})
    owner.request('GET',f'/api/workouts/{wid}',expected=404)
    require(data['workouts']['completed']==1 and data['analytics']['workouts']['completed']==1, 'AI aggregates include hidden sessions')
    require(set(data['action_protocol']['entities'])=={'exercise','workout','note'}, 'Unified workout grant does not enable proposals')
    actual=owner.request('GET',f'/api/analytics?from={today}&to={today}')[0]
    require(actual['workouts']['completed']==2, 'AI filtering changed ordinary Analytics')
    def prepare_note(item, expected=201):
        c=owner.request('GET','/api/ai/settings')[0]
        body={'revision':c['revision'],'summary':'Reviewed note change','actions':[{'entity':'note','operation':'update','id':item['id'],'expected_updated_at':item['updated_at'],'data':{'title':'Reviewed title'}}]}
        return owner.request('POST','/api/ai/actions',body,expected=expected)[0]
    prepare_note(private_note, expected=403)
    prepared=prepare_note(shared_note)
    owner.request('PUT',f"/api/notes/{shared_note['id']}/ai-access",{'revision':1,'ai_shared':False})
    owner.request('POST',f"/api/ai/actions/{prepared['id']}/apply",{'confirmed':True},expected=409)
    owner.request('PUT',f"/api/notes/{shared_note['id']}/ai-access",{'revision':2,'ai_shared':True})
    prepared=prepare_note(shared_note)
    owner.request('POST',f"/api/ai/actions/{prepared['id']}/apply",{'confirmed':True})
    owner.request('PUT',f"/api/notes/{shared_note['id']}/ai-access",{'revision':3,'ai_shared':False})
    owner.request('POST',f"/api/ai/actions/{prepared['id']}/undo",{'confirmed':True})
    restored=owner.request('GET',f"/api/notes/{shared_note['id']}")[0]
    require(restored['title']==shared_note['title'] and not restored['ai_shared'], 'Local undo changed the access grant or failed after revocation')
    owner.request('PUT',f"/api/workouts/{shared_workout['id']}/ai-access",{'revision':1,'ai_shared':False})
    _,after=preview()
    require(not after['notes']['items'] and not after['workouts']['plans'] and not after['workouts']['sessions'], 'Revoked sources remain visible')
    require(len(after['workouts']['exercises'])==2, 'Revoking a plan hid independently shared exercises')
    for item,revision in [(shared_ex,3),(shared_standalone,1)]:
        owner.request('PUT',f"/api/exercises/{item['id']}/ai-access",{'revision':revision,'ai_shared':False})
    c=owner.request('GET','/api/ai/settings')[0]
    owner.request('PUT',preferences_path,{'revision':1,'data':blank})
    owner.request('POST',f"/api/ai/chats/{chat['id']}/preview",{'revision':c['revision'],'from':today,'to':today,'message':'Old conditions must be stale'},expected=409)
    _,after_clear=preview()
    require(after_clear['workouts']['preferences']['data']==blank and not after_clear['workouts']['exercises'],'Cleared conditions or revoked exercises remain visible')
    owner.request('PUT',preferences_path,{'revision':2,'data':values})
    c=owner.request('GET','/api/ai/settings')[0]
    owner.request('PUT','/api/ai/settings',{**{k:c[k] for k in ['revision','model','enabled','provider','auth_mode']},'permissions':{**c['permissions'],'workouts':False}})
    _,no_training=preview()
    require('workouts' not in no_training and not any(v in json.dumps(no_training) for v in values.values()),'Training conditions bypassed the category permission')
    print('PASS: independent note/workout/exercise grants, standalone library visibility, ownership/CSRF/CAS, encrypted training conditions, exact preview and revocation, AI-only aggregates, proposal guards and undo without restoring grants.')
    for kind,item in [('habits',habit),('notes',private_note),('notes',shared_note),('workouts',private_workout),('workouts',shared_workout),('exercises',private_ex),('exercises',shared_ex),('exercises',standalone),('exercises',shared_standalone)]:
        owner.request('DELETE',f"/api/{kind}/{item['id']}",expected=204)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url',default='http://localhost:8025')
    run(parser.parse_args())
