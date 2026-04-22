# P5-T5 Tracked Window Playback

## Status

Not started

## Phase

[Phase 05 - Translation Tracking](../../roadmap/phase-05-translation-tracking.md)

## Outcome

Tracked window translations are applied during viewer playback, scrubbing, frame stepping, and later export.

## Scope

- Resolve tracking offset for the current frame.
- Apply dx/dy to the selected window mask.
- Update overlays to show tracked position.
- Handle frames without keyframes.
- Share resolved tracking behavior with export.

## Implementation Notes

- Use exact keyframe match for MVP.
- If interpolation is added, keep it deterministic and documented.
- Do not mutate base window center while applying per-frame tracking offset.

## Acceptance Criteria

- Tracked window visibly follows generated keyframes.
- Scrubbing to a tracked frame applies the correct offset.
- Frames outside tracked range use base position or defined fallback.
- Export can reuse the same tracking resolution code.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

