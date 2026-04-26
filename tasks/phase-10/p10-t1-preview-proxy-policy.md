# [P10-T1] Preview Proxy Policy

## Status

Not started

## Phase

[Phase 10 - High-Resolution Preview and Performance](../../roadmap/phase-10-high-resolution-preview-and-performance.md)

## Outcome

Define and implement when preview should use full resolution versus a proxy size.

## Scope

- Set preview thresholds for larger rasters.
- Derive preview decode size from media dimensions and current workflow needs.
- Preserve full-resolution export even when preview uses a proxy.

## Implementation Notes

- Preview policy should balance interactivity against visual trustworthiness.
- The user should not need to infer whether playback is full-res or proxy-res.

## Acceptance Criteria

- Large media triggers a documented preview proxy strategy.
- Export remains source-accurate even when preview is reduced.
- The app can communicate preview resolution behavior clearly.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
