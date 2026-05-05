# [P14-T7] Delivery Conformance And Metadata Validation

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Validate exported files against the selected delivery intent so pixel transforms and metadata tags agree.

## Scope

- Verify FFmpeg output color primaries, transfer characteristics, matrix coefficients, range, codec, container, and bit depth.
- Add delivery profiles for Rec.709 SDR, web sRGB-like review files, Rec.2020 HLG, Rec.2020 PQ, and archival mezzanine paths.
- Add export summaries that describe source profile, working space, display rendering, output transform, and final metadata.
- Add warnings when a codec/container cannot carry the requested metadata reliably.

## Implementation Notes

- Conformance checks should happen after export using FFprobe where possible.
- Pixel transform success and metadata tag success must be reported separately.
- Keep delivery profiles narrow and validated before exposing them as presets.
- Add structured failure reasons for CI and user-facing export errors.

## Acceptance Criteria

- Exported files are probed and compared against the selected delivery intent.
- Mismatched or missing metadata produces a clear export warning or failure.
- Export summaries include active color-management decisions.
- Tests cover matching, mismatched, and unsupported delivery combinations.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- FFmpeg capability detection must know which encoder/container combinations preserve requested metadata.
