# Roadmap Status

## Current Phase

- Phase: Phase 04 - Waveform and Vectorscope
- Status: Done
- Last updated: 2026-04-22

## Active Decisions

| Decision | Current Position | Notes |
| --- | --- | --- |
| Desktop shell | Electron | Matches the MVP architecture recommendation. |
| UI stack | React + TypeScript | Keeps the learning app inspectable and accessible to a solo developer. |
| Render path | WebGL2 | Required for shader-based node evaluation. |
| Media backend | Local or bundled FFmpeg | Phase 00 verifies local discovery; packaging can add bundled binaries later. |
| Color space | Rec.709 SDR | Advanced color management is out of scope. |

## Open Questions

| Question | Owner | Status |
| --- | --- | --- |
| Should packaging target macOS only for the first MVP build? | TBD | Open |
| Which FFmpeg distribution will be bundled? | TBD | Deferred to packaging. |
| Should project files use `.chroma-node.json` or plain `.json`? | TBD | Open |

## Cross-Phase Risks

| Risk | Mitigation | Status |
| --- | --- | --- |
| Preview/export mismatch | Generate preview and export shaders from the same color engine. | Open |
| Frame-accurate seeking | Use FFmpeg for exact frame access and HTML video only for preview playback. | Open |
| WebGL readback export speed | Keep clips short and 1080p max; profile early. | Open |
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
