# [P22-T1] Licensing Trials And Entitlements

## Status

Partial

## Phase

[Phase 22 - Commercial Readiness and Growth Platform](../../roadmap/phase-22-commercial-readiness-and-growth-platform.md)

## Outcome

Add licensing, trial, activation, offline grace, and entitlement behavior for paid product distribution.

## Scope

- Define trial states, paid states, expired states, offline grace, and license recovery.
- Add entitlement checks for pro features, AI features, marketplace packs, and export limits.
- Add activation and deactivation flows.
- Add clear local error states for failed license checks.

## Implementation Notes

- Keep core project files portable across license states.
- Avoid blocking access to user-created projects when a trial expires.
- Separate licensing client code from feature implementation.

## Acceptance Criteria

- Trial and paid states are represented in a typed entitlement model.
- Entitlement gates are testable and do not corrupt project state.
- Offline grace behavior is deterministic and documented.
- Users can recover from failed activation without losing work.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `src/shared/entitlement.ts` defines license tiers, entitlement flags, trial duration, offline grace, validation results, and entitlement checks.
- `src/shared/entitlement.test.ts` covers default/trial states, expiry, grace, and feature checks.
- `src/main/licenseStore.ts` persists entitlement state and implements trial start, structured local license-key activation, deactivation, validation, grace helpers, usage tracking, export entitlement checks, and clearing.
- IPC and preload contracts expose license validation, feature checks, trial start, activation, deactivation, state, and clear operations.
- Export resolution and monthly export limits are enforced before project export starts.
- `CommercialReadinessPanel` exposes trial, activation, validation, and deactivation states in the renderer.

Remaining work:
- Replace structured local license keys with a selected licensing provider and recovery flow.
- Entitlement gates are not enforced in every renderer feature flow such as AI, marketplace access, or pro controls.
- Add deeper UI states for expired, failed activation, recovery, and offline grace.

## Blockers

- Commercial pricing and licensing provider must be selected.
