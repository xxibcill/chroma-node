# [P15-T2] Waveform Family

## Status

Not started

## Phase

[Phase 15 - Professional Scopes and Monitoring Suite](../../roadmap/phase-15-professional-scopes-and-monitoring-suite.md)

## Outcome

Add a complete waveform family for exposure, channel balance, range, and HDR inspection.

## Scope

- Add luma waveform, RGB overlay waveform, YRGB overlay waveform, YCbCr waveform, per-channel waveform, and HDR/nit-scaled waveform.
- Add IRE, normalized, code-value, and nit scales where applicable.
- Add line-select and region-select waveform modes.
- Add super-white, sub-black, legal/full-range, and clipping overlays.

## Implementation Notes

- Keep Rec.709 luma, working-space luma, and output luma choices explicit.
- Support both dense display and readable high-contrast guide modes.
- Avoid recalculating unrelated waveform variants when only display layout changes.
- Coordinate range overlays with export delivery intent.

## Acceptance Criteria

- Users can switch waveform variants and scales from the scope panel.
- HDR waveform shows nit-aware scale when the output/viewing path supports it.
- Legal/full range and clipping guides reflect the selected delivery profile.
- Tests cover binning for luma, RGB, YCbCr, and HDR scale modes.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Blockers

- HDR scale behavior depends on Phase 14 HDR output/viewing policy.
