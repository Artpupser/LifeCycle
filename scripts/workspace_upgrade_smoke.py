"""Owned atomic note selection and account-scoped navigation preferences."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from auth_smoke import Client, require
from core_smoke import login


def run(args):
    base = args.url.rstrip('/')
    owner, other = (login(base, base, Client(args.mailpit_url), 30) for _ in range(2))
    marker = uuid4().hex
    notes = [owner.request('POST', '/api/notes', {'title': f'{marker}-{i}', 'content': '**private body**'}, expected=201)[0] for i in range(2)]
    foreign = other.request('POST', '/api/notes', {'title': 'foreign'}, expected=201)[0]
    folder = owner.request('POST', '/api/notes/folders', {'name': marker}, expected=201)[0]
    foreign_folder = other.request('POST', '/api/notes/folders', {'name': marker}, expected=201)[0]
    def selection():
        return [{'id': note['id'], 'updated_at': owner.request('GET', '/api/notes/' + note['id'])[0]['updated_at']} for note in notes]
    def change(action, **fields):
        return owner.request('POST', '/api/notes/bulk', {'items': selection(), 'action': action, **fields})[0]
    original = selection()
    Client(base).request('POST', '/api/notes/bulk', {'items': original, 'action': 'delete', 'confirmed': True}, expected=401)
    owner.request('POST', '/api/notes/bulk', {'items': original, 'action': 'delete'}, expected=400)
    owner.request('POST', '/api/notes/bulk', {'items': original + original[:1], 'action': 'move'}, expected=400)
    owner.request('POST', '/api/notes/bulk', {'items': [original[0], {'id': foreign['id'], 'updated_at': foreign['updated_at']}], 'action': 'delete', 'confirmed': True}, expected=404)
    owner.request('POST', '/api/notes/bulk', {'items': original, 'action': 'move', 'folder_id': foreign_folder['id']}, expected=404)
    require(selection() == original, 'Rejected bulk operation changed a note')
    require(change('tags_add', tags=['shared'])['affected'] == 2, 'Tag addition count failed')
    owner.request('POST', '/api/notes/bulk', {'items': original, 'action': 'color', 'color': '#123456'}, expected=409)
    change('move', folder_id=folder['id'])
    change('color', color='#DB2777')
    change('tags_add', tags=['second'])
    change('tags_remove', tags=['shared'])
    for note in notes:
        saved = owner.request('GET', '/api/notes/' + note['id'])[0]
        require(saved['content'] == '**private body**' and saved['folder_id'] == folder['id'] and saved['color'] == '#DB2777' and saved['tags'] == ['second'] and not saved['ai_shared'], 'Bulk properties rewrote content or privacy')
    owner.request('POST', '/api/notes/bulk', {'items': selection(), 'action': 'delete', 'confirmed': True}, origin='https://foreign.example', expected=403)
    change('delete', confirmed=True)
    for note in notes:
        owner.request('GET', '/api/notes/' + note['id'], expected=404)
    nav = owner.request('GET', '/api/navigation')[0]
    require(len(nav['ordering']) == 14 and nav['pinned'] == nav['ordering'] and nav['revision'] == 0, 'Navigation defaults differ')
    nav['ordering'] = list(reversed(nav['ordering']))
    nav['pinned'] = ['/notes', '/tasks']
    stale = dict(nav)
    nav = owner.request('PUT', '/api/navigation', nav)[0]
    require(owner.request('GET', '/api/navigation')[0] == nav, 'Navigation not persisted')
    require(other.request('GET', '/api/navigation')[0]['revision'] == 0, 'Navigation crossed ownership')
    owner.request('PUT', '/api/navigation', stale, expected=409)
    owner.request('PUT', '/api/navigation', {**nav, 'pinned': ['/unsupported']}, expected=400)
    owner.request('PUT', '/api/navigation', {**nav, 'ordering': nav['ordering'][:-1]}, expected=400)
    owner.request('PUT', '/api/navigation', {**nav, 'pinned': ['/notes', '/notes']}, expected=400)
    owner.request('PUT', '/api/navigation', nav, origin='https://foreign.example', expected=403)
    settings = owner.request('GET', '/api/settings')[0]
    owner.request('PUT', '/api/settings', settings)
    require(owner.request('GET', '/api/navigation')[0] == nav, 'Settings save reset navigation')
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: owner.request('PUT', '/api/navigation', nav, expected={200, 409})[0], range(2)))
    require(sum('ordering' in value for value in responses) == 1, 'Concurrent navigation revisions were not serialized')
    print('PASS: atomic owned note move/tags/color/deletion, validation/CSRF/stale guards and preserved content/privacy; persisted isolated unique navigation, CAS/concurrency and independent settings.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://localhost:8025')
    run(parser.parse_args())
