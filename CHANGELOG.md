# Changelog

All notable changes to this project will be documented in this file.

## [2026-04-26] - Phase 11: Format and Delivery Expansion Complete

- P11-T1: Audio passthrough with stream copy and audio index detection from source media
- P11-T2: Additional codec paths (HEVC/libx265, ProRes/prores_ks, VP9/libvpx-vp9) with encoder availability checks
- P11-T3: Still frame export to PNG and image sequence export with `-seq-%04d.png` naming pattern
- P11-T4: Workflow presets (review/social/archive) wired to codec, quality, and audio settings
- P11-T5: Delivery compatibility matrix documented in docs/delivery-compatibility.md

Expanded delivery surface: audio retention, multiple codecs/containers, still/sequence export, workflow presets.

## [2026-04-26] - Phase 10: High-Resolution Preview and Performance Complete

- P10-T1: Preview proxy policy with 1920px threshold, 1280px proxy max, user-facing PROXY indicator
- P10-T2: Frame decode and cache tuning with bounded preview/tracking caches, TTL, and LRU eviction
- P10-T3: Scope sampling adaptation by playback state and resolution (paused 1280px, playback 640px)
- P10-T4: Export throughput profiling with size matrix (1080p–8K) and formatProfileReport()
- P10-T5: Performance guardrails and large-media documentation in docs/performance.md

Large-raster playback, scopes, and export remain responsive through proxy and performance work.

## [2026-04-26] - Phase 09: Flexible Export Geometry Complete

- P9-T1: Export settings schema with source/preset/custom size modes, 8 presets, and fit/crop/pad resize policies
- P9-T2: Fit/crop/pad render pipeline with transformRgbaFrame() and applyResizePolicy()
- P9-T3: Export UI with size mode selector, preset dropdown, custom inputs, resize policy selector, and live preview
- P9-T4: Export validation and job metadata with output raster dimensions in progress/result
- P9-T5: Export geometry verification tests for portrait preset from landscape source

User can export to source resolution or preset/custom aspect ratios with explicit fit, crop, or pad behavior.

## [2026-04-25] - Phase 07: Hardening and Packaging Complete

- P7-T1: Undo/Redo system with history state, 300ms coalescing, bounded memory
- P7-T2: Error handling and media relink with structured AppError types
- P7-T3: Automated test suite with vitest unit tests and Playwright e2e tests
- P7-T4: Performance pass infrastructure with targets documented in docs/performance.md
- P7-T5: Packaging and release with macOS DMG target, release/mac-arm64/Chroma Node.app built

## [2026-04-24] - Phase 06: H.264 Export Complete

- P6-T1: Export job model with immutable snapshots, validated settings, and lifecycle state
- P6-T2: Offscreen render export reusing color engine shader generation
- P6-T3: FFmpeg H.264 encoding with yuv420p, source resolution/frame rate preserved
- P6-T4: Export progress display and cancel with partial output cleanup
- P6-T5: Export validation with metadata probing, codec verification, and visual comparison

Full H.264 encode pipeline complete: decode → CPU node eval → H.264 MP4 output.

## [2026-04-24] - Phase 05: Translation Tracking Complete

- P5-T1: Tracking data model with per-frame keyframes, dx/dy, and confidence
- P5-T2: Frame access for tracking worker with exact adjacent frame fetching
- P5-T3: Template matching tracker with bounded search radius and confidence threshold
- P5-T4: Tracking UI with forward/backward tracking, progress display, and cancel
- P5-T5: Tracked window playback with keyframe-based offset application

Translation-only template matching integrated into viewer and export.

## [2026-04-24] - Phase 04: Waveform and Vectorscope Complete

- P4-T1: Scope frame sampling with graded frame capture, throttled playback updates
- P4-T2: Waveform renderer with Rec.709 luma, density accumulation, grid/labels
- P4-T3: Vectorscope renderer with Y/Cb/Cr calculation, circular plotting, hue guides
- P4-T4: Scope update scheduling with debounce, throttle, and monotonically increasing request IDs

Real-time analysis scopes operational with responsive update scheduling.

## [2026-04-24] - Phase 03: Qualifier and Power Windows Complete

- P3-T1: HSL qualifier engine with circular hue distance, softness, invert
- P3-T2: Qualifier UI with enable toggle, hue/sat/lum controls, show matte mode
- P3-T3: Power window engine with ellipse/rectangle evaluation, rotation, union combining
- P3-T4: Window overlay editor with drag, resize, rotation handles, coordinate mapping
- P3-T5: Mask composition tests with CPU/shader parity and golden-frame validation

Full masking pipeline: qualifier + window union multiplied masks applied to corrections.

## [2026-04-24] - Phase 02: Color Engine and Serial Nodes Complete

- P2-T1: Project schema and state with TypeScript interfaces, validation, migration hook
- P2-T2: Color engine core with CPU reference evaluator, WebGL shader generation for 1-3 nodes
- P2-T3: Node graph UI with up to 3 serial nodes, add/delete/select/reset/enable/disable
- P2-T4: Primary controls with RGB lift/gamma/gain/offset, scalar contrast/sat/temp/tint
- P2-T5: Project save/load with atomic writes, media path reference, schema validation

Color engine with serial node evaluation operational for preview (GPU) and export (CPU).

## [2026-04-24] - Phase 01: Import, Viewer, Playback Complete

- P1-T1: Media import validation for H.264 MP4/MOV, max 1920x1080, probe on import
- P1-T2: Viewer playback controls with play/pause, frame/timecode display
- P1-T3: Frame stepping and scrubbing with boundary clamping
- P1-T4: Before/after viewer with original, graded, and split modes

Media import and preview playback fully functional.

## [2026-04-24] - Phase 00: Technical Foundation Complete

- P0-T1: App shell with Electron + React + TypeScript, typed IPC handlers
- P0-T2: FFmpeg/FFprobe discovery and metadata probing with JSON output
- P0-T3: WebGL2 frame rendering with neutral shader pass and aspect-ratio preservation
- P0-T4: Export spike with H.264 MP4 encoding, yuv420p pixel format

Technical foundation established: Electron shell, FFmpeg integration, WebGL2 preview, H.264 export pipeline.

---

## MVP Complete

Phases 00-06 represent the completed MVP feature set. Phase 07 (hardening, packaging, release) has not been started.
