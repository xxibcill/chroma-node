# Phase 11 - Format and Delivery Expansion

## Status

Not started

## Functional Feature Outcome

The user can deliver graded output through broader publishing workflows, including retained audio and additional export targets beyond the current video-only H.264 MP4 path.

## Why This Phase Exists

After geometry and performance are solved, the next layer of product value is delivery flexibility. Users will want exports that fit actual publishing workflows, not just a silent MP4 at one codec path. This phase expands the app from a grading sandbox into a more useful delivery tool while keeping the grading model intact.

## Scope

- Preserve or copy through source audio where appropriate.
- Expand supported delivery formats and codecs intentionally.
- Support still or image-sequence output for inspection and iteration.
- Add workflow-oriented export presets for common publishing targets.
- Document compatibility limits and regression coverage for expanded delivery options.

## Tasks

| Task | Summary |
| --- | --- |
| [P11-T1](../tasks/phase-11/p11-t1-audio-passthrough.md) | Preserve compatible source audio during export. |
| [P11-T2](../tasks/phase-11/p11-t2-additional-codec-and-container-paths.md) | Add selected new output codec and container paths. |
| [P11-T3](../tasks/phase-11/p11-t3-still-and-image-sequence-export.md) | Add still frame and image-sequence export modes. |
| [P11-T4](../tasks/phase-11/p11-t4-delivery-presets-and-workflows.md) | Add workflow presets for common social and review deliveries. |
| [P11-T5](../tasks/phase-11/p11-t5-delivery-compatibility-matrix.md) | Verify and document compatibility for the expanded delivery surface. |

## Dependencies

- Phases 08 through 10 are complete.
- FFmpeg capabilities for chosen codecs and containers are available.
- Export settings and UI can absorb additional delivery options without becoming ambiguous.

## Exit Criteria

- Export can preserve compatible source audio.
- At least one additional delivery path beyond silent H.264 MP4 is supported.
- Still or image-sequence output is available for inspection workflows.
- Compatibility and regression coverage are documented for the new delivery surface.
