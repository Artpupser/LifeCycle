"""Focused regression for fixed collection seeding through the shared labels API."""
import argparse
import json
from pathlib import Path

from auth_smoke import Client, origin_url, require
from core_smoke import login


def run(args):
    origin = origin_url(args.origin)
    owner = login(args.url, origin, Client(args.mailpit_url, origin), 30)
    catalog = json.loads((Path(__file__).resolve().parent.parent / 'shared' / 'collections.json').read_text())
    labels = owner.request('GET', '/api/labels')[0]
    fixed = [item for item in catalog if not item['expandable']]
    for kind in fixed:
        rows = [row for row in labels if row['kind'] == kind['id']]
        require(len(rows) == len(kind['entries']), 'Fixed catalog entries are missing or duplicated')
        require({row['value'] for row in rows} == {entry['value'] for entry in kind['entries']}, 'Stored fixed values changed')
        require(all(row['is_system'] and row['function_key'] is None for row in rows), 'Fixed entries must be system-owned without functional adapters')
        require(owner.request('GET', '/api/labels?kind=' + kind['id'])[0] == rows, 'Kind filtering changed fixed entries')
        selected = rows[0]
        owner.request('PUT', '/api/labels/' + selected['id'], {'name': 'Forbidden edit', 'revision': selected['revision']}, expected=400)
        owner.request('DELETE', '/api/labels/' + selected['id'], {'revision': selected['revision']}, expected=400)
        owner.request('POST', '/api/labels', {'name': 'Forbidden addition', 'kind': kind['id']}, expected=400)
    require(owner.request('GET', '/api/labels')[0] == labels, 'Reseeding changed label IDs, metadata or revisions')
    functions = {row['function_key']: row for row in labels if row['function_key']}
    require(set(functions) == {'ai_access', 'cost'}, 'Functional system labels were lost')
    require(not functions['ai_access']['repeatable'], 'AI access cardinality changed')

    tag = owner.request('POST', '/api/labels', {'name': 'QA: punctuation, / # +'}, expected=201)[0]
    require(tag['name'] == 'QA: punctuation, / # +' and not tag['is_system'], 'Ordinary tag creation changed')
    renamed = owner.request('PUT', '/api/labels/' + tag['id'], {'name': 'QA: renamed, / # +', 'revision': tag['revision']})[0]
    owner.request('DELETE', '/api/labels/' + tag['id'], {'revision': renamed['revision']}, expected=204)

    item = owner.request('POST', '/api/labels', {'name': 'QA private toy', 'kind': 'toy'}, expected=201)[0]
    owner.request('DELETE', '/api/labels/' + item['id'], {'revision': item['revision']}, expected=204)
    archived = next(row for row in owner.request('GET', '/api/labels')[0] if row['id'] == item['id'])
    require(not archived['in_collection'], 'Collection removal lost its historical registry reference')
    print('PASS: labels API, fixed catalog seeding/idempotency/protection, ordinary tags and archived collection references')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8081')
    parser.add_argument('--origin', default='http://127.0.0.1:8081')
    parser.add_argument('--mailpit-url', default='http://127.0.0.1:8025')
    run(parser.parse_args())
