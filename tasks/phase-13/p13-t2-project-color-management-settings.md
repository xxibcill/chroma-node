# [P13-T2] Project Color Management Settings

## Status

Not started

## Phase

[Phase 13 - Apple Log and Advanced Color Management](../../roadmap/phase-13-apple-log-and-advanced-color-management.md)

## Outcome

Add explicit project-level color-management settings that define how source pixels are interpreted, graded, displayed, and exported.

## Scope

- Add project settings for input profile, working profile, output profile, tone mapping, gamut mapping, and metadata override mode.
- Default existing and new Rec.709 projects to visually unchanged Rec.709 SDR behavior.
- Support `auto` input detection with manual overrides for incorrect or incomplete metadata.
- Validate settings during project load and emit warnings for unsupported combinations.
- Prepare schema migration so older projects open safely.

## Implementation Notes

- Keep color management separate from individual creative nodes; it should wrap the node graph rather than become another node correction by default.
- Use a conservative first set of profiles: Rec.709 SDR, Display P3, Rec.2020 HLG, Rec.2020 PQ, Apple Log, and linear working variants needed by transforms.
- Store settings near other project-wide settings in `src/shared/project.ts`.
- Keep transform-LUT state distinct from creative node LUT state so a technical conversion cannot be accidentally reordered as a look.
- Add validation warnings when the selected input/output pair is recognized but not yet transformable.

## Acceptance Criteria

- New projects receive explicit color-management defaults.
- Old project files migrate to Rec.709 SDR defaults without changing their grade appearance.
- Manual input override can be represented in project state even when metadata says `unknown`.
- Invalid settings are defaulted or rejected with project validation warnings.
- Tests cover default creation, migration, serialization, and validation of supported and unsupported combinations.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- None
