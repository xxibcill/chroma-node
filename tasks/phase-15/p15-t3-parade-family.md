# [P15-T3] Parade Family

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add parade scopes for comparing channels, luma/chroma components, and HDR output levels side by side.

## Scope

- Add RGB parade, YRGB parade, YCbCr parade, channel-isolated parade, and HDR parade variants.
- Add compact and expanded parade layouts.
- Add range, clipping, and guide overlays per channel.
- Add compare mode for original versus graded parade inspection.

## Implementation Notes

- Share vertical scale code with waveform.
- Keep channel colors legible in the dark workstation UI and accessible against grid lines.
- Avoid label clutter in compact layouts.
- Ensure parade layout dimensions are stable so switching variants does not resize the shell.

## Acceptance Criteria

- Parade variants can be selected independently from waveform variants.
- Channel guides and clipping overlays match the active scale.
- Original/graded compare mode is available for parade inspection.
- Tests cover channel binning and layout partitioning.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
