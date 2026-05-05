# Phase 20 - Look Library and Marketplace Foundation

## Status

Not started

## Functional Feature Outcome

The user gets a reusable look library for grades, LUTs, recipes, stills, and learning assets, with a foundation for future paid packs and creator distribution.

## Why This Phase Exists

Million-dollar potential requires compounding assets, not only one-off editing sessions. A look library lets users save and reuse their taste, while a marketplace foundation creates future revenue paths through paid looks, lessons, sample projects, and creator packs. This phase builds the local asset system first, with careful versioning and trust boundaries before any storefront.

## Scope

- Add a local library for looks, recipes, LUTs, reference stills, sample projects, and lesson packs.
- Add import/export packages for sharing assets between installs.
- Add metadata, thumbnails, compatibility checks, and versioning.
- Add trust and validation boundaries for third-party asset packs.
- Prepare marketplace-ready package structure without implementing payments yet.

## Tasks

| Task | Summary |
| --- | --- |
| [P20-T1](../tasks/phase-20/p20-t1-local-look-library.md) | Build a local library for looks, LUTs, stills, recipes, and lesson assets. |
| [P20-T2](../tasks/phase-20/p20-t2-look-pack-import-export.md) | Add signed or validated look-pack import/export. |
| [P20-T3](../tasks/phase-20/p20-t3-library-browser-and-search.md) | Add a compact browser with search, filters, thumbnails, and preview. |
| [P20-T4](../tasks/phase-20/p20-t4-asset-compatibility-and-migration.md) | Validate asset compatibility across color spaces, app versions, and schema changes. |
| [P20-T5](../tasks/phase-20/p20-t5-marketplace-package-foundation.md) | Define package metadata and trust boundaries for a future marketplace. |

## Dependencies

- Phase 12 LUT and gallery workflows exist.
- Phase 18 recipes and lessons define reusable asset formats.
- Phase 14 color-management metadata is available for compatibility checks.
- App data storage location and migration policy are stable.

## Exit Criteria

- Users can save, find, preview, apply, import, and export reusable looks.
- Asset packs are validated before they can modify project state.
- Library assets include version, profile compatibility, author, preview, and dependency metadata.
- Incompatible assets fail clearly without breaking the current project.
- The package model can support future paid distribution without redesigning local assets.
