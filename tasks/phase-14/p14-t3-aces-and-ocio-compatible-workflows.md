# [P14-T3] ACES And OCIO Compatible Workflows

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Add ACES/OCIO-style workflow concepts so advanced users can reason about IDTs, working spaces, view transforms, looks, and output transforms inside Chroma Node.

## Scope

- Model ACES-style input, working, view, look, and output stages.
- Add ACEScct or ACEScg working-space options if transform validation is available.
- Add optional hooks for OpenColorIO config loading without making OCIO required for the default app.
- Preserve a simple app-managed workflow for learners who do not use ACES.

## Implementation Notes

- Keep the internal project model independent from any one OCIO config format.
- Treat OCIO as an optional external transform provider, not the only way color management works.
- Keep UI labels clear enough that users can understand whether they are using app-managed or OCIO-managed transforms.
- Add import/export safeguards so projects remain portable when an external OCIO config is missing.

## Acceptance Criteria

- The project model can represent ACES/OCIO-style stages.
- App-managed Rec.709 and camera-log workflows continue to work without OCIO.
- Missing external config files produce recoverable project warnings.
- Tests cover project serialization, missing-config handling, and transform-stage ordering.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Product decision needed on whether OCIO support is bundled, optional, or config-only.
