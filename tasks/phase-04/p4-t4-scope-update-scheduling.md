# P4-T4 Scope Update Scheduling

## Status

Not started

## Phase

[Phase 04 - Waveform and Vectorscope](../../roadmap/phase-04-waveform-and-vectorscope.md)

## Outcome

Scope updates are scheduled so they feel responsive without harming playback or grading interaction.

## Scope

- Debounce scope updates during slider changes.
- Throttle scope updates during playback.
- Trigger scope updates after scrubbing settles.
- Cancel stale scope work when a newer frame or grade is available.

## Implementation Notes

- Target 50 ms debounce for paused parameter changes.
- Cap playback updates at 15 fps.
- Use monotonically increasing request ids to discard stale results.

## Acceptance Criteria

- Rapid slider changes do not queue unbounded scope work.
- Scope updates during playback do not drop UI responsiveness below target.
- Latest completed scope result always matches the current frame/grade request id.
- Scrubbing does not leave scopes stuck on an old frame.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

