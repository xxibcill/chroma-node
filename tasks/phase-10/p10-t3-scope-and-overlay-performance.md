# [P10-T3] Scope And Overlay Performance

## Status

Not started

## Phase

[Phase 10 - High-Resolution Preview and Performance](../../roadmap/phase-10-high-resolution-preview-and-performance.md)

## Outcome

Keep scopes and overlay interaction responsive when working with larger media.

## Scope

- Tune scope sampling size and cadence for larger rasters.
- Avoid overlay interaction slowdowns caused by geometry growth.
- Add guardrails for expensive live-analysis paths during playback.

## Implementation Notes

- Scope optimizations should preserve interpretability, not only raw speed.
- If some analysis paths need throttling, the user should still receive predictable updates.

## Acceptance Criteria

- Scope updates remain usable on larger clips.
- Overlay interaction does not become visibly misaligned or sluggish on larger media.
- Playback sampling policy for scopes is documented and enforced.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
