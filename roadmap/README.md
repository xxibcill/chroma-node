# Chroma Node MVP Roadmap

This roadmap breaks the DaVinci Resolve-inspired Color page learning app into implementation phases. Each phase follows `PHASE-TEMPLATE.md` and links to task-level Markdown files that can be checked off as work progresses.

## Progress Summary

| Phase | Status | Outcome |
| --- | --- | --- |
| [Phase 00 - Technical Foundation](phase-00-technical-foundation.md) | Done | Prove the app shell, FFmpeg integration, WebGL rendering, and export approach. |
| [Phase 01 - Import, Viewer, Playback](phase-01-import-viewer-playback.md) | Done | Import one supported clip and inspect it with playback controls. |
| [Phase 02 - Color Engine and Serial Nodes](phase-02-color-engine-and-serial-nodes.md) | Not started | Grade frames with up to 3 serial nodes and primary corrections. |
| [Phase 03 - Qualifier and Power Windows](phase-03-qualifier-and-power-windows.md) | Not started | Isolate corrections with HSL qualification and simple windows. |
| [Phase 04 - Waveform and Vectorscope](phase-04-waveform-and-vectorscope.md) | Not started | Inspect the graded signal through waveform and vectorscope displays. |
| [Phase 05 - Translation Tracking](phase-05-translation-tracking.md) | Not started | Generate translation-only tracking keyframes for power windows. |
| [Phase 06 - H.264 Export](phase-06-h264-export.md) | Not started | Export the graded clip as a video-only H.264 MP4. |
| [Phase 07 - Hardening and Packaging](phase-07-hardening-and-packaging.md) | Not started | Add reliability, tests, packaging, and MVP release polish. |

## Status Values

- `Not started`: no implementation has begun.
- `In progress`: implementation is underway.
- `Blocked`: implementation cannot proceed without a decision or dependency.
- `Ready for review`: implementation is complete and needs verification.
- `Done`: acceptance criteria and phase exit criteria are met.

## Update Rules

- Update this file when a phase status changes.
- Update `STATUS.md` at least once per work session.
- Update task files as implementation progresses.
- Keep phase files focused on product outcomes and task files focused on engineering execution.
