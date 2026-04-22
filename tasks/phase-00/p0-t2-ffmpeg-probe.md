# P0-T2 FFmpeg Probe

## Status

Done

## Phase

[Phase 00 - Technical Foundation](../../roadmap/phase-00-technical-foundation.md)

## Outcome

The app can locate FFmpeg/FFprobe, run diagnostics, and extract reliable video metadata from a test clip.

## Scope

- Add FFmpeg and FFprobe path discovery.
- Add startup diagnostics for binary availability.
- Implement metadata probe for MP4/MOV files.
- Return structured errors for missing binaries and unsupported files.

## Implementation Notes

- Prefer `ffprobe` JSON output instead of parsing human-readable logs.
- Normalize frame rate from rational strings such as `30000/1001`.
- Capture container, codec, width, height, duration, frame rate, total frames, audio presence, and rotation.

## Acceptance Criteria

- Supported H.264 MP4 returns complete metadata.
- Missing FFmpeg produces a structured diagnostic error.
- Corrupt or unsupported media does not crash the app.
- Probe output matches the project `MediaRef` shape planned for Phase 02.

## Progress

- [x] Not started
- [x] In progress
- [x] Implemented
- [x] Verified

## Verification

- `npm run test:phase00` verified local FFmpeg/FFprobe discovery and probed a generated H.264 MP4.
- Unit tests cover frame-rate normalization and mapping FFprobe JSON into the `MediaRef` shape.

## Blockers

- None
