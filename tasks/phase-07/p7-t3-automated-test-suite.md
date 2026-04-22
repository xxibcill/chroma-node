# P7-T3 Automated Test Suite

## Status

Not started

## Phase

[Phase 07 - Hardening and Packaging](../../roadmap/phase-07-hardening-and-packaging.md)

## Outcome

The MVP has automated coverage for core color, masking, tracking, project, UI, and export behavior.

## Scope

- Add unit tests for color math and validation.
- Add shader parity or golden-frame tests.
- Add project save/load tests.
- Add Playwright workflow tests.
- Add export validation tests where practical.

## Implementation Notes

- Keep media fixtures small.
- Use synthetic images for deterministic color tests.
- Separate slow export tests from fast unit tests.

## Acceptance Criteria

- Core unit tests run in CI or local equivalent.
- Critical user workflow test imports, grades, and saves a project.
- Golden-frame tests cover neutral and non-neutral node graphs.
- Slow tests are documented and runnable on demand.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

