# [P21-T5] Project Handoff And Archive

## Status

Partial

## Phase

[Phase 21 - Professional Review and Collaboration](../../roadmap/phase-21-professional-review-and-collaboration.md)

## Outcome

Package projects for archive, handoff, diagnostics, and support while protecting user data.

## Scope

- Add package modes for archive with media, handoff without cache, diagnostics, and support bundle.
- Include project file, media references or copies, library dependencies, exports, logs, and environment metadata as selected.
- Add missing-media and dependency validation before packaging.
- Add import/restore flow for archive packages.

## Implementation Notes

- Keep support bundles redacted by default.
- Avoid copying media unexpectedly; show package size before creation.
- Reuse media relink and asset dependency logic.

## Acceptance Criteria

- Users can create and restore an archive package.
- Missing media and library dependencies are reported before package export.
- Support packages redact sensitive local paths unless the user opts in.
- Tests cover package manifest, restore, and missing dependency cases.

## Progress

- [ ] Not started
- [x] In progress
- [ ] Implemented
- [ ] Verified

## Implementation Audit - 2026-05-15

Status: Partial.

Evidence:
- `HandoffPackageManifest`, package modes, media refs, and checksum fields are defined in `src/shared/project.ts`.
- IPC and preload contracts expose handoff export, import, validation, and package-size estimate.
- `src/main/handoffStore.ts` writes `.chromahandoff` packages, can include project JSON, can copy source media when requested, includes known exports/log summaries/cache summaries, validates checksums, and estimates package size.
- `ReviewWorkflowPanel` exposes estimate and handoff package actions.

Remaining work:
- Library dependencies and restore media relinking are not implemented beyond manifest flags/project import.
- Redaction is basic recursive path replacement and needs verification against all package content.
- Add fuller package mode selection, restore, and missing dependency handling in the renderer.

## Blockers

- Media dependency tracking must be reliable.
