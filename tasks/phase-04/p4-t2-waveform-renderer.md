# P4-T2 Waveform Renderer

## Status

Not started

## Phase

[Phase 04 - Waveform and Vectorscope](../../roadmap/phase-04-waveform-and-vectorscope.md)

## Outcome

The app renders a luma waveform for the current graded frame.

## Scope

- Calculate Rec.709 luma per sampled pixel.
- Map source x position to scope x position.
- Map luma to 0-100 IRE-style vertical range.
- Accumulate density for display.
- Draw grid and labels.

## Implementation Notes

- Use `0.2126 R + 0.7152 G + 0.0722 B`.
- Use density accumulation instead of only line drawing.
- Keep scope rendering independent from grading shader code.

## Acceptance Criteria

- Black pixels appear near 0.
- White pixels appear near 100.
- Horizontal image position maps to waveform x.
- Waveform updates when primary correction changes luma.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

