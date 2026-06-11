# [P22-T2] Production Packaging And Updates

## Status

Partial

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
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `package.json` has Electron Builder packaging configuration for macOS DMG output and package scripts.
- `src/shared/update.ts` defines stable, beta, and internal release channels plus update status/result types.
- `src/main/updateStore.ts` persists update channel/config, fetches release metadata from configured channel URLs, compares versions, and exposes update check/status/channel operations through IPC.
- `CommercialReadinessPanel` exposes update checks in the renderer.

Remaining work:
- No signing, notarization, or signed installer verification is implemented.
- No auto-update download/apply flow, rollback, safe-start behavior, or signed update metadata exists.
- Release verification is not documented as a reproducible production checklist.

## Blockers

- First launch platform and signing credentials must be chosen.
