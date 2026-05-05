# [P14-T8] Color Science Reference Validation

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Create a durable validation suite for color-science transforms, technical LUTs, display rendering, and delivery metadata.

## Scope

- Add reference vectors for every supported profile and transform stage.
- Add golden image tests for representative source-to-output workflows.
- Add CPU/WebGL parity tests for transforms, LUTs, tone mapping, and gamut mapping.
- Track tolerances by transform type and document why each tolerance is acceptable.
- Add regression tests that ensure scopes and exports consume the managed output consistently.

## Implementation Notes

- Store small synthetic fixtures in the repo and keep large media fixtures optional.
- Prefer deterministic generated fixtures when licensing real camera clips is unclear.
- Keep reference provenance close to the test data.
- Make failures explain whether the issue is transfer, gamut, tone, range, or metadata.

## Acceptance Criteria

- Every enabled color profile has reference coverage.
- CPU/WebGL parity covers the complete managed pipeline.
- Export validation covers both pixels and tags.
- Documentation lists the supported profile matrix, validation source, and known limits.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Reference sources must be licensed and stable enough for automated tests.
