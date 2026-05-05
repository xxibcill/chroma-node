# [P17-T6] Update CI Roadmap Coverage

## Status

Not started

## Phase

[Phase 17 - Architecture and Quality Foundation](../../roadmap/phase-17-architecture-and-quality-foundation.md)

## Outcome

Update CI and roadmap verification policy so active phase branches are checked consistently before work is marked complete.

## Scope

- Update CI triggers to cover active roadmap branches, not only `main` and old upgrade branches.
- Decide whether all pushes should run CI or whether a branch pattern should be used.
- Add e2e smoke verification once Playwright browser setup is reliable.
- Document required verification commands for phase completion.
- Keep roadmap status and verification logs aligned with the CI policy.

## Implementation Notes

- Current CI covers `main` and `upgrade/phase-1`, while active development is on `upgrade/phase-2`.
- Keep CI fast enough for regular development by separating required smoke checks from heavier packaging or full e2e runs if needed.
- The phase completion policy should distinguish unit/type/lint/build checks from optional packaging and long-running media export checks.

## Acceptance Criteria

- CI runs on the active roadmap branch strategy.
- Required checks include lint, typecheck, unit tests, and build.
- E2E smoke checks are included after Playwright setup is stable.
- `roadmap/README.md` and `roadmap/STATUS.md` describe the verification expectations clearly.
- Future phase files can reference a consistent completion policy instead of redefining checks ad hoc.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Depends on P17-T5 for reliable Playwright setup before e2e smoke checks are mandatory.

