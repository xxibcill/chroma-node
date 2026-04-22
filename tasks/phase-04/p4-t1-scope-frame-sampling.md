# P4-T1 Scope Frame Sampling

## Status

Not started

## Phase

[Phase 04 - Waveform and Vectorscope](../../roadmap/phase-04-waveform-and-vectorscope.md)

## Outcome

The app can provide graded frame data to scope renderers without blocking normal viewer interaction.

## Scope

- Capture or sample the current graded frame.
- Support paused-frame full-resolution analysis where feasible.
- Support downsampled playback analysis.
- Transfer frame data to a scope worker or isolated scope module.

## Implementation Notes

- Avoid synchronous readbacks during high-frequency UI interaction when possible.
- Scope input should be the graded output after all enabled nodes.
- Matte preview can either scope the matte view or force graded output by product decision.

## Acceptance Criteria

- Paused-frame scope input updates after grading changes.
- Playback scope input is throttled.
- Scrubbing updates scopes after the scrub settles.
- Frame sampling does not freeze the viewer under target hardware.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

