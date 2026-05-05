# Changelog

All notable changes to this project will be documented in this file.

## [2026-05-05] - Phase 20: Look Library and Marketplace Foundation Complete

- P20-T1: Local look library with LibraryItem schema (look/lut/recipe/still/sample-project/lesson-pack types), LibraryBrowser component
- P20-T2: Look pack import/export with .chromapack format, createPackFromItems(), parsePackContent(), exportPack() IPC
- P20-T3: Library browser with search, type filter, favorites, sort by name/created/updated, compatibility checking
- P20-T4: Asset compatibility and migration via checkLibraryItemCompatibility() with version/profile validation and quarantine
- P20-T5: Marketplace package foundation with trust levels (first-party/verified-creator/local), pack manifest validation

Local look library operational with pack import/export and marketplace foundation.

## [2026-05-05] - Phase 19: AI Assisted Grading and Shot Matching Complete

- P19-T1: Auto balance and diagnostics via analyzeFrame() measuring exposure zones, RGB levels, saturation, white balance, contrast; generateAutoBalanceSuggestions() produces primary correction nodes
- P19-T2: Reference shot matching via matchToReference() analyzing source/reference frames, computing luma/chroma/contrast deltas
- P19-T3: Natural language grade intent parsing 12 intent actions (warmer, cooler, softer, contrasty, moodier, brighter, darker, less/more saturated, cleaner-whites, punchier, desaturated-look)
- P19-T4: Explainable AI review with metadata reason, confidence, risk, and changedControls[] with before/after values
- P19-T5: AI safety, privacy, cost controls via AiSettings (offline/cloud-assisted mode, request budget, telemetry consent, timeout, degraded fallback)

AI-assisted grading with auto-balance, reference matching, natural language intent, and safety controls.

## [2026-05-05] - Phase 18: Guided Learning and Creator Workflows Complete

- P18-T1: First run sample projects with sample-project LibraryItem type and SampleProjectData schema
- P18-T2: Interactive color lessons with 9 COLOR_LESSONS (exposure, white-balance, contrast, saturation, skin-tone, secondaries, tracking, scopes, export-check), step-by-step instruction and milestone detection
- P18-T3: Grade recipes and node starters with 7 GRADE_RECIPES (neutral-balance, clean-contrast, warm-portrait, cool-night, phone-log-normalization, sky-isolation, face-window) each with nodes, compatible profiles, and tags
- P18-T4: Practice targets and scope goals with 3 DEFAULT_PRACTICE_TARGETS (legal-delivery, skin-tone-standard, balanced-exposure) and scorePracticeTarget() evaluation
- P18-T5: Learning progress and review with LearningProgress interface tracking lessonsCompleted, lessonAttempts, practiceAttempts, savedLooks

Guided learning system operational with lessons, recipes, practice targets, and progress tracking.

## [2026-05-05] - Phase 17: Architecture and Quality Foundation Complete

- P17-T1: Deepened color rendering module via colorPipeline.ts public contract (ResolvedPipeline, PipelineInput) separating preview and export from color management decisions
- P17-T2: Split renderer workflows with GPU shaders for preview, CPU evaluation for export, both through shared color pipeline
- P17-T3: Export service boundary with exportProject receiving pipeline settings via resolvePipeline() without owning color management decisions
- P17-T4: Centralized media geometry via mediaGeometry.ts (getDisplaySize, normalizeRotation, isRotated, MAX_DISPLAY_WIDTH=3840, MAX_DISPLAY_HEIGHT=2160) used by preview, export, and tracking
- P17-T5: Repaired e2e verification with updated Playwright config and stable selectors
- P17-T6: Updated CI roadmap coverage with verify job on all branches, e2e-smoke as optional job

Architecture clarified with explicit color pipeline contract and centralized media geometry.

## [2026-05-05] - Phase 16: Color Page Usability and Workflow Upgrade Complete

- P16-T1: Workstation shell with dominant viewer, compact panels, internal scrolling fitting typical laptop viewport
- P16-T2: Workspace presets and adaptive panels for Color, Review, Export modes
- P16-T3: Grading control ergonomics via LearningPanel (recipe application, lesson interaction) and LibraryBrowser (look browsing)
- P16-T4: Node grade and shot navigation with node strip (Copy/Paste/Duplicate/Bypass/Delete)
- P16-T5: Command shortcuts and undo workflows via keyboard event handlers and project state management
- P16-T6: Status warnings and empty states for proxy mode, playback, export progress, no-media scenarios
- P16-T7: Accessibility and usability validation via Playwright e2e regression checks

Color page workstation layout optimized for laptop viewport with adaptive panels and keyboard shortcuts.

## [2026-05-05] - Phase 15: Professional Scopes and Monitoring Suite Complete

- P15-T1: Scope engine and measurement model via getScopeMaxWidth(), getPreviewPolicy(), scope capability metadata in previewPolicy.ts
- P15-T2: Waveform family with waveform.ts rendering, createWaveformImageData(), YUV and RGB modes
- P15-T3: Parade family via parade.ts with createRgbParadeImageData() and RGB parade rendering
- P15-T4: Vectorscope and chroma tools with vectorscope.ts rendering, skin tone line overlay, I/Q axes
- P15-T5: Histogram levels and distribution scopes via histogram.ts (createRgbHistogram, createRgbParadeHistogram, createLuminanceHistogram)
- P15-T6: CIE gamut and 3D color visualization with isOutOfGamut() and gamut boundary checking
- P15-T7: Exposure false color and clipping monitors via falseColor.ts and analyzeFrame() clipping detection
- P15-T8: Scope layouts performance and validation via adaptive scope sampling by playback state and resolution

Professional scope suite complete with waveform, parade, vectorscope, histogram, CIE gamut, and false color.

## [2026-05-05] - Phase 14: Ultimate Color Management Expansion Complete

- P14-T1: Profile registry and transform graph with COLORSPACES registry (20+ color spaces) in colorEngine.ts and ResolvedPipeline/PipelineInput in colorPipeline.ts
- P14-T2: Camera log input transform library with decodeTransfer()/encodeTransfer() for appleLog2, sLog3, LogC, HLG, pq variants
- P14-T3: ACES and OCIO compatible workflows via buildPrimariesConversionMatrixByType() and ACES path in evaluateNodeGraph()
- P14-T4: HDR wide gamut and display rendering via toneMapSdr(), compressGamut(), ToneMappingMode, GamutMappingMode, sourceIsHdr flag
- P14-T5: Technical LUT management via parseCubeLut() with size validation and trilinear application
- P14-T6: Display simulation and calibration awareness via displaySimulation in generateColorFragmentShader() and toDisplayPrimaries matrix
- P14-T7: Delivery conformance and metadata validation via validateExportGeometry() and project schema ExportSettings
- P14-T8: Color science reference validation via colorEngine.parity.test.ts verifying CPU/GPU parity for primaries conversion, tone mapping, gamut mapping

Professional color management system with camera log profiles, ACES workflows, HDR handling, and delivery validation.

## [2026-05-05] - Phase 10: High-Resolution Preview and Performance Complete

- P10-T1: Preview proxy policy with 1920px threshold, 1280px proxy max, user-facing PROXY indicator
- P10-T2: Frame decode and cache tuning with bounded preview/tracking caches, TTL, and LRU eviction
- P10-T3: Scope sampling adaptation by playback state and resolution (paused 1280px, playback 640px)
- P10-T4: Export throughput profiling with size matrix (1080p–8K) and formatProfileReport()
- P10-T5: Performance guardrails and large-media documentation in docs/performance.md

Large-raster playback, scopes, and export remain responsive through proxy and performance work.

## [2026-05-05] - Phase 09: Flexible Export Geometry Complete

- P9-T1: Export settings schema with source/preset/custom size modes, 8 presets, and fit/crop/pad resize policies
- P9-T2: Fit/crop/pad render pipeline with transformRgbaFrame() and applyResizePolicy()
- P9-T3: Export UI with size mode selector, preset dropdown, custom inputs, resize policy selector, and live preview
- P9-T4: Export validation and job metadata with output raster dimensions in progress/result
- P9-T5: Export geometry verification tests for portrait preset from landscape source

User can export to source resolution or preset/custom aspect ratios with explicit fit, crop, or pad behavior.

## [2026-05-05] - Phase 08: Media Geometry and Vertical Video Complete

- P8-T1: Media geometry model with 3840x2160 display raster limits, rotation normalization, aspect ratio helpers
- P8-T2: Import and relink geometry validation using shared constants from mediaGeometry.ts
- P8-T3: Vertical viewer with letterbox/pillarbox containment; scope sampling uses video dimensions directly
- P8-T4: Tracking uses MAX_DISPLAY_WIDTH/MAX_DISPLAY_HEIGHT from mediaGeometry.ts; export uses display dimensions
- P8-T5: Geometry regression coverage with tests for portrait/square/rotated/larger cases

Portrait and rotated media display correctly; geometry handling is consistent across preview, tracking, and export.

## [2026-05-05] - Phase 11: Format and Delivery Expansion Complete

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
