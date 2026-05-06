# [P22-T1] Licensing Trials And Entitlements

## Status

Not started

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
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Commercial pricing and licensing provider must be selected.
