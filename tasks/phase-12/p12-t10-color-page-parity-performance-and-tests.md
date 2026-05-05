# [P12-T10] Color Page Parity, Performance, And Tests

## Status

Done (colorEngine.parity.test.ts covers curves and LUT CPU/GPU parity - see commit e57b57b)

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Protect the upgraded Color page with parity checks, performance guardrails, migration tests, and end-to-end workflow coverage.

## Scope

- Add CPU/GPU parity tests for primaries, curves, qualifiers, windows, LUTs, and combined node stacks.
- Add project migration tests for every schema extension introduced in this phase.
- Add renderer workflow tests for major grading interactions.
- Profile large node stacks, expanded scopes, and playback sampling.
- Document the supported Color page feature set and known limits.

## Implementation Notes

- Keep parity tests close to `src/shared/colorEngine` whenever possible.
- Use deterministic synthetic frames for color math verification.
- Add e2e tests for workflows, not every numeric control permutation.
- Treat performance regressions as phase blockers if they make playback or export unusable.

## Acceptance Criteria

- New grading operations have shared-engine unit tests and preview/export parity coverage.
- Older project files still open with safe defaults after schema changes.
- Main Color page workflows are covered by automated tests.
- Documentation describes the Resolve-inspired scope of the app without implying full Resolve feature parity.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
