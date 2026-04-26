/**
 * Export throughput profiling for measuring performance at larger rasters.
 *
 * Measures decode, CPU color evaluation, and encode cost across a size matrix.
 */

export interface ExportProfileResult {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  totalFrames: number;
  totalElapsedMs: number;
  decodeElapsedMs: number;
  renderElapsedMs: number;
  encodeElapsedMs: number;
  framesPerSecond: number;
  pixelsPerSecond: number;
  megapixelsPerSecond: number;
}

export interface ExportProfileSize {
  width: number;
  height: number;
  label: string;
}

export const PROFILING_SIZE_MATRIX: ExportProfileSize[] = [
  { width: 1920, height: 1080, label: "1080p" },
  { width: 2560, height: 1440, label: "1440p" },
  { width: 3840, height: 2160, label: "4K" },
  { width: 4096, height: 2160, label: "4K UW" },
  { width: 7680, height: 4320, label: "8K" }
];

export interface ProfilingTimers {
  decodeStart: number;
  decodeEnd: number;
  renderStart: number;
  renderEnd: number;
  encodeStart: number;
  encodeEnd: number;
}

export function createProfilingTimers(): ProfilingTimers {
  return {
    decodeStart: 0,
    decodeEnd: 0,
    renderStart: 0,
    renderEnd: 0,
    encodeStart: 0,
    encodeEnd: 0
  };
}

export function computeProfileResult(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  totalFrames: number,
  timers: ProfilingTimers
): ExportProfileResult {
  const decodeElapsedMs = timers.decodeEnd - timers.decodeStart;
  const renderElapsedMs = timers.renderEnd - timers.renderStart;
  const totalElapsedMs = timers.encodeEnd - timers.decodeStart;
  const encodeElapsedMs = totalElapsedMs - decodeElapsedMs - renderElapsedMs;
  const framesPerSecond = totalFrames / (totalElapsedMs / 1000);
  const pixelsPerSecond = (targetWidth * targetHeight * totalFrames) / (totalElapsedMs / 1000);
  const megapixelsPerSecond = pixelsPerSecond / 1_000_000;

  return {
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    totalFrames,
    totalElapsedMs,
    decodeElapsedMs,
    renderElapsedMs,
    encodeElapsedMs,
    framesPerSecond,
    pixelsPerSecond,
    megapixelsPerSecond
  };
}

export function formatProfileReport(result: ExportProfileResult): string {
  return [
    `Export Profile Report`,
    `─────────────────────`,
    `Source: ${result.sourceWidth}x${result.sourceHeight}`,
    `Target: ${result.targetWidth}x${result.targetHeight}`,
    `Frames: ${result.totalFrames}`,
    `Total time: ${result.totalElapsedMs.toFixed(0)} ms`,
    `  Decode:  ${result.decodeElapsedMs.toFixed(0)} ms (${((result.decodeElapsedMs / result.totalElapsedMs) * 100).toFixed(1)}%)`,
    `  Render:  ${result.renderElapsedMs.toFixed(0)} ms (${((result.renderElapsedMs / result.totalElapsedMs) * 100).toFixed(1)}%)`,
    `  Encode:  ${result.encodeElapsedMs.toFixed(0)} ms (${((result.encodeElapsedMs / result.totalElapsedMs) * 100).toFixed(1)}%)`,
    `Throughput: ${result.framesPerSecond.toFixed(2)} fps`,
    `MP/s: ${result.megapixelsPerSecond.toFixed(2)}`
  ].join("\n");
}
