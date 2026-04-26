# Chroma Node MVP Roadmap

This roadmap breaks the DaVinci Resolve-inspired Color page learning app into implementation phases. Each phase follows `PHASE-TEMPLATE.md` and links to task-level Markdown files that can be checked off as work progresses.

## Progress Summary

| Phase | Status | Outcome |
| --- | --- | --- |
| [Phase 00 - Technical Foundation](phase-00-technical-foundation.md) | Done | Prove the app shell, FFmpeg integration, WebGL rendering, and export approach. |
| [Phase 01 - Import, Viewer, Playback](phase-01-import-viewer-playback.md) | Done | Import one supported clip and inspect it with playback controls. |
| [Phase 02 - Color Engine and Serial Nodes](phase-02-color-engine-and-serial-nodes.md) | Done | Grade frames with up to 3 serial nodes and primary corrections. |
| [Phase 03 - Qualifier and Power Windows](phase-03-qualifier-and-power-windows.md) | Done | Isolate corrections with HSL qualification and simple windows. |
| [Phase 04 - Waveform and Vectorscope](phase-04-waveform-and-vectorscope.md) | Done | Inspect the graded signal through waveform and vectorscope displays. |
| [Phase 05 - Translation Tracking](phase-05-translation-tracking.md) | Done | Generate translation-only tracking keyframes for power windows. |
| [Phase 06 - H.264 Export](phase-06-h264-export.md) | Done | Export the graded clip as a video-only H.264 MP4. |
| [Phase 07 - Hardening and Packaging](phase-07-hardening-and-packaging.md) | Done | Add reliability, tests, packaging, and MVP release polish. |
| [Phase 08 - Media Geometry and Vertical Video](phase-08-media-geometry-and-vertical-video.md) | Not started | Support portrait, square, rotated, and larger rasters with correct display geometry. |
| [Phase 09 - Flexible Export Geometry](phase-09-flexible-export-geometry.md) | Not started | Export source-fit, cropped, padded, and preset social video sizes. |
| [Phase 10 - High-Resolution Preview and Performance](phase-10-high-resolution-preview-and-performance.md) | Not started | Keep large-raster playback, scopes, and export responsive through proxy and performance work. |
| [Phase 11 - Format and Delivery Expansion](phase-11-format-and-delivery-expansion.md) | Not started | Expand delivery options with audio, more outputs, and broader publishing workflows. |

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
