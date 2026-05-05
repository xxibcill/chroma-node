# Performance Benchmarks

**Reference Machine**: Apple M1-class (ARM64, macOS)
**Last Updated**: 2026-04-26

## Measurement Infrastructure

Performance tracking is implemented in `src/renderer/perf.ts`:

```typescript
import { perf, measureImportTime, measureFirstFrameTime, formatPerformanceSummary } from './perf';
```

The `PerformanceTracker` class provides:
- `start(label)` / `end(label)` - manual timing markers
- `record(name, value, unit)` - direct measurement recording
- `getAverage(name)` / `getMin(name)` / `getMax(name)` - statistics
- `formatPerformanceSummary()` - human-readable report

## Measurement Categories

### Import (`import.*`)
- `import.total` - Time from file selection to media ready for playback

### First Frame (`firstFrame.*`)
- `firstFrame.total` - Time from media ready to first frame displayed

### Playback (`playback.*`)
- `playback.fps` - Frames per second during playback
- `playback.latency` - Time from frame request to display

### Scopes (`scope.*`)
- `scope.update` - Time to compute waveform/vectorscope
- `scope.render` - Time to render scope display

### Tracking (`tracking.*`)
- `tracking.frame` - Time to process single frame
- `tracking.total` - Full track operation time

### Export (`export.*`)
- `export.frame` - Time to process single export frame
- `export.total` - Full export duration

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Playback FPS | >= 24 fps | 1080p on M1-class CPU |
| First Frame | < 500ms | After media load |
| Import | < 2s | For supported media |
| Parameter Latency | < 50ms | Slider change to display |
| Scope Update | < 100ms | Debounced, paused |
| Memory | < 2GB | For 1080p session |

## Recording Benchmarks

Run the app with performance tracking enabled:

```typescript
// In relevant code paths:
import { perf, measureImportTime } from './perf';

const result = measureImportTime(() => loadMedia(path));

// After session:
console.log(formatPerformanceSummary());
// Output:
/*
Performance Summary
==================

Import:
  total: avg=XXXms min=XXXms max=XXXms (n=N)

First Frame:
  total: avg=XXXms min=XXXms max=XXXms (n=N)

Playback:
  ...

Scopes:
  ...

Tracking:
  ...

Export:
  ...
*/
```

## Baseline Measurements

| Test Case | Media | Date | Result |
|-----------|-------|------|--------|
| Import 1080p H.264 | sample_1080p.mp4 | 2026-04-25 | PENDING |
| First Frame Display | sample_1080p.mp4 | 2026-04-25 | PENDING |
| Playback 1 Node | sample_1080p.mp4 | 2026-04-25 | PENDING |
| Playback 3 Nodes | sample_1080p.mp4 | 2026-04-25 | PENDING |
| Export 1080p H.264 | sample_1080p.mp4 | 2026-04-25 | PENDING |

## Critical Misses

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| None recorded | - | - | - |

## Optimization Notes

- Scope updates are throttled to 15 fps during playback
- 50ms debounce on parameter changes when paused
- Tracking uses grayscale template matching for speed
- Export decodes at native resolution, evaluates on CPU

---

# Large Media Performance Guide (Phase 10)

## Preview Proxy Policy

The app uses an adaptive preview proxy policy to maintain interactivity when working with larger media.

### Thresholds

| Media Size | Preview Mode | Max Preview Width |
|------------|--------------|------------------|
| Up to 1920x1080 | Full resolution | 1920px |
| Above ~2.3MP (e.g., 2560x1440) | Proxy | 1280px |

### How It Works

- The preview proxy is **visual only** — export remains source-accurate at full resolution
- The proxy reduces decode cost during playback and frame stepping
- A `PROXY 1280px` indicator appears in the status bar when proxy mode is active
- Tracking always uses a thumbnail-sized decode (up to 640px) for stability

### Scope Sampling

Scopes (waveform/vectorscope) adapt to media size:

| Media Size | Paused Scope Sample | Playback Scope Sample |
|------------|--------------------|-----------------------|
| Up to 1920x1080 | 1280px | 640px |
| Above 1920x1080 | 640px | 320px |

## Frame Cache

Decoded frames are cached to reduce repeated decode cost:

- **Preview cache**: Retains the most recent 2 frames for up to 30 seconds
- **Tracking cache**: Retains up to 8 recent frames (LRU eviction)
- Cache is automatically cleared when media changes

## Export Throughput

Export performance is measured across decode, CPU color evaluation, and encode stages.

### First Officially Supported High-Resolution Target

**1920x1080 at up to 30fps** is the primary supported target for full-resolution export.

Higher resolutions (4K+) are supported but performance is best-effort and hardware-dependent.

### Profiling Output

When exporting, the console outputs a profile report:

```
Export Profile Report
─────────────────────
Source: 3840x2160
Target: 3840x2160
Frames: 300
Total time: 45000 ms
  Decode:  12000 ms (26.7%)
  Render:  22000 ms (48.9%)
  Encode:  11000 ms (24.4%)
Throughput: 6.67 fps
MP/s: 53.33
```

## Supported Raster Ranges

| Support Level | Max Resolution | Notes |
|--------------|----------------|-------|
| **Full** | 1920x1080 | All features at full performance |
| **Best-effort** | Up to 3840x2160 | Proxy preview, reduced scope sampling |
| **Functional** | Up to 4096x2160 | Basic import/playback/export |

## Large Media Guidelines

1. **For best interactivity**: Work with media up to 1920x1080 at full resolution
2. **For large media (>1920x1080)**:
   - Preview uses proxy automatically
   - Scopes sample at reduced resolution
   - Export may take longer but remains accurate
3. **For 4K+ content**: Use for final export; consider proxy workflow for color grading
