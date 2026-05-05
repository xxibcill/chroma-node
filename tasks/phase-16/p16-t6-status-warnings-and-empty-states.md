# [P16-T6] Status Warnings And Empty States

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Make media, profile, transform, scope, export, and performance states visible and recoverable without overwhelming the Color page.

## Scope

- Add compact status surfaces for media decode, color metadata, active profile, proxy preview, scope sampling, export readiness, and warnings.
- Add empty states for no media, unsupported metadata, missing LUT, missing OCIO config, unavailable HDR preview, and failed export validation.
- Add actionable warning links or buttons that focus the relevant panel.
- Add severity levels for information, warning, blocking error, and validation failure.

## Implementation Notes

- Put warnings close to the affected workflow instead of using a single global alert pile.
- Keep status text short and specific.
- Do not show advanced color warnings on neutral Rec.709 workflows unless there is a real issue.
- Use consistent visual treatment across import, viewer, scopes, color management, and export.

## Acceptance Criteria

- Users can understand whether the current grade is previewing/exporting with the intended color pipeline.
- Blocking issues explain how to recover or where to go next.
- Performance reductions such as proxy preview or reduced scope sampling are visible but not distracting.
- Tests cover warning generation, severity mapping, and panel focus actions.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Structured warning data from color management, scopes, and export must exist.
