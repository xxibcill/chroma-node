# [P18-T3] Grade Recipes And Node Starters

## Status

Not started

## Phase

[Phase 18 - Guided Learning and Creator Workflows](../../roadmap/phase-18-guided-learning-and-creator-workflows.md)

## Outcome

Provide transparent node starter setups that help users begin common grades without hiding how the grade works.

## Scope

- Add starter recipes for neutral balance, clean contrast, warm portrait, cool night, phone log normalization, sky isolation, and face window.
- Apply recipes as editable node states with visible labels and neutral defaults.
- Add recipe preview thumbnails where project media is available.
- Allow recipe reset or removal without damaging unrelated project settings.

## Implementation Notes

- Recipes should be project data transformations, not a separate black-box effect stack.
- Avoid cinematic look claims that cannot be validated through actual controls.
- Version recipe definitions so future changes do not break old projects.

## Acceptance Criteria

- Applying a recipe creates inspectable nodes and controls.
- Users can modify and undo recipe-applied changes.
- Recipe definitions are covered by schema and migration tests.
- Recipes behave predictably with Rec.709, Apple Log, and color-managed projects.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Color-management presets from Phases 13-14 must be stable.
