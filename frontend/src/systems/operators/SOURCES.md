# Mobile operator lookup

The external adapter uses [num7's documented lookup API](https://num7.ru/docs/lookup-api/): Russian mobile numbers, `GET /v1/lookup`, `X-API-Key`, `operator`, `found`, `mnp_ported`. Credentials are user supplied in Settings and encrypted by the backend. The browser calls only the authenticated LifeCycle backend. Positive results live for 24 hours; provider “not found” results live for one hour. Transient failures fall back locally. No real provider credentials were used for automated checks.

The offline allocation snapshot comes from the [archived DEF extract published by MTS](https://static.mts.ru/uploadmsk/contents/1655/Kody_DEF-9kh.htm), retrieved on 2026-11-03. It contains 8,013 source allocations, merged into 1,303 adjacent ranges with the same owner. The source does not provide a reliable current publication date. It is an allocation archive, not a current carrier or MNP database. Every fallback result is labeled accordingly; uncovered and non-Russian numbers return no guess.

To update, download a trusted DEF allocation CSV or that HTML extract, then run:

```sh
python3 frontend/scripts/generate-operators.py /path/to/extract.csv https://source.example/DEF.csv
# HTML from the archived source is supported too.
```

Review the source, date and coverage before replacing the snapshot. No contact data is needed to generate it. Runtime lookup uses binary search over validated non-overlapping ranges. Provider selection, source display, fallback and cache policy belong to this system; components must not add carrier heuristics.
