# [P16-T1] Workstation Shell And Viewer First Layout

## Status

Not started

## Phase

[Phase 16 - Color Page Usability and Workflow Upgrade](../../roadmap/phase-16-color-page-usability-and-workflow-upgrade.md)

## Outcome

Rebuild the Color page shell so the viewer remains dominant while nodes, scopes, controls, and metadata stay reachable in a compact workstation layout.

## Scope

- Define stable top, viewer, node, palette, scope, and inspector regions.
- Use internal panel scrolling instead of document scrolling.
- Reduce redundant chrome, oversized headers, and nested card styling.
- Add layout density modes for laptop, desktop, and focused review.
- Preserve existing import, playback, grading, scopes, tracking, and export workflows during refactor.

## Implementation Notes

- Follow `.impeccable.md`: precise, grounded, studio-like, compact, viewer-first.
- Do not build a marketing-style dashboard or decorative shell.
- Use stable dimensions for toolbars, scopes, nodes, and compact controls so state changes do not shift the layout.
- Add Playwright viewport checks before marking layout complete.

## Acceptance Criteria

- The Color page fits within a typical laptop viewport without document scrolling.
- Viewer, nodes, primary controls, and scopes are visible or one interaction away in the default workspace.
- Panel overflow scrolls internally and does not push the viewer off-screen.
- Regression tests verify desktop and constrained viewport layout stability.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
