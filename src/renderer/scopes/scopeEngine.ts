import type { ColorNode } from "../../shared/colorEngine";

export type MeasurementSpace =
  | "source"
  | "input-transformed"
  | "working"
  | "display-rendered"
  | "output"
  | "original-compare"
  | "graded-compare";

export type WaveformVariant =
  | "luma"
  | "rgb-overlay"
  | "yrgb-overlay"
  | "ycbcr"
  | "red"
  | "green"
  | "blue"
  | "hdr-nit";

export type ParadeVariant =
  | "rgb"
  | "yrgb"
  | "ycbcr"
  | "channel-isolated"
  | "hdr";

export type HistogramVariant =
  | "rgb"
  | "luma"
  | "log"
  | "cumulative"
  | "saturation"
  | "hue"
  | "zone";

export type VectorscopeVariant =
  | "standard"
  | "uv"
  | "cbcb"
  | "polar";

export type CieVariant =
  | "cie1931"
  | "cie1976";

export interface ScopeCapability {
  sdr: boolean;
  hdr: boolean;
  rgb: boolean;
  luma: boolean;
  chroma: boolean;
  gamut: boolean;
  comparison: boolean;
}

export interface ScopeCacheKey {
  frame: number;
  nodeGraphHash: string;
  colorPipelineHash: string;
  measurementSpace: MeasurementSpace;
  scale: ScopeScale;
  samplingPolicy: SamplingPolicy;
  width: number;
  height: number;
}

export type ScopeScale =
  | "ire"
  | "normalized"
  | "code-value"
  | "nit";

export type SamplingPolicy =
  | "full"
  | "half"
  | "quarter"
  | "dynamic";

export interface ScopeBinningOptions {
  scopeWidth: number;
  scopeHeight: number;
  xBinCount?: number;
  yBinCount?: number;
}

export interface ScopeGridGuide {
  position: number;
  label?: string;
  major?: boolean;
}

export interface ScopeAnnotation {
  type: "text" | "line" | "box";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  label?: string;
  color?: string;
}

const MEASUREMENT_SPACE_LABELS: Record<MeasurementSpace, string> = {
  "source": "Source",
  "input-transformed": "Input",
  "working": "Working",
  "display-rendered": "Display",
  "output": "Output",
  "original-compare": "Original",
  "graded-compare": "Graded"
};

const SCOPE_CAPABILITIES: Record<string, ScopeCapability> = {
  waveform: { sdr: true, hdr: true, rgb: true, luma: true, chroma: false, gamut: false, comparison: true },
  parade: { sdr: true, hdr: true, rgb: true, luma: true, chroma: false, gamut: false, comparison: true },
  vectorscope: { sdr: true, hdr: true, rgb: false, luma: false, chroma: true, gamut: false, comparison: false },
  histogram: { sdr: true, hdr: true, rgb: true, luma: true, chroma: true, gamut: false, comparison: true },
  cie: { sdr: true, hdr: true, rgb: false, luma: false, chroma: true, gamut: true, comparison: false },
  gamut: { sdr: true, hdr: true, rgb: true, luma: false, chroma: false, gamut: true, comparison: false },
  falseColor: { sdr: true, hdr: true, rgb: false, luma: false, chroma: false, gamut: false, comparison: false }
};

export function getMeasurementSpaceLabel(space: MeasurementSpace): string {
  return MEASUREMENT_SPACE_LABELS[space] ?? space;
}

export function getScopeCapabilities(scopeType: string): ScopeCapability {
  return SCOPE_CAPABILITIES[scopeType] ?? {
    sdr: false, hdr: false, rgb: false, luma: false, chroma: false, gamut: false, comparison: false
  };
}

export function computeNodeGraphHash(nodes: readonly ColorNode[]): string {
  if (nodes.length === 0) return "neutral";
  let hash = 0;
  for (const node of nodes) {
    hash = ((hash << 5) - hash + node.id.charCodeAt(0)) | 0;
    const offset = node.primaries.offset;
    if (offset) {
      hash = ((hash << 5) - hash + Math.round(offset.r * 1000)) | 0;
      hash = ((hash << 5) - hash + Math.round(offset.g * 1000)) | 0;
      hash = ((hash << 5) - hash + Math.round(offset.b * 1000)) | 0;
    }
  }
  return String(hash);
}

export function computeColorPipelineHash(): string {
  return "pipeline-default";
}

export function buildScopeCacheKey(
  frame: number,
  nodes: readonly ColorNode[],
  measurementSpace: MeasurementSpace,
  scale: ScopeScale,
  samplingPolicy: SamplingPolicy,
  width: number,
  height: number
): ScopeCacheKey {
  return {
    frame,
    nodeGraphHash: computeNodeGraphHash(nodes),
    colorPipelineHash: computeColorPipelineHash(),
    measurementSpace,
    scale,
    samplingPolicy,
    width,
    height
  };
}

export function getEffectiveSamplingPolicy(
  policy: SamplingPolicy,
  isPlaybackSample: boolean,
  framePixelCount: number
): SamplingPolicy {
  if (policy !== "dynamic") return policy;
  if (isPlaybackSample) {
    return framePixelCount > 1920 * 1080 ? "half" : "full";
  }
  return "full";
}

export function getScaleRange(scale: ScopeScale): { min: number; max: number; divisions: number[] } {
  switch (scale) {
    case "ire": return { min: 0, max: 100, divisions: [0, 25, 50, 75, 100] };
    case "normalized": return { min: 0, max: 1, divisions: [0, 0.25, 0.5, 0.75, 1] };
    case "code-value": return { min: 0, max: 255, divisions: [0, 64, 128, 192, 255] };
    case "nit": return { min: 0, max: 10000, divisions: [0, 100, 1000, 10000] };
  }
}

export function getPlaybackThrottleInterval(isPlaying: boolean, hasActiveScopes: boolean): number {
  if (!hasActiveScopes) return 0;
  return isPlaying ? 1000 / 15 : 1000 / 30;
}

export function createBinningGrid(options: ScopeBinningOptions): { xScale: number; yScale: number } {
  const { scopeWidth, scopeHeight, xBinCount, yBinCount } = options;
  return {
    xScale: scopeWidth / (xBinCount ?? scopeWidth),
    yScale: scopeHeight / (yBinCount ?? scopeHeight)
  };
}

export function calculateTonePeak(bins: Float32Array, absolutePeak: number, percentileRank: number = 0.985): number {
  const peakBucket = Math.max(1, Math.ceil(absolutePeak));
  const buckets = new Uint32Array(peakBucket + 1);
  let occupied = 0;

  for (let index = 0; index < bins.length; index += 1) {
    const density = bins[index];
    if (density > 0) {
      buckets[Math.min(peakBucket, Math.max(1, Math.round(density)))] += 1;
      occupied += 1;
    }
  }

  if (occupied === 0) return Math.max(1, absolutePeak);

  const targetCount = Math.max(1, Math.floor(occupied * percentileRank));
  let cumulative = 0;
  for (let bucket = 1; bucket < buckets.length; bucket += 1) {
    cumulative += buckets[bucket];
    if (cumulative >= targetCount) return bucket;
  }

  return Math.max(1, absolutePeak);
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function sanitizeDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function percentileFromBins(bins: Float32Array, percentile: number): number {
  const total = bins.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  const targetCount = total * percentile;
  let cumulative = 0;
  for (let i = 0; i < bins.length; i += 1) {
    cumulative += bins[i];
    if (cumulative >= targetCount) return i / bins.length;
  }
  return 1;
}

export function createHistogramStats(bins: Float32Array, peak: number, samples: number) {
  let sum = 0;
  let count = 0;
  let min = bins.length;
  let max = 0;
  for (let i = 0; i < bins.length; i += 1) {
    if (bins[i] > 0) {
      sum += i * bins[i];
      count += bins[i];
      min = Math.min(min, i);
      max = Math.max(max, i);
    }
  }
  return {
    mean: count > 0 ? sum / count / bins.length : 0.5,
    min: min / bins.length,
    max: max / bins.length,
    median: percentileFromBins(bins, 0.5),
    p1: percentileFromBins(bins, 0.01),
    p99: percentileFromBins(bins, 0.99),
    samples,
    peak,
    clippingCount: bins[bins.length - 1] ?? 0,
    shadowCount: bins[0] ?? 0
  };
}
