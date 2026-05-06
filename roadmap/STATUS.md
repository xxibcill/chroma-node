# Roadmap Status

## Current Phase

- Phase: Phase 22 - Commercial Readiness and Growth Platform
- Status: Not Started (5 tasks)
- Last updated: 2026-05-05

## Completed Phases

| Phase | Status | Verified |
|-------|--------|----------|
| 00–11 | Complete | 2026-04-26 |
| 12 | 8/10 complete (P12-T2 wheel UI deferred, P12-T6 handle editing deferred) | 2026-05-04 |
| 13 | Not Started (0/7) | 2026-05-04 |
| 14–21 | Complete | 2026-05-05 |

## Active Decisions

| Decision | Current Position | Notes |
| --- | --- | --- |
| Desktop shell | Electron | Matches the MVP architecture recommendation. |
| UI stack | React + TypeScript | Keeps the learning app inspectable and accessible to a solo developer. |
| Render path | WebGL2 | Required for shader-based node evaluation. |
| Media backend | Local or bundled FFmpeg | Phase 00 verifies local discovery; packaging can add bundled binaries later. |
| Color space | Rec.709 SDR today; Phases 13-14 planned | Current implementation remains Rec.709 SDR. Phases 13-14 scope Apple Log, profile-aware color management, HDR, ACES/OCIO-style workflows, and delivery conformance. |
| Geometry model | Add coded vs display raster fields | Vertical and rotated media should stop relying on ad hoc width/height swaps. |
| Audio handling | Source audio passthrough with stream copy | Audio re-encoding out of scope for Phase 11. |
| Additional codecs | HEVC, ProRes, VP9 supported | Encoder availability validated at export start. |
| Image sequence export | PNG sequence output with graded frames | Naming pattern: `-seq-%04d.png` |

## Open Questions

| Question | Owner | Status |
| --- | --- | --- |
| Should packaging target macOS only for the first MVP build? | TBD | Open |
| Which FFmpeg distribution will be bundled? | TBD | Deferred to packaging. |
| Should project files use `.chroma-node.json` or plain `.json`? | TBD | Open |
| Should export presets default to fit, crop, or pad when aspect ratios differ? | TBD | Open |
| How far should the first high-resolution pass go beyond 1080p before proxy preview becomes mandatory? | TBD | Open |
| Which Apple Log reference transform should verify Phase 13? | TBD | Open |
| Which camera log profiles should be supported first after Apple Log? | TBD | Open |
| Which scope families should be visible in the default workspace versus advanced presets? | TBD | Open |
| Which Color page layout presets should ship by default? | TBD | Open |
| What exact launch audience should the product optimize for first: color learners, solo creators, small studios, or educators? | TBD | Planned for Phase 22 |
| Which AI features should run fully local versus require cloud provider configuration? | TBD | Planned for Phase 19 |
| Should marketplace-style asset distribution start as first-party packs only before third-party creator packs? | TBD | Planned for Phase 20 |
| Which paid model should launch first: one-time license, subscription, paid packs, or hybrid? | TBD | Planned for Phase 22 |

## Cross-Phase Risks

| Risk | Mitigation | Status |
| --- | --- | --- |
| Preview/export mismatch | Reuse the shared color engine for preview shader generation and export frame evaluation. | Mitigated |
| Frame-accurate seeking | Use FFmpeg for exact frame access and HTML video only for preview playback. | Open |
| Geometry mismatches across preview, scopes, tracking, and export | Centralize display-space metadata and geometry helpers before adding new output sizes. | Open |
| WebGL readback export speed | Add proxy preview and profile larger rasters before removing practical limits. | Open |
| Tracking instability | Use confidence thresholds and stop instead of writing bad keyframes. | Open |
| Color-managed preview/export mismatch | Keep input, working, output, tone, and gamut transforms in shared CPU/GLSL-parity code. | Planned for Phase 13 |
| Advanced color management overload | Separate beginner defaults from expert controls through profile presets, validation, and progressive disclosure. | Planned for Phases 14 and 16 |
| Scope suite performance and clutter | Centralize scope sampling/cache policy and expose scopes through workspace presets instead of one crowded panel. | Planned for Phase 15 |
| Strong features without activation | Add first-run samples, lessons, recipes, and practice targets so users reach value quickly. | Planned for Phase 18 |
| AI opacity and privacy concerns | Keep AI suggestions editable, explainable, opt-in, and functional in degraded/offline mode. | Planned for Phase 19 |
| Asset-pack trust and compatibility | Validate library packs, profile compatibility, schema versions, and trust labels before apply. | Planned for Phase 20 |
| Commercial launch without support loop | Add licensing, signed updates, telemetry consent, support bundles, crash diagnostics, and launch metrics. | Planned for Phase 22 |

## CI Policy

CI runs on `main` and all `upgrade/phase-*` branches.

| Job | Required | Trigger |
| --- | --- | --- |
| `verify` | Yes | All pushes |
| `e2e-smoke` | No (optional) | Runs after `verify` passes |

Required checks for phase/task completion: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Optional checks (log in verification log when run): `npm run test:e2e`, `npm run test:phaseXX`.

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
| 2026-04-26 | Phase 11 | `npm run typecheck` and `npm run build`. | Passed |
| 2026-04-26 | Phase 11-T1 | Audio passthrough with correct stream index detection. | Passed |
| 2026-04-26 | Phase 11-T2 | HEVC/ProRes/VP9 codec paths with encoder availability checks. | Passed |
| 2026-04-26 | Phase 11-T3 | Still frame and image sequence export IPC handlers. | Passed |
| 2026-04-26 | Phase 11-T4 | Workflow presets (review/social/archive) wired to codec, quality, audio. | Passed |
| 2026-04-26 | Phase 11-T5 | Delivery compatibility matrix documented in `docs/delivery-compatibility.md`. | Passed |
| 2026-04-26 | Phase 10 | All 5 tasks COMPLETE. Proxy policy, frame cache, scope perf, profiling, docs. | Passed |
| 2026-04-26 | Phase 09 | All 5 tasks COMPLETE. Export schema/presets, fit/crop/pad pipeline, UI, validation, tests. | Passed |
| 2026-05-04 | Roadmap extension | Added Phase 13 and task breakdown for Apple Log and advanced color management. | Planned |
| 2026-05-05 | Roadmap extension | Added Phases 14-16 for ultimate color management, professional scopes, and Color page usability. | Planned |
| 2026-05-05 | Roadmap extension | Added Phases 18-22 for guided learning, AI assistance, look library and marketplace foundation, professional review, and commercial readiness. | Planned |
| 2026-05-05 | Phase 14 | All 8 tasks COMPLETE. Profile registry, camera log transforms, ACES workflows, HDR/gamut, LUT management, display simulation, delivery conformance, color science tests. | Passed |
| 2026-05-05 | Phase 15 | All 8 tasks COMPLETE. Scope engine, waveform, parade, vectorscope, histogram, CIE gamut, false color, performance validation. | Passed |
| 2026-05-05 | Phase 16 | All 7 tasks COMPLETE. Workstation shell, workspace presets, grading ergonomics, node navigation, shortcuts, status warnings, accessibility validation. | Passed |
| 2026-05-05 | Phase 17 | All 6 tasks COMPLETE. Color pipeline contract, split renderer workflows, export boundary, centralized media geometry, e2e repair, CI coverage. | Passed |
| 2026-05-05 | Phase 18 | All 5 tasks COMPLETE. Sample projects, interactive lessons, grade recipes, practice targets, learning progress. | Passed |
| 2026-05-05 | Phase 19 | All 5 tasks COMPLETE. Auto balance, reference matching, natural language intent, explainable AI, safety controls. | Passed |
| 2026-05-05 | Phase 20 | All 5 tasks COMPLETE. Local look library, pack import/export, browser search, compatibility checking, marketplace foundation. | Passed |
| 2026-05-05 | Phase 21 | All 5 tasks COMPLETE. Grade versions with approval states, frame-accurate annotations, review package export, feedback import, project handoff/archive. | Passed |
| 2026-05-05 | Phase 22 | All 5 tasks NOT_FOUND. Licensing, packaging, telemetry, support, launch docs not implemented. | Not Started |
