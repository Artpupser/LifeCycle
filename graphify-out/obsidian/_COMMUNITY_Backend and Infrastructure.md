---
type: community
cohesion: 0.60
members: 5
---

# Backend and Infrastructure

**Cohesion:** 0.60 - moderately connected
**Members:** 5 nodes

## Members
- [[Backend data authority]] - rationale - project_projective.md
- [[Docker Compose infrastructure]] - concept - project_projective.md
- [[Garage S3 photo storage]] - concept - project_projective.md
- [[Redis]] - concept - project_projective.md
- [[Rust HTTP API backend]] - concept - project_projective.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_and_Infrastructure
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_LifeCycle Product Planning]]
- 2 edges to [[_COMMUNITY_Frontend Modular Architecture]]
- 2 edges to [[_COMMUNITY_Database and Migrations]]
- 1 edge to [[_COMMUNITY_Notes and Search]]

## Top bridge nodes
- [[Rust HTTP API backend]] - degree 9, connects to 3 communities
- [[Docker Compose infrastructure]] - degree 5, connects to 2 communities
- [[Garage S3 photo storage]] - degree 3, connects to 1 community