# [P10-T2] Frame Decode And Cache Tuning

## Status

Not started

## Phase

[Phase 10 - High-Resolution Preview and Performance](../../roadmap/phase-10-high-resolution-preview-and-performance.md)

## Outcome

Reduce repeated decode cost for playback, frame stepping, and tracking on large media.

## Scope

- Improve frame extraction reuse and caching strategy.
- Reduce unnecessary re-probe and re-decode work in preview-heavy flows.
- Keep memory growth bounded while tuning responsiveness.

## Implementation Notes

- Cache policy should be explicit about retention and invalidation rather than opportunistic.
- Tracking fetches and paused-frame preview fetches are likely to need different cache behavior.

## Acceptance Criteria

- Playback and frame stepping avoid redundant decode work where practical.
- Tracking uses a decode path that remains stable on larger rasters.
- Memory use remains bounded under the chosen cache strategy.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
