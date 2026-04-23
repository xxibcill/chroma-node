# Phase 06 - H.264 Export

## Status

Done

## Functional Feature Outcome

The user can export the full graded clip as a video-only H.264 MP4 that reflects the current node graph, masks, and tracking data.

## Why This Phase Exists

Export completes the end-to-end learning pipeline from source media through grading graph to encoded output. This phase also proves that preview logic is not only UI decoration but a reproducible image-processing pipeline.

## Scope

- Snapshot project state for export.
- Decode source frames with FFmpeg.
- Apply the same color engine as preview.
- Encode H.264 MP4 with no audio.
- Show progress and support cancellation.

## Tasks

| Task | Summary |
| --- | --- |
| [P6-T1](../tasks/phase-06/p6-t1-export-job-model.md) | Define export job state, settings, snapshotting, and validation. |
| [P6-T2](../tasks/phase-06/p6-t2-offscreen-render-export.md) | Render graded frames offscreen using the preview color engine. |
| [P6-T3](../tasks/phase-06/p6-t3-ffmpeg-h264-encode.md) | Pipe processed frames into FFmpeg H.264 MP4 encoding. |
| [P6-T4](../tasks/phase-06/p6-t4-export-progress-cancel.md) | Add progress reporting, cancellation, and partial-file cleanup. |
| [P6-T5](../tasks/phase-06/p6-t5-export-validation.md) | Validate exported frame count, resolution, codec, and visual parity. |

## Dependencies

- Phase 05 is complete if tracked windows must export correctly.
- FFmpeg encode path is available.
- Preview color engine can run in an offscreen export context.

## Exit Criteria

- Exported MP4 has source resolution and frame rate.
- Export contains no audio.
- Export reflects nodes, qualifiers, windows, and tracking.
- Cancellation cleans up incomplete output.
- Existing files are not overwritten without confirmation.
