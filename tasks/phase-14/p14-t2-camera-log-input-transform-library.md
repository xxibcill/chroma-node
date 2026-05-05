# [P14-T2] Camera Log Input Transform Library

## Status

Implemented - Completed

Not started

## Phase

[Phase 14 - Ultimate Color Management Expansion](../../roadmap/phase-14-ultimate-color-management-expansion.md)

## Outcome

Add a validated library of common camera log input transforms so footage from major camera ecosystems can enter the managed pipeline predictably.

## Scope

- Add profile entries for Apple Log, ARRI LogC3/LogC4, Sony S-Log2/S-Log3, Canon C-Log/C-Log2/C-Log3, Panasonic V-Log, RED Log3G10, Blackmagic Film Gen 5, DJI D-Log, GoPro Protune, Rec.2020 HLG, and Rec.2020 PQ where validation material is available.
- Support automatic detection when metadata is reliable and manual override when metadata is incomplete.
- Add transform provenance fields for formulas, official LUTs, or reference documents.
- Add sample-vector tests for each implemented input transform.

## Implementation Notes

- Treat unsupported profiles as visible planned options, not silent approximations.
- Do not implement a camera log curve from memory or visual matching alone.
- Keep gamut conversion separate from transfer-function decode.
- Add each log profile behind tests rather than landing a large unverified batch.

## Acceptance Criteria

- Every enabled camera profile has documented provenance and reference tests.
- Manual override can force a supported profile when metadata is missing.
- Unknown camera metadata produces a warning and a safe default decision.
- Rec.709 and Apple Log behavior from Phase 13 remain unchanged.

## Progress

- [ ] Not started
- [ ] In progress
- [ ] Implemented
- [ ] Verified

## Blockers

- Official or otherwise validated reference material is required for each camera log transform before it can be marked supported.
