# Phase 17 - Architecture and Quality Foundation

## Status

Not started

## Functional Feature Outcome

The user gets a more reliable and extensible Chroma Node foundation where color, geometry, export, UI workflows, and regression tests can grow without slowing down future feature work.

## Why This Phase Exists

Chroma Node has a healthy test base and a clear roadmap, but several core areas are becoming too concentrated or too tightly coupled for the upcoming color management, scopes, and workflow phases. The largest risks are color/rendering parity drift, geometry mismatches, export complexity, an oversized renderer shell, and an e2e layer that is not yet reliable in local or CI verification. This phase turns those risks into explicit engineering work before the next feature expansion compounds them.

## Scope

- Deepen the shared color and rendering pipeline so CPU export, WebGL preview, tone mapping, LUTs, and color management share a clearer boundary.
- Split the renderer app shell into workflow-level modules for project/session state, playback, scopes, tracking, export, command search, and Color page UI.
- Consolidate export planning, process orchestration, frame rendering, resizing, audio merge, validation, cancellation, and progress behind one export service boundary.
- Centralize media geometry across import, viewer layout, overlays, scopes, tracking, and export.
- Repair and promote the e2e test layer so UI regressions are caught consistently.
- Update CI branch coverage and verification expectations for the active roadmap branches.

## Tasks

| Task | Summary |
| --- | --- |
| [P17-T1](../tasks/phase-17/p17-t1-deepen-color-rendering-module.md) | Deepen the color/rendering module around a stable pipeline boundary shared by preview and export. |
| [P17-T2](../tasks/phase-17/p17-t2-split-renderer-workflows.md) | Split `App.tsx` into workflow modules and focused UI components. |
| [P17-T3](../tasks/phase-17/p17-t3-export-service-boundary.md) | Create a single export service boundary for planning, FFmpeg orchestration, progress, validation, and cancellation. |
| [P17-T4](../tasks/phase-17/p17-t4-centralize-media-geometry.md) | Centralize display geometry, rotation, fit/crop/pad behavior, and overlay coordinate mapping. |
| [P17-T5](../tasks/phase-17/p17-t5-repair-e2e-verification.md) | Repair the Playwright e2e harness and make it reliable locally and in CI. |
| [P17-T6](../tasks/phase-17/p17-t6-update-ci-roadmap-coverage.md) | Update CI trigger coverage and verification policy for active roadmap branches. |

## Dependencies

- Current unit, lint, and typecheck suites remain passing before each refactor starts.
- Phase 08 geometry decisions are known enough to define one canonical geometry model.
- Existing color parity tests are preserved while the color/rendering boundary is deepened.
- FFmpeg remains available through local or bundled discovery for export boundary testing.
- Playwright browser installation can be made reliable in the local and CI environments.

## Exit Criteria

- Color/rendering pipeline behavior is exercised through boundary tests that cover CPU export and WebGL preview parity.
- `App.tsx` no longer owns all workflow state and rendering concerns directly.
- Export callers use a compact service interface instead of coordinating FFmpeg, rendering, audio, progress, and validation details themselves.
- A shared geometry module owns coded raster, display raster, rotation, resize policy, contained rect, and normalized overlay mapping behavior.
- Playwright e2e tests run reliably in local development and CI, with stale selectors removed or updated.
- CI runs on the active roadmap branches and documents which verification commands are required before a phase can be marked complete.
