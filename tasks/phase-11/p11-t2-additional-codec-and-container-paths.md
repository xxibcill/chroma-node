# [P11-T2] Additional Codec And Container Paths

## Status

Not started

## Phase

[Phase 11 - Format and Delivery Expansion](../../roadmap/phase-11-format-and-delivery-expansion.md)

## Outcome

Add selected new output codec and container paths beyond the current H.264 MP4 path.

## Scope

- Choose and implement a small set of additional delivery targets.
- Validate FFmpeg capability detection for the new paths.
- Keep the export model understandable despite broader output support.

## Implementation Notes

- Favor a narrow, high-value set of additional outputs over a large codec matrix.
- Capability checks should fail early when the runtime FFmpeg build lacks required encoders.

## Acceptance Criteria

- At least one additional output path beyond H.264 MP4 is available.
- Unsupported encoder availability is detected before export starts.
- Export settings remain comprehensible after adding the new output path.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
