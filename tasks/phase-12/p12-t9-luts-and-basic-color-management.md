# [P12-T9] LUTs And Basic Color Management

## Status

Not started

## Phase

[Phase 12 - Resolve-Style Color Page Upgrade](../../roadmap/phase-12-resolve-style-color-page-upgrade.md)

## Outcome

Add LUT application and simple color-space transform support without turning the learning app into a full color-management system.

## Scope

- Import and validate common LUT formats such as `.cube`.
- Apply a LUT as a node operation with adjustable intensity.
- Add built-in sample creative LUTs only if licensing and provenance are clear.
- Add simple input/output color-space transform controls for common SDR workflows.
- Surface export metadata that explains which LUTs and transforms are active.

## Implementation Notes

- Parse LUT files into structured lookup data and validate size, domain, and malformed values.
- Keep LUT references portable across project save/open where possible.
- Do not silently bake unsupported LUTs into project state; report missing or invalid assets clearly.
- Keep the first color-management pass intentionally narrow, likely Rec.709 SDR-centered.

## Acceptance Criteria

- Users can import a valid LUT, apply it to a node, adjust intensity, and remove it.
- Invalid or missing LUT files produce clear recoverable errors.
- Preview and export apply LUTs and basic transforms consistently.
- Project save/open preserves LUT references and reports relink needs when assets move.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- LUT storage and relink behavior need a product decision before implementation.
