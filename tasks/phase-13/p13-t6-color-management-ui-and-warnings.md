# [P13-T6] Color Management UI And Warnings

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Give users clear controls for detected color metadata, manual input overrides, output intent, and recoverable color-management warnings.

## Scope

- Add a Color Management panel or inspector section for detected source metadata.
- Add input profile controls with `Auto`, `Rec.709 SDR`, `Display P3`, `Rec.2020 HLG`, `Rec.2020 PQ`, and `Apple Log`.
- Add working/output controls appropriate to the supported transform set.
- Add warnings for unknown metadata, unsupported transform combinations, and output metadata mismatches.
- Surface active color-management decisions in export summary and project status UI.

## Implementation Notes

- Keep controls compact and operational; this is a grading tool, not a color-management tutorial page.
- Use detected metadata as evidence, but let the user override when camera/container tags are wrong.
- Show warnings close to the affected workflow: import, viewer, color panel, and export.
- Avoid presenting profiles that cannot be transformed yet unless they are clearly disabled or marked unsupported.
- Preserve the current Rec.709 default path so users who never touch color management are not forced through extra decisions.

## Acceptance Criteria

- Users can see the detected source color profile after import.
- Users can manually assign Apple Log when automatic detection is unavailable.
- Unsupported or unknown metadata creates a visible warning and does not silently produce managed output.
- Export UI shows the intended output profile and metadata.
- Existing projects and Rec.709 clips keep a low-friction default workflow.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
