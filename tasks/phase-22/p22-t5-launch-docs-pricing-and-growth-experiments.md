# [P22-T5] Launch Docs Pricing And Growth Experiments

## Status

Partial

## Phase

[Phase 22 - Commercial Readiness and Growth Platform](../../roadmap/phase-22-commercial-readiness-and-growth-platform.md)

## Outcome

Prepare the product for paid launch with documentation, pricing gates, onboarding experiments, release notes, and success metrics.

## Scope

- Write launch docs for install, first grade, color management, AI assistance, export, and troubleshooting.
- Define pricing gates for free, trial, paid, pro, AI, and asset-pack features.
- Add onboarding experiments for first-run sample project, guided lesson, and export success.
- Add launch metrics for activation, export completion, retention, conversion, support load, and refund drivers.

## Implementation Notes

- Keep docs close to the product behavior and update them through release checklists.
- Price gates should be visible in product planning before implementation hides features.
- Treat experiments as product configuration, not scattered conditional UI.

## Acceptance Criteria

- Launch documentation covers the first successful grade and common failure cases.
- Pricing gates are mapped to concrete entitlements and UI states.
- Onboarding experiments can be enabled or disabled without code changes where practical.
- Launch metrics are documented and tied to telemetry events or manual reporting.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `src/shared/launchConfig.ts` defines pricing tiers, onboarding experiments, launch metrics, pricing gates, and helper lookups.
- IPC and preload contracts expose pricing tiers, persisted onboarding experiments, launch metrics, and a set-experiment endpoint.
- `README.md` and `RELEASE_NOTES.md` include existing install and product notes.
- `src/main/launchStore.ts` persists onboarding experiment overrides.
- Launch experiment changes emit telemetry events.

Remaining work:
- Launch documentation does not yet cover first paid launch flows, pricing gates, first successful grade, AI assistance, color management, or troubleshooting at launch depth.
- Pricing gates are not enforced in concrete renderer UI states or entitlement checks.
- Launch metrics are only partially tied to emitted telemetry events and have no manual reporting workflow.

## Blockers

- Commercial model and launch audience must be decided.
