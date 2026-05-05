# [P22-T4] Support Feedback And Crash Diagnostics

## Status

Not started

## Phase

[Phase 22 - Commercial Readiness and Growth Platform](../../roadmap/phase-22-commercial-readiness-and-growth-platform.md)

## Outcome

Make user support practical through crash diagnostics, feedback capture, redacted logs, and support bundles.

## Scope

- Add crash reporting with consent and redaction.
- Add feedback form with optional screenshot, logs, project diagnostics, and user contact field.
- Add support bundle creation with selectable contents.
- Add diagnostic summaries for FFmpeg, GPU, OS, app version, media metadata, and failed operations.

## Implementation Notes

- Keep support bundles inspectable before sending.
- Redact local paths and media names by default.
- Ensure support tooling works even when the renderer is partially broken.

## Acceptance Criteria

- Users can create a redacted support bundle from the app.
- Crashes and failed operations produce useful diagnostic records.
- Feedback can be captured without requiring telemetry consent.
- Tests cover redaction and support bundle manifest contents.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Crash reporting provider and consent flow must be selected.
