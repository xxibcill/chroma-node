# [P20-T4] Asset Compatibility And Migration

## Status

Not started

## Phase

[Phase 20 - Look Library and Marketplace Foundation](../../roadmap/phase-20-look-library-and-marketplace-foundation.md)

## Outcome

Protect users from broken looks by validating asset compatibility across color spaces, app versions, and schema changes.

## Scope

- Add compatibility metadata for app version, project schema, color profiles, LUT formats, and lesson requirements.
- Add migration paths for old library items where safe.
- Add warnings for partial compatibility and unsupported dependencies.
- Add fixture packs for compatibility regression tests.

## Implementation Notes

- Never silently apply a look designed for a different color-management context.
- Keep migration explicit and reversible when item data changes.
- Make compatibility checks reusable by import, browser, and apply flows.

## Acceptance Criteria

- Incompatible assets cannot be applied without a clear warning or conversion.
- Compatible old items migrate through tested paths.
- Import, browser, and apply flows use the same compatibility checker.
- Tests cover profile mismatch, schema mismatch, and missing dependency cases.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Color-management profile identifiers must be stable.
