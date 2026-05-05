# [P22-T3] Privacy Aware Telemetry And Analytics

## Status

Not started

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
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Privacy policy and analytics provider must be selected.
