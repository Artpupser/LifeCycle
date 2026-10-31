"""Seed a labeled synthetic completed turn for browser UI tests (no inference).

Requires local Podman. Accepts only test-owned users and never prints secrets.
"""
import json
import sys
from uuid import UUID, uuid4

from ai_upgrade_smoke import seal
from migrations_smoke import sql


def main():
    data = json.load(sys.stdin)
    user, chat, turn = (str(UUID(data[key])) for key in ['user', 'chat', 'turn'])
    expected = sql(f"SELECT count(*) FROM app.users u JOIN app.ai_chats c ON c.user_id=u.id WHERE u.id='{user}' AND c.id='{chat}' AND u.email LIKE 'ai-upgrade-%@example.test'").strip()
    if expected != '1':
        raise RuntimeError('Synthetic browser fixture user/chat required')
    if data.get('account'):
        aid = str(UUID(data['account']))
        value = {'client_id': 'synthetic-disabled-client', 'subject': 'synthetic-disabled-subject', 'email': 'synthetic@example.test', 'credentials': None}
        encrypted = seal(f'ai:account:{user}:{aid}', value)
        sql(f"INSERT INTO app.ai_accounts(id,user_id,encrypted_data) VALUES('{aid}','{user}',decode('{encrypted}','hex'))")
        print('Synthetic disconnected account inserted; no provider request.')
        return
    revision = int(data['revision'])
    value = {'request': data.get('request', {'model': 'synthetic-ui-fixture', 'input': [{'role': 'user', 'content': 'Synthetic UI fixture; no provider request'}]}), 'answer': data['answer'], 'usage': None}
    encrypted = seal(f'ai:turn:{user}:{chat}:{turn}', value)
    sql(f"INSERT INTO app.ai_turns(id,user_id,chat_id,preview_id,config_revision,model,status,encrypted_data,finished_at) VALUES('{turn}','{user}','{chat}','{uuid4()}',{revision},'synthetic-ui-fixture','completed',decode('{encrypted}','hex'),now())")
    print('Synthetic UI fixture inserted; no external AI request.')


if __name__ == '__main__':
    main()
