# [P20-T2] Look Pack Import Export

## Status

Not started

## Phase

[Phase 20 - Look Library and Marketplace Foundation](../../roadmap/phase-20-look-library-and-marketplace-foundation.md)

## Outcome

Allow users to package, import, and export reusable look assets safely.

## Scope

- Define a portable pack format for looks, LUTs, recipes, references, lessons, and previews.
- Add export flow for selected library items.
- Add import flow with validation, duplicate handling, and preview before install.
- Support pack manifest checksums and optional signatures.

## Implementation Notes

- Treat imported packs as untrusted input.
- Avoid executable content in packs.
- Keep imported item IDs stable enough for updates without overwriting user edits unexpectedly.

## Acceptance Criteria

- Users can export a pack and import it into a clean install.
- Invalid, unsupported, or tampered packs are rejected safely.
- Duplicate items produce predictable merge, skip, or replace choices.
- Tests cover manifest validation and corrupt package handling.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Pack trust model must be approved.
