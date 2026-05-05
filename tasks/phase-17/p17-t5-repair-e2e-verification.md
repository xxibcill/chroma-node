# [P17-T5] Repair E2E Verification

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Make Playwright e2e verification reliable enough to catch UI, layout, accessibility, and workflow regressions before phase work is marked complete.

## Scope

- Make Playwright browser installation reliable for local development and CI.
- Update stale selectors and assertions to match the current app shell.
- Replace brittle selector-heavy checks with workflow-level smoke tests where possible.
- Add focused layout and viewport checks for the workstation shell.
- Add coverage for import empty state, playback controls, export settings/progress states, node controls, scopes visibility, and error states.
- Document the required e2e setup and troubleshooting path.

## Implementation Notes

- Current `npm run test:e2e` is blocked locally when the Playwright Chromium binary is missing.
- `npx playwright install chromium` may need CI caching, a mirror, or documented retry/setup behavior depending on network reliability.
- Existing tests should be audited for stale UI assumptions before expanding coverage.
- Keep the mandatory smoke suite small enough to run regularly.

## Acceptance Criteria

- `npm run test:e2e` runs successfully on a clean local setup after documented install steps.
- CI installs or caches the required Playwright browser and runs at least the mandatory smoke suite.
- Stale selectors are removed or updated.
- E2E tests verify at least one happy path and one error/disabled state for import, playback, export, and Color panel controls.
- Failure artifacts include trace or screenshot output for debugging.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Reliable Playwright browser download or cache strategy must be available in the target environment.

