# P6-T3 FFmpeg H.264 Encode

## Status

Not started

## Phase

[Phase 06 - H.264 Export](../../roadmap/phase-06-h264-export.md)

## Outcome

Processed frames can be encoded into a video-only H.264 MP4 at source resolution and frame rate.

## Scope

- Pipe processed frames into FFmpeg.
- Set MP4 container and H.264 codec.
- Set `yuv420p` pixel format.
- Preserve source resolution and frame rate.
- Exclude audio.

## Implementation Notes

- Capture FFmpeg stderr and exit code.
- Use quality presets mapped from draft, standard, and high.
- Validate encoder availability before showing export as available.

## Acceptance Criteria

- Output file codec is H.264.
- Output container is MP4.
- Output has no audio stream.
- Output frame rate and dimensions match source metadata.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None

