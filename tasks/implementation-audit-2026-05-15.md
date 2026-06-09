# Implementation Audit - 2026-05-15

This audit checked the task files in `tasks/` against the current codebase.

Verification run:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm test` passed: 21 test files, 326 tests.

## Summary

| Group | Complete | Partial | Not implemented |
| --- | ---: | ---: | ---: |
| Pre-Phase 09 refactor | 2 | 4 | 0 |
| Phase 21 review/collaboration | 0 | 5 | 0 |
| Phase 22 commercial readiness | 0 | 5 | 0 |
| Total | 2 | 14 | 0 |

## Complete

| Task | Evidence |
| --- | --- |
| `PRE-P9-T2` Export Geometry Schema And Contracts | `ProjectExportSettings` has explicit source/preset/custom geometry fields and resize policy; defaults are validated through project schema handling. |
| `PRE-P9-T6` Geometry And Export Planning Tests | Direct unit coverage exists for shared geometry and export planning, and this audit updates the stale task tracking notes. |

## Partial

| Task | Main Remaining Work |
| --- | --- |
| `PRE-P9-T1` Shared Media Geometry Foundation | Remove duplicated geometry logic from `src/shared/ipc.ts` and `src/renderer/App.tsx`; consolidate renderer consumers onto shared/testable helpers. |
| `PRE-P9-T3` Export Pipeline Modularization | Reduce `src/main/exportProject.ts` to a thinner coordinator; move frame transforms, FFmpeg orchestration, probing, and validation into focused owners. |
| `PRE-P9-T4` Export Workflow UI Extraction | Wire `ExportProgressPanel`, `ExportSummary`, and `useExport` into `App.tsx`; move export orchestration state out of the root component. |
| `PRE-P9-T5` Viewer And Overlay Geometry Extraction | Use `src/renderer/viewer/viewerGeometry.ts` from the root viewer/overlay flow and add direct tests. |
| `P21-T1` Grade Versions And Approval States | Add renderer workflows, expose missing snapshot/status helpers through IPC, and add store-level tests. |
| `P21-T2` Annotations And Review Notes | Add annotation UI, viewer overlays, hide/filter/resolve workflows, and store/coordinate tests. |
| `P21-T3` Review Package Export | Include requested stills/scope snapshots/media, export annotations beyond frame 0, expose validation through IPC, and add package tests. |
| `P21-T4` Feedback Import And Resolution | Make IPC import merge feedback into annotations, implement duplicate strategies/conflict preview, and add renderer flow. |
| `P21-T5` Project Handoff And Archive | Implement library/export/log/cache inclusion, restore/relink behavior, package preview/estimate UI, and redaction tests. |
| `P22-T1` Licensing Trials And Entitlements | Replace placeholder activation, enforce entitlements in feature flows, track usage limits, and add license state UI. |
| `P22-T2` Production Packaging And Updates | Add signing/notarization, real update checks/download/apply/rollback, signed metadata, and release verification docs. |
| `P22-T3` Privacy Aware Telemetry And Analytics | Configure provider/export path, emit events from app flows, honor `enabled`, and test redaction/consent/retry/delete behavior. |
| `P22-T4` Support Feedback And Crash Diagnostics | Add provider/consent/retry, real logs, renderer support UI, stronger redaction, and bundle manifest tests. |
| `P22-T5` Launch Docs Pricing And Growth Experiments | Write launch docs, enforce pricing gates in UI/entitlements, persist experiment settings, and tie metrics to telemetry/reporting. |

## Not Implemented

No task file was classified as fully not implemented. Every audited task has at least schema, module, IPC, test, or UI scaffolding in the current codebase.

## Notes

- The task status blocks were stale before this audit. Individual task files now have `Status` updated to `Complete` or `Partial`, progress checkboxes adjusted, and an `Implementation Audit - 2026-05-15` section with evidence and remaining work.
- Roadmap files may still have stale phase-level status and should be reconciled separately.

## Follow-up Implementation - 2026-05-20

Additional implementation reduced several partial gaps:

- Review/version snapshot and status helpers are exposed through IPC/preload and surfaced in a compact renderer review panel.
- Frame annotations can be added and resolved from the renderer.
- Review packages now include annotations across all selected-version frames, accept supplied still/scope snapshot data, can copy source media when requested, and expose validation through IPC.
- Feedback import now merges notes into annotations with skip/replace/rename duplicate strategies and import-result reporting.
- Handoff package estimate is exposed through IPC/UI; handoff packages include known exports, redacted logs, and cache summaries.
- License activation now validates structured local license keys, export resolution/monthly limits are enforced before export, and license controls are exposed in the renderer.
- Update checks fetch configured channel metadata instead of always returning a simulated no-update result.
- Telemetry emits events from export/license/launch flows and has focused tests for disabled mode and redaction.
- Support bundles include redacted application logs and can be created from the renderer.
- Launch experiment overrides are persisted through `launchStore`.

Remaining work is still not zero: provider-backed licensing/recovery, signing/notarization, update download/apply/rollback, annotation overlay UX, richer handoff restore/relink, broader tests, launch documentation, and full pricing/entitlement coverage remain partial.

## Follow-up Implementation - 2026-06-09

Additional implementation reduced several partial gaps:

- Export geometry calculation moved to `src/shared/exportGeometry.ts`, with main export planning and renderer preflight using the same helper.
- Renderer export preflight now validates license state and export entitlements before starting an export.
- AI suggestion application now checks the `aiAssistedGrading` entitlement and leaves suggestions pending when blocked.
- Review annotations now render as viewer overlays using normalized display coordinates, and the review panel can filter/defer/reject notes.
- Telemetry flush can write to a local JSONL export sink, with retry behavior covered by tests.
- Support bundle diagnostics now apply path redaction consistently, with bundle manifest/redaction tests.
- Launch readiness documentation now covers first-grade flow, pricing gates, telemetry/manual metric review, and troubleshooting.

Remaining work is still not zero: provider-backed licensing/recovery, signing/notarization, update download/apply/rollback, direct viewer annotation drawing, richer handoff restore/relink, marketplace/pro renderer gates, broader telemetry events, and release packaging documentation remain partial.
