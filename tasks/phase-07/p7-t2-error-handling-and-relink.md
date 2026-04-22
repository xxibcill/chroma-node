# P7-T2 Error Handling And Relink

## Status

Not started

## Phase

[Phase 07 - Hardening and Packaging](../../roadmap/phase-07-hardening-and-packaging.md)

## Outcome

The app handles missing media, invalid projects, worker failures, and user-facing errors predictably.

## Scope

- Add structured error types.
- Add missing-media relink flow.
- Add project repair for recoverable invalid state.
- Add worker failure handling.
- Redact sensitive paths in diagnostics where appropriate.

## Implementation Notes

- Relink should validate replacement media compatibility.
- Worker errors should include operation and frame context when available.
- Avoid exposing raw stack traces in normal UI.

## Acceptance Criteria

- Project with missing media opens into relink state.
- Compatible relink restores the project.
- Incompatible relink is rejected with a clear reason.
- Worker crash does not crash the app shell.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

