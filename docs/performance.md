# Performance Benchmarks

**Reference Machine**: Apple M1-class (ARM64, macOS)
**Last Updated**: 2026-04-25

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
