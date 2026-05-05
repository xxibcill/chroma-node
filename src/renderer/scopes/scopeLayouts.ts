export type ScopeLayoutPreset =
  | "compact-two-up"
  | "four-up"
  | "full-height"
  | "focused-single"
  | "floating-drawer"
  | "compare-layout";

export interface ScopeLayoutConfig {
  preset: ScopeLayoutPreset;
  primaryScope: ScopePanelConfig;
  secondaryScopes: ScopePanelConfig[];
  showViewer: boolean;
  frozenFrame: FrozenFrame | null;
}

export interface ScopePanelConfig {
  type: ScopePanelType;
  width: number;
  height: number;
  x: number;
  y: number;
}

export type ScopePanelType =
  | "waveform"
  | "parade"
  | "vectorscope"
  | "histogram"
  | "cie"
  | "exposure"
  | "falsecolor"
  | "none";

export interface FrozenFrame {
  frameIndex: number;
  measurementSpace: string;
  profile: string;
  scale: string;
  timestamp: number;
  waveformBins: Float32Array | null;
  vectorscopeBins: Float32Array | null;
  paradeBins: { red: Float32Array; green: Float32Array; blue: Float32Array } | null;
}

export interface ScopeSnapshot {
  id: string;
  name: string;
  frameIndex: number;
  measurementSpace: MeasurementSpace;
  profile: string;
  scale: string;
  timestamp: number;
  data: {
    waveform?: { bins: Float32Array; peak: number };
    vectorscope?: { bins: Float32Array; peak: number };
    parade?: { red: Float32Array; green: Float32Array; blue: Float32Array; peak: number };
    histogram?: { red: Uint32Array; green: Uint32Array; blue: Uint32Array; luma: Uint32Array; peak: number };
  };
}

export interface PerformancePolicy {
  samplingPolicy: "full" | "half" | "quarter" | "dynamic";
  playbackQuality: "high" | "medium" | "low";
  maxScopesDuringPlayback: number;
  throttleDuringPlayback: boolean;
}

export interface ScopeValidation {
  binningDeterministic: boolean;
  layoutStable: boolean;
  renderConsistent: boolean;
  cacheKeyUnique: boolean;
  performanceTarget: boolean;
}

import type { MeasurementSpace } from "./scopeEngine";

export const LAYOUT_PRESETS: Record<ScopeLayoutPreset, Omit<ScopeLayoutConfig, "frozenFrame">> = {
  "compact-two-up": {
    preset: "compact-two-up",
    primaryScope: { type: "waveform", width: 300, height: 150, x: 0, y: 0 },
    secondaryScopes: [{ type: "vectorscope", width: 150, height: 150, x: 300, y: 0 }],
    showViewer: true
  },
  "four-up": {
    preset: "four-up",
    primaryScope: { type: "waveform", width: 300, height: 200, x: 0, y: 0 },
    secondaryScopes: [
      { type: "vectorscope", width: 150, height: 100, x: 300, y: 0 },
      { type: "histogram", width: 150, height: 100, x: 300, y: 100 },
      { type: "parade", width: 300, height: 100, x: 0, y: 200 }
    ],
    showViewer: true
  },
  "full-height": {
    preset: "full-height",
    primaryScope: { type: "waveform", width: 150, height: 600, x: 0, y: 0 },
    secondaryScopes: [],
    showViewer: true
  },
  "focused-single": {
    preset: "focused-single",
    primaryScope: { type: "waveform", width: 400, height: 400, x: 0, y: 0 },
    secondaryScopes: [],
    showViewer: true
  },
  "floating-drawer": {
    preset: "floating-drawer",
    primaryScope: { type: "waveform", width: 250, height: 200, x: 0, y: 0 },
    secondaryScopes: [],
    showViewer: true
  },
  "compare-layout": {
    preset: "compare-layout",
    primaryScope: { type: "waveform", width: 250, height: 300, x: 0, y: 0 },
    secondaryScopes: [
      { type: "parade", width: 250, height: 150, x: 250, y: 0 },
      { type: "vectorscope", width: 250, height: 150, x: 250, y: 150 }
    ],
    showViewer: true
  }
};

export const DEFAULT_PERFORMANCE_POLICY: PerformancePolicy = {
  samplingPolicy: "dynamic",
  playbackQuality: "medium",
  maxScopesDuringPlayback: 2,
  throttleDuringPlayback: true
};

export function createLayoutConfig(preset: ScopeLayoutPreset): ScopeLayoutConfig {
  const base = LAYOUT_PRESETS[preset];
  return {
    ...base,
    frozenFrame: null
  };
}

export function freezeCurrentFrame(
  frameIndex: number,
  measurementSpace: MeasurementSpace,
  profile: string,
  scale: string,
  waveformBins: Float32Array | null,
  vectorscopeBins: Float32Array | null,
  paradeBins: { red: Float32Array; green: Float32Array; blue: Float32Array } | null
): FrozenFrame {
  return {
    frameIndex,
    measurementSpace,
    profile,
    scale,
    timestamp: Date.now(),
    waveformBins,
    vectorscopeBins,
    paradeBins
  };
}

export function createSnapshot(
  id: string,
  name: string,
  frameIndex: number,
  measurementSpace: MeasurementSpace,
  profile: string,
  scale: string,
  data: ScopeSnapshot["data"]
): ScopeSnapshot {
  return {
    id,
    name,
    frameIndex,
    measurementSpace,
    profile,
    scale,
    timestamp: Date.now(),
    data
  };
}

export function validateLayoutStability(config: ScopeLayoutConfig): boolean {
  const totalWidth = config.primaryScope.width +
    config.secondaryScopes.reduce((sum, s) => sum + s.width, 0);
  return totalWidth > 0 && config.primaryScope.height > 0;
}

export function validatePerformancePolicy(policy: PerformancePolicy): boolean {
  return policy.maxScopesDuringPlayback >= 1 && policy.maxScopesDuringPlayback <= 8;
}

export function computeEffectivePolicy(
  policy: PerformancePolicy,
  isPlaying: boolean,
  activeScopeCount: number
): PerformancePolicy {
  if (!policy.throttleDuringPlayback || !isPlaying) {
    return policy;
  }

  if (activeScopeCount > policy.maxScopesDuringPlayback) {
    return {
      ...policy,
      samplingPolicy: "half"
    };
  }

  return policy;
}
