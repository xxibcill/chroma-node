# P4-T3 Vectorscope Renderer

## Status

Done

## Phase

[Phase 04 - Waveform and Vectorscope](../../roadmap/phase-04-waveform-and-vectorscope.md)

## Outcome

The app renders a vectorscope for the current graded frame with useful chroma guide markings.

## Scope

- Calculate Y, Cb, and Cr from sampled RGB.
- Plot chroma points into a circular scope.
- Accumulate density for display.
- Add approximate hue guide markers.
- Update when saturation, temperature, tint, or RGB balance changes.

## Implementation Notes

- Use the MVP formula from the PRD for Cb and Cr.
- Keep guides approximate and clearly internal to the app.
- Use downsampling during playback if needed.

## Acceptance Criteria

- Neutral grayscale clusters near center.
- Saturated colors move away from center.
- Saturation changes alter vector magnitude.
- Vectorscope updates within target latency while paused.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- None
