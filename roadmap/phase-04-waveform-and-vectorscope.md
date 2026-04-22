# Phase 04 - Waveform and Vectorscope

## Functional Feature Outcome

The user can inspect the current graded frame through waveform and vectorscope displays that update during grading and playback.

## Why This Phase Exists

Scopes are essential for learning how image adjustments affect signal distribution. This phase adds technical feedback separate from visual judgment and introduces a worker-safe analysis pipeline for the current output frame.

## Scope

- Render luma waveform from graded output.
- Render vectorscope from graded output.
- Add scope guide markings.
- Update scopes on parameter changes, scrubbing, and playback.
- Keep scope work off the main UI interaction path where possible.

## Tasks

| Task | Summary |
| --- | --- |
| [P4-T1](../tasks/phase-04/p4-t1-scope-frame-sampling.md) | Capture or sample graded frames for scope analysis. |
| [P4-T2](../tasks/phase-04/p4-t2-waveform-renderer.md) | Implement luma waveform accumulation and display. |
| [P4-T3](../tasks/phase-04/p4-t3-vectorscope-renderer.md) | Implement vectorscope accumulation, scaling, and hue guides. |
| [P4-T4](../tasks/phase-04/p4-t4-scope-update-scheduling.md) | Add debounced and throttled update scheduling. |

## Dependencies

- Phase 02 is complete.
- Graded frame output can be sampled for analysis.
- Viewer state distinguishes original, graded, split, and matte modes.

## Exit Criteria

- Waveform uses Rec.709 luma from graded output.
- Vectorscope plots chroma from graded output.
- Scopes update within performance targets while paused.
- Playback scope updates are throttled to avoid UI stalls.

