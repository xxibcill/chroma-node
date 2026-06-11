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
| [Phase 08 - Media Geometry and Vertical Video](phase-08-media-geometry-and-vertical-video.md) | In progress | Support portrait, square, rotated, and larger rasters with correct display geometry. |
| [Phase 09 - Flexible Export Geometry](phase-09-flexible-export-geometry.md) | Done | Export source-fit, cropped, padded, and preset social video sizes. |
| [Phase 10 - High-Resolution Preview and Performance](phase-10-high-resolution-preview-and-performance.md) | Done | Keep large-raster playback, scopes, and export responsive through proxy and performance work. |
| [Phase 11 - Format and Delivery Expansion](phase-11-format-and-delivery-expansion.md) | Done | Expand delivery options with audio, more outputs, and broader publishing workflows. |
| [Phase 12 - Resolve-Style Color Page Upgrade](phase-12-resolve-style-color-page-upgrade.md) | Not started | Upgrade the Color page with Resolve-inspired layout, controls, curves, secondary tools, scopes, gallery, LUTs, and parity hardening. |
| [Phase 13 - Apple Log and Advanced Color Management](phase-13-apple-log-and-advanced-color-management.md) | Not started | Support Apple Log and broader profile-aware color management with parity-safe preview, export, metadata, and validation. |
| [Phase 14 - Ultimate Color Management Expansion](phase-14-ultimate-color-management-expansion.md) | Not started | Expand color management into camera log libraries, ACES/OCIO-style workflows, HDR, display simulation, technical LUTs, and delivery conformance. |
| [Phase 15 - Professional Scopes and Monitoring Suite](phase-15-professional-scopes-and-monitoring-suite.md) | Not started | Add a comprehensive color monitoring suite with waveform, parade, vectorscope, histogram, CIE, gamut, false-color, clipping, and HDR scopes. |
| [Phase 16 - Color Page Usability and Workflow Upgrade](phase-16-color-page-usability-and-workflow-upgrade.md) | Not started | Refine the Color page into a compact, viewer-first workstation with better panels, controls, navigation, warnings, and validation. |
| [Phase 17 - Architecture and Quality Foundation](phase-17-architecture-and-quality-foundation.md) | Not started | Deepen core architecture, centralize geometry and export boundaries, repair e2e verification, and align CI with active roadmap work. |
| [Phase 18 - Guided Learning and Creator Workflows](phase-18-guided-learning-and-creator-workflows.md) | Not started | Turn Chroma Node into a guided learning workstation with lessons, recipes, practice targets, and progress loops. |
| [Phase 19 - AI Assisted Grading and Shot Matching](phase-19-ai-assisted-grading-and-shot-matching.md) | Not started | Add explainable AI assistance for balance, diagnostics, reference matching, and natural-language grade intent. |
| [Phase 20 - Look Library and Marketplace Foundation](phase-20-look-library-and-marketplace-foundation.md) | Not started | Build reusable look, LUT, recipe, lesson, and asset-pack infrastructure for future creator packs and paid distribution. |
| [Phase 21 - Professional Review and Collaboration](phase-21-professional-review-and-collaboration.md) | Partial | Add grade versions, annotations, review packages, feedback import, and project handoff workflows. |
| [Phase 22 - Commercial Readiness and Growth Platform](phase-22-commercial-readiness-and-growth-platform.md) | Partial | Prepare the product to sell, support, update, measure, and grow with licensing, telemetry, packaging, docs, and support loops. |

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

## Phase Completion Policy

Before a phase or task can be marked **Done**, all of the following required checks must pass:

| Check | Command | Notes |
| --- | --- | --- |
| Lint | `npm run lint` | No ESLint errors or warnings. |
| Typecheck | `npm run typecheck` | TypeScript compiles without errors. |
| Unit tests | `npm test` | All Vitest tests pass. |
| Build | `npm run build` | Production build succeeds. |

The following checks are **optional** depending on phase scope. When applicable, they should be logged in `STATUS.md`:

| Check | Command | Notes |
| --- | --- | --- |
| E2E smoke | `npm run test:e2e` | Playwright browser tests; requires Playwright setup to be reliable (Phase 17 target). |
| Phase-specific export/media tests | `npm run test:phaseXX` | Phase-specific smoke scripts when they exist. |
| Package/packaging | `npm run package` | Only when packaging is in scope. |

### CI Policy

CI runs on `main` and all `upgrade/phase-*` branches. The `verify` job (lint, typecheck, unit tests, build) is required for all pushes. The `e2e-smoke` job runs after `verify` passes; if `verify` fails, e2e is skipped.

Use `upgrade/phase-*` pattern so any active development branch is covered automatically.
