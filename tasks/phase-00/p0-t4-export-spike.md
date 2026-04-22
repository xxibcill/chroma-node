# P0-T4 Export Spike

## Status

Done

## Phase

[Phase 00 - Technical Foundation](../../roadmap/phase-00-technical-foundation.md)

## Outcome

The app proves that processed image frames can be encoded into a video-only H.264 MP4.

## Scope

- Generate or process a small frame sequence.
- Pipe frames into FFmpeg.
- Encode MP4 with H.264 and `yuv420p`.
- Return export success or failure through IPC.

## Implementation Notes

- This spike may use synthetic frames before full media decode/export exists.
- Do not include audio.
- Capture FFmpeg stderr for diagnostics.

## Acceptance Criteria

- Output MP4 opens in a standard player.
- Output has expected frame count, resolution, and codec.
- Failed encode returns a structured error.
- Export command can be reused as the basis for Phase 06.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Verification

- `npm run test:phase00` encoded a synthetic RGBA frame sequence to H.264 MP4 with `yuv420p`.
- The verifier probed the exported MP4 and checked codec, raster, frame count, and decoded frame access.

## Blockers

- None
