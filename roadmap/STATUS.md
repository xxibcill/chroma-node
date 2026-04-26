# Roadmap Status

## Current Phase

- Phase: Phase 08 - Media Geometry and Vertical Video
- Status: Not started
- Last updated: 2026-04-25

## Active Decisions

| Decision | Current Position | Notes |
| --- | --- | --- |
| Desktop shell | Electron | Matches the MVP architecture recommendation. |
| UI stack | React + TypeScript | Keeps the learning app inspectable and accessible to a solo developer. |
| Render path | WebGL2 | Required for shader-based node evaluation. |
| Media backend | Local or bundled FFmpeg | Phase 00 verifies local discovery; packaging can add bundled binaries later. |
| Color space | Rec.709 SDR | Advanced color management is out of scope. |
| Geometry model | Add coded vs display raster fields | Vertical and rotated media should stop relying on ad hoc width/height swaps. |

## Open Questions

| Question | Owner | Status |
| --- | --- | --- |
| Should packaging target macOS only for the first MVP build? | TBD | Open |
| Which FFmpeg distribution will be bundled? | TBD | Deferred to packaging. |
| Should project files use `.chroma-node.json` or plain `.json`? | TBD | Open |
| Should export presets default to fit, crop, or pad when aspect ratios differ? | TBD | Open |
| How far should the first high-resolution pass go beyond 1080p before proxy preview becomes mandatory? | TBD | Open |

## Cross-Phase Risks

| Risk | Mitigation | Status |
| --- | --- | --- |
| Preview/export mismatch | Reuse the shared color engine for preview shader generation and export frame evaluation. | Mitigated |
| Frame-accurate seeking | Use FFmpeg for exact frame access and HTML video only for preview playback. | Open |
| Geometry mismatches across preview, scopes, tracking, and export | Centralize display-space metadata and geometry helpers before adding new output sizes. | Open |
| WebGL readback export speed | Add proxy preview and profile larger rasters before removing practical limits. | Open |
| Tracking instability | Use confidence thresholds and stop instead of writing bad keyframes. | Open |

## Verification Log

| Date | Phase/Task | Verification | Result |
| --- | --- | --- | --- |
| 2026-04-22 | Roadmap setup | Created phase and task tracking files. | Pending review |
| 2026-04-22 | Phase 00 | `npm run dev` launch check. | Passed |
| 2026-04-22 | Phase 00 | `npm run test:phase00` unit, build, FFmpeg, probe, frame, and export verification. | Passed |
| 2026-04-22 | Phase 01 | `npm run test:phase01` unit, build, supported import/probe, exact first/last frame decode, and rejection verification. | Passed |
| 2026-04-22 | Phase 02 | `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. | Passed |
| 2026-04-22 | Phase 03 | `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. | Passed |
| 2026-04-22 | Phase 04 | `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`. | Passed |
| 2026-04-22 | Phase 05 | `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, and `npm run test:phase05`. | Passed |
| 2026-04-23 | Phase 06 | `npm run test:phase06`, `npm run lint`, and a real FFmpeg export smoke test. | Passed |
| 2026-04-25 | Roadmap extension | Added Phases 08-11 and task breakdowns for vertical video, export geometry, performance, and delivery expansion. | Planned |
