# [P22-T2] Production Packaging And Updates

## Status

Not started

## Phase

[Phase 22 - Commercial Readiness and Growth Platform](../../roadmap/phase-22-commercial-readiness-and-growth-platform.md)

## Outcome

Ship signed production builds with update channels, rollback safety, and release verification.

## Scope

- Add signed packaging for the first launch platform.
- Add stable, beta, and internal release channels.
- Add auto-update checks with user-visible release notes.
- Add rollback or safe-start behavior after failed updates.

## Implementation Notes

- Start with macOS if first-launch scope stays narrow.
- Keep update metadata signed and channel-specific.
- Add a release checklist that includes verification commands and manual smoke tests.

## Acceptance Criteria

- A signed installer can be produced from a clean checkout.
- Update checks can distinguish stable, beta, and internal channels.
- Failed updates do not prevent the app from starting or accessing projects.
- Release verification is documented and reproducible.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- First launch platform and signing credentials must be chosen.
