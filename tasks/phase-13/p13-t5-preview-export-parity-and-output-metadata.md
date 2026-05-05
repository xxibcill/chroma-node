# [P13-T5] Preview Export Parity And Output Metadata

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Apply color management consistently in WebGL preview, CPU export, still export, image sequence export, and output metadata.

## Scope

- Wrap the current node graph with input and output transforms in both CPU and WebGL paths.
- Extend shader generation and uniform upload for project color-management settings.
- Apply the same managed pipeline to stills, image sequences, scopes, and video export.
- Set explicit FFmpeg output color metadata for Rec.709 SDR exports.
- Validate exported file metadata with FFprobe after export.

## Implementation Notes

- Keep CPU evaluation as the reference implementation and generate GLSL behavior to match it.
- Update `src/shared/colorEngine.ts`, `src/renderer/webgl/FrameRenderer.ts`, `src/main/exportProject.ts`, `src/main/exportStill.ts`, and `src/main/exportSequence.ts` as needed.
- Do not rely on FFmpeg metadata tags alone; pixel values must be transformed before tagging output.
- For SDR output, explicitly set Rec.709 primaries, transfer, matrix, and range metadata.
- Add parity fixtures that cover Rec.709 identity, Apple Log input, and a wide-gamut-to-Rec.709 path.

## Acceptance Criteria

- Preview and export use the same input, working, output, tone, and gamut decisions.
- CPU/WebGL parity tests cover the managed pipeline within the agreed tolerance.
- Still/image-sequence/video export match the viewer for the same frame and settings.
- FFprobe verifies exported SDR video as Rec.709-tagged output.
- Export summaries list active color-management decisions and technical LUTs/transforms when present.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
