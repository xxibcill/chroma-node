# [P22-T3] Privacy Aware Telemetry And Analytics

## Status

Partial

## Phase

[Phase 22 - Commercial Readiness and Growth Platform](../../roadmap/phase-22-commercial-readiness-and-growth-platform.md)

## Outcome

Collect opt-in product signals that explain activation, retention, feature value, errors, and performance without exposing user media.

## Scope

- Define opt-in consent, event taxonomy, redaction rules, and retention policy.
- Track activation milestones, lesson completion, exports, feature usage, crashes, and performance buckets.
- Add local telemetry queue with retry, disable, and delete behavior.
- Add analytics dashboards or export format for product review.

## Implementation Notes

- Never send media, frame pixels, project names, local paths, or prompt text by default.
- Keep telemetry disabled until consent is explicit.
- Make event schemas versioned and testable.

## Acceptance Criteria

- Users can opt in, opt out, and delete local telemetry queue data.
- Events are redacted and schema-validated before sending.
- Telemetry failure does not affect grading, export, or project save.
- Tests cover redaction, consent, queue retry, and disabled mode.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `src/shared/telemetry.ts` defines consent state, event types, queue entries, redaction patterns, event creation, and event validation.
- `src/main/telemetryStore.ts` persists consent and queue data, enforces consent before enqueueing, redacts payloads, supports flush/retry/delete, and exposes queue size.
- IPC and preload contracts expose get/set consent, track, flush, delete all, and queue size operations.
- Export, license, and launch experiment flows emit telemetry events through the consent-gated telemetry store.
- `src/main/telemetryStore.test.ts` covers disabled-mode and redaction behavior.
- `CommercialReadinessPanel` exposes telemetry consent and flush controls.

Remaining work:
- No analytics provider or dashboard/export review workflow is configured.
- Expand event emission coverage beyond export/license/launch flows.
- Add tests for consent, queue retry, and local deletion behavior.

## Blockers

- Privacy policy and analytics provider must be selected.
