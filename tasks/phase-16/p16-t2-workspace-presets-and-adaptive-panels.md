# [P16-T2] Workspace Presets And Adaptive Panels

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Add workspace presets and adaptive panels so users can move between grading, scopes, color management, compare, and export-check workflows without panel clutter.

## Scope

- Add workspace presets: Grade, Scopes, Color Management, Compare, Export Check, and Debug/Learning.
- Add resizable or collapsible panel regions with sensible minimum sizes.
- Add saved panel preferences where persistence does not create migration risk.
- Add quick actions for focusing the viewer, scopes, node graph, or active controls.

## Implementation Notes

- Presets should reconfigure panel emphasis, not navigate to separate pages.
- Avoid hiding critical controls on small screens; adapt density and panel priority instead.
- Keep the default preset simple enough for new users.
- Do not expose unfinished advanced panels as empty tabs.

## Acceptance Criteria

- Users can switch workspace presets without losing the current frame, selected node, or active settings.
- The Scopes and Color Management presets expose advanced tools without crowding the default Grade preset.
- Panel state is predictable after project open and app restart if persistence is implemented.
- Tests cover preset switching and viewport-fit behavior.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Panel persistence policy must be decided before saved layouts are implemented.
