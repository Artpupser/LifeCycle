"""Focused acceptance for contacts-owned family and social relationship graphs."""
import argparse

from auth_smoke import Client, origin_url, require
from core_smoke import login


def run(args):
    origin = origin_url(args.origin)
    mail = Client(args.mailpit_url, origin)
    owner = login(args.url, origin, mail, 30)
    other = login(args.url, origin, mail, 30)
    people = [owner.request('POST', '/api/contacts', {'data': {'first_name': 'Relations QA ' + str(index)}}, expected=201)[0] for index in range(7)]
    foreign = other.request('POST', '/api/contacts', {'data': {'first_name': 'Foreign relation QA'}}, expected=201)[0]

    def relation(source, target, kind, expected=201):
        return owner.request('POST', '/api/contacts/relationships', {'source_id': people[source]['id'], 'target_id': people[target]['id'], 'kind': kind}, expected=expected)[0]

    first = relation(0, 1, 'parent')
    second = relation(1, 2, 'parent')
    relation(0, 0, 'friend', 400)
    relation(0, 1, 'parent', 409)
    relation(2, 0, 'parent', 400)
    relation(0, 2, 'sibling', 400)
    relation(0, 2, 'partner', 400)
    friend = relation(2, 0, 'friend')
    require(friend['category'] == 'social', 'Social relationships are mixed into genealogy')
    sibling = relation(3, 4, 'sibling')
    require(sibling['category'] == 'family', 'Sibling relationship is not categorized as family')
    require(sibling['source_id'] < sibling['target_id'], 'Symmetric links were not canonicalized')
    relation(4, 3, 'sibling', 409)
    relation(3, 5, 'parent')
    relation(5, 4, 'parent', 400)
    relation(6, 2, 'parent')  # Adoption/multiple parents have no artificial two-parent limit.

    owner.request('POST', '/api/contacts/relationships', {'source_id': people[0]['id'], 'target_id': foreign['id'], 'kind': 'friend'}, expected=404)
    require(other.request('GET', '/api/contacts/relationships')[0] == [], 'Another owner can read private relationship edges')
    other.request('DELETE', '/api/contacts/relationships/' + first['id'], {'revision': first['revision']}, expected=404)
    owner.request('DELETE', '/api/contacts/relationships/' + first['id'], {'revision': first['revision'] + 1}, expected=409)

    renamed = owner.request('PUT', '/api/contacts/' + people[0]['id'], {'data': {'first_name': 'Renamed parent'}, 'revision': people[0]['revision']})[0]
    require(renamed['id'] == people[0]['id'], 'Editing a contact changed graph identity')
    edges = owner.request('GET', '/api/contacts/relationships')[0]
    require(any(edge['id'] == first['id'] for edge in edges), 'Editing a contact lost its existing links')
    require(next(edge for edge in edges if edge['id'] == first['id'])['source_id'] == people[0]['id'], 'Parent direction changed')
    owner.request('DELETE', '/api/contacts/relationships/' + friend['id'], {'revision': friend['revision']}, expected=204)
    require(owner.request('GET', '/api/contacts/' + people[0]['id'])[0]['id'] == people[0]['id'], 'Removing a relationship deleted a person')

    owner.request('DELETE', '/api/contacts/' + people[1]['id'], {'revision': people[1]['revision'], 'events': 'keep'}, expected=204)
    remaining = owner.request('GET', '/api/contacts/relationships')[0]
    require(all(edge['id'] not in {first['id'], second['id']} for edge in remaining), 'Deleting a contact left dangling graph edges')
    require(all(people[1]['id'] not in {edge['source_id'], edge['target_id']} for edge in remaining), 'A removed contact remains in relationships')
    print('PASS: contact relationship ownership, genealogy cycles/contradictions, symmetric deduplication, social separation, revision checks, contact synchronization and cascade deletion')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--origin', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    run(parser.parse_args())
