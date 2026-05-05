import type {
  ColorNode,
  PrimaryCorrection,
  RgbVector
} from "./colorEngine.js";
import {
  createColorNode,
  PRIMARY_RANGES
} from "./colorEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface RgbFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// ============================================================================
// AI Settings
// ============================================================================

export interface AiSettings {
  enabled: boolean;
  mode: "offline" | "cloud-assisted";
  cloudProvider?: string;
  apiKey?: string;
  requestBudgetLimit?: number;
  requestBudgetUsed: number;
  telemetryConsent: boolean;
  timeoutMs: number;
  maxRetries: number;
  degradedModeOnFailure: boolean;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  mode: "offline",
  requestBudgetUsed: 0,
  telemetryConsent: false,
  timeoutMs: 30000,
  maxRetries: 3,
  degradedModeOnFailure: true
};

export function validateAiSettings(settings: Partial<AiSettings>): AiSettings {
  const validated: AiSettings = { ...DEFAULT_AI_SETTINGS, ...settings };

  if (validated.requestBudgetLimit !== undefined) {
    validated.requestBudgetLimit = Math.max(0, Math.min(validated.requestBudgetLimit, 10000));
  }
  if (validated.requestBudgetUsed !== undefined) {
    validated.requestBudgetUsed = Math.max(0, Math.min(validated.requestBudgetUsed, validated.requestBudgetLimit ?? Infinity));
  }
  if (validated.timeoutMs !== undefined) {
    validated.timeoutMs = Math.max(1000, Math.min(validated.timeoutMs, 120000));
  }
  if (validated.maxRetries !== undefined) {
    validated.maxRetries = Math.max(0, Math.min(validated.maxRetries, 5));
  }

  return validated;
}

// ============================================================================
// Suggestion Metadata Schema
// ============================================================================

export type SuggestionType = "auto-balance" | "reference-match" | "natural-language" | "diagnostic";
export type SuggestionConfidence = "low" | "medium" | "high";
export type SuggestionRisk = "safe" | "moderate" | "aggressive";

export interface SuggestionControlChange {
  controlPath: string;
  before: number | RgbVector;
  after: number | RgbVector;
  reason?: string;
}

export interface SuggestionDiagnostic {
  type: "clipping-highlights" | "clipping-shadows" | "color-cast" | "over-saturation" | "profile-mismatch" | "low-contrast" | "uneven-histogram";
  severity: "info" | "warning" | "critical";
  affectedRegion?: string;
  measurement?: number;
  threshold?: number;
}

export interface SuggestionMetadata {
  type: SuggestionType;
  confidence: SuggestionConfidence;
  risk: SuggestionRisk;
  reason: string;
  diagnostics: SuggestionDiagnostic[];
  changedControls: SuggestionControlChange[];
  profileAware: boolean;
  timestamp: number;
}

export interface AiSuggestion {
  id: string;
  metadata: SuggestionMetadata;
  suggestedNodes: ColorNode[];
  referenceFrameId?: string;
}

// ============================================================================
// Frame Analysis (standalone - no renderer dependencies)
// ============================================================================

const REC709_LUMA_R = 0.2126;
const REC709_LUMA_G = 0.7152;
const REC709_LUMA_B = 0.0722;

function calculateRec709Luma(r: number, g: number, b: number): number {
  return Math.min(1, Math.max(0,
    r / 255 * REC709_LUMA_R +
    g / 255 * REC709_LUMA_G +
    b / 255 * REC709_LUMA_B
  ));
}

export interface ImageAnalysis {
  exposure: {
    shadows: number;
    darks: number;
    midtones: number;
    lights: number;
    highlights: number;
    whites: number;
    superBlacks: number;
    superWhites: number;
    clipping: number;
    clippingRatio: number;
  };
  rgbLevels: {
    avgR: number;
    avgG: number;
    avgB: number;
    rangeR: [number, number];
    rangeG: [number, number];
    rangeB: [number, number];
  };
  saturation: {
    average: number;
    max: number;
    percentOverSaturated: number;
  };
  whiteBalance: {
    temperature: number;
    tint: number;
    hasCast: boolean;
    castColor: "cool" | "warm" | "neutral" | "magenta" | "green";
  };
  contrast: {
    lumaMin: number;
    lumaMax: number;
    ratio: number;
    isLow: boolean;
  };
  samples: number;
}

export function analyzeFrame(frame: RgbFrame): ImageAnalysis {
  let shadows = 0, darks = 0, midtones = 0, lights = 0, highlights = 0, whites = 0, superBlacks = 0, superWhites = 0, clipping = 0;

  let sumR = 0, sumG = 0, sumB = 0;
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;
  let satSum = 0;
  let overSatPixels = 0;
  let lumaMin = 1, lumaMax = 0;

  const pixelCount = frame.data.length / 4;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i];
    const g = frame.data[i + 1];
    const b = frame.data[i + 2];

    sumR += r;
    sumG += g;
    sumB += b;
    minR = Math.min(minR, r);
    maxR = Math.max(maxR, r);
    minG = Math.min(minG, g);
    maxG = Math.max(maxG, g);
    minB = Math.min(minB, b);
    maxB = Math.max(maxB, b);

    const luma = calculateRec709Luma(r, g, b);
    lumaMin = Math.min(lumaMin, luma);
    lumaMax = Math.max(lumaMax, luma);

    if (luma <= 0) { superBlacks += 1; }
    else if (luma < 0.10) { shadows += 1; }
    else if (luma < 0.25) { darks += 1; }
    else if (luma < 0.45) { /* darks zone */ }
    else if (luma < 0.55) { midtones += 1; }
    else if (luma < 0.70) { lights += 1; }
    else if (luma < 0.90) { highlights += 1; }
    else if (luma < 1.0) { whites += 1; }
    else { superWhites += 1; }

    if (luma >= 1.0 || luma <= 0) clipping += 1;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    satSum += sat;
    if (sat > 1.0) overSatPixels++;
  }

  const avgR = sumR / pixelCount;
  const avgG = sumG / pixelCount;
  const avgB = sumB / pixelCount;
  const avgSaturation = satSum / pixelCount;

  const temp = (avgR - avgB) / 255;
  const tint = (avgG - (avgR + avgB) / 2) / 255;

  let castColor: "cool" | "warm" | "neutral" | "magenta" | "green" = "neutral";
  if (Math.abs(temp) > 0.1 || Math.abs(tint) > 0.1) {
    if (temp > 0.1 && Math.abs(tint) < 0.1) castColor = "warm";
    else if (temp < -0.1 && Math.abs(tint) < 0.1) castColor = "cool";
    else if (tint > 0.1) castColor = "green";
    else if (tint < -0.1) castColor = "magenta";
  }

  const contrastRatio = lumaMax - lumaMin;

  return {
    exposure: {
      shadows,
      darks,
      midtones,
      lights,
      highlights,
      whites,
      superBlacks,
      superWhites,
      clipping,
      clippingRatio: clipping / pixelCount
    },
    rgbLevels: {
      avgR,
      avgG,
      avgB,
      rangeR: [minR, maxR],
      rangeG: [minG, maxG],
      rangeB: [minB, maxB]
    },
    saturation: {
      average: avgSaturation,
      max: satSum / pixelCount,
      percentOverSaturated: overSatPixels / pixelCount
    },
    whiteBalance: {
      temperature: temp,
      tint,
      hasCast: castColor !== "neutral",
      castColor
    },
    contrast: {
      lumaMin,
      lumaMax,
      ratio: contrastRatio,
      isLow: contrastRatio < 0.3
    },
    samples: pixelCount
  };
}

// ============================================================================
// Auto Balance Suggestions
// ============================================================================

function clampPrimary(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateAutoBalanceSuggestions(analysis: ImageAnalysis): { primaries: Partial<PrimaryCorrection>; confidence: SuggestionConfidence; reason: string }[] {
  const suggestions: { primaries: Partial<PrimaryCorrection>; confidence: SuggestionConfidence; reason: string }[] = [];

  // 1. Exposure/Black Level
  if (analysis.exposure.clipping > 0 && analysis.exposure.clippingRatio > 0.01) {
    if (analysis.exposure.superWhites > analysis.exposure.superBlacks) {
      suggestions.push({
        primaries: {
          gain: { r: 0.98, g: 0.98, b: 0.98 }
        },
        confidence: "high",
        reason: `Highlight clipping detected in ${(analysis.exposure.clippingRatio * 100).toFixed(1)}% of pixels`
      });
    } else {
      suggestions.push({
        primaries: {
          lift: { r: 0.01, g: 0.01, b: 0.01 }
        },
        confidence: "high",
        reason: `Shadow clipping detected in ${(analysis.exposure.clippingRatio * 100).toFixed(1)}% of pixels`
      });
    }
  }

  // 2. White Balance Correction
  if (analysis.whiteBalance.hasCast) {
    const tempCorrection = -analysis.whiteBalance.temperature * 0.2;
    const tintCorrection = -analysis.whiteBalance.tint * 0.2;

    suggestions.push({
      primaries: {
        temperature: clampPrimary(tempCorrection, PRIMARY_RANGES.temperature.min, PRIMARY_RANGES.temperature.max),
        tint: clampPrimary(tintCorrection, PRIMARY_RANGES.tint.min, PRIMARY_RANGES.tint.max)
      },
      confidence: "medium",
      reason: `${analysis.whiteBalance.castColor} color cast detected (temperature: ${analysis.whiteBalance.temperature.toFixed(2)}, tint: ${analysis.whiteBalance.tint.toFixed(2)})`
    });
  }

  // 3. Contrast Adjustment
  if (analysis.contrast.isLow) {
    const contrastBoost = 1.15;
    suggestions.push({
      primaries: {
        contrast: clampPrimary(contrastBoost, PRIMARY_RANGES.contrast.min, PRIMARY_RANGES.contrast.max),
        pivot: 0.5
      },
      confidence: "high",
      reason: `Low contrast ratio (${analysis.contrast.ratio.toFixed(2)}) detected`
    });
  }

  // 4. Saturation Adjustment
  if (analysis.saturation.percentOverSaturated > 0.05) {
    suggestions.push({
      primaries: {
        saturation: clampPrimary(0.9, PRIMARY_RANGES.saturation.min, PRIMARY_RANGES.saturation.max)
      },
      confidence: "medium",
      reason: `Over-saturation detected in ${(analysis.saturation.percentOverSaturated * 100).toFixed(1)}% of pixels`
    });
  } else if (analysis.saturation.average < 0.3) {
    suggestions.push({
      primaries: {
        saturation: clampPrimary(1.2, PRIMARY_RANGES.saturation.min, PRIMARY_RANGES.saturation.max)
      },
      confidence: "medium",
      reason: `Low average saturation (${(analysis.saturation.average * 100).toFixed(0)}%) detected`
    });
  }

  // 5. RGB Balance
  const avgTarget = 128;
  const rDiff = (analysis.rgbLevels.avgR - avgTarget) / avgTarget;
  const gDiff = (analysis.rgbLevels.avgG - avgTarget) / avgTarget;
  const bDiff = (analysis.rgbLevels.avgB - avgTarget) / avgTarget;

  if (Math.abs(rDiff) > 0.15 || Math.abs(gDiff) > 0.15 || Math.abs(bDiff) > 0.15) {
    const gammaR = clampPrimary(1 - rDiff * 0.3, PRIMARY_RANGES.gamma.min, PRIMARY_RANGES.gamma.max);
    const gammaG = clampPrimary(1 - gDiff * 0.3, PRIMARY_RANGES.gamma.min, PRIMARY_RANGES.gamma.max);
    const gammaB = clampPrimary(1 - bDiff * 0.3, PRIMARY_RANGES.gamma.min, PRIMARY_RANGES.gamma.max);

    suggestions.push({
      primaries: {
        gamma: { r: gammaR, g: gammaG, b: gammaB }
      },
      confidence: "medium",
      reason: `RGB imbalance detected (R: ${analysis.rgbLevels.avgR.toFixed(0)}, G: ${analysis.rgbLevels.avgG.toFixed(0)}, B: ${analysis.rgbLevels.avgB.toFixed(0)})`
    });
  }

  return suggestions;
}

export function generateAutoBalanceAndDiagnostics(
  frame: RgbFrame,
  existingNodes: readonly ColorNode[]
): AiSuggestion[] {
  const analysis = analyzeFrame(frame);
  const suggestions: AiSuggestion[] = [];

  const diagnostics: SuggestionDiagnostic[] = [];

  if (analysis.exposure.clippingRatio > 0.01) {
    if (analysis.exposure.superWhites > analysis.exposure.superBlacks) {
      diagnostics.push({
        type: "clipping-highlights",
        severity: analysis.exposure.clippingRatio > 0.05 ? "critical" : "warning",
        measurement: analysis.exposure.clippingRatio,
        threshold: 0.01
      });
    } else {
      diagnostics.push({
        type: "clipping-shadows",
        severity: analysis.exposure.clippingRatio > 0.05 ? "critical" : "warning",
        measurement: analysis.exposure.clippingRatio,
        threshold: 0.01
      });
    }
  }

  if (analysis.whiteBalance.hasCast) {
    diagnostics.push({
      type: "color-cast",
      severity: "warning",
      affectedRegion: "overall",
      measurement: Math.abs(analysis.whiteBalance.temperature)
    });
  }

  if (analysis.saturation.percentOverSaturated > 0.05) {
    diagnostics.push({
      type: "over-saturation",
      severity: "warning",
      measurement: analysis.saturation.percentOverSaturated,
      threshold: 0.05
    });
  }

  if (analysis.contrast.isLow) {
    diagnostics.push({
      type: "low-contrast",
      severity: "info",
      measurement: analysis.contrast.ratio,
      threshold: 0.3
    });
  }

  const balanceSuggestions = generateAutoBalanceSuggestions(analysis);

  for (const suggestion of balanceSuggestions) {
    const newNode = createColorNode(existingNodes.length + 1);
    newNode.primaries = { ...newNode.primaries, ...suggestion.primaries };

    const changedControls: SuggestionControlChange[] = [];
    for (const [key, value] of Object.entries(suggestion.primaries)) {
      const defaultValue = newNode.primaries[key as keyof PrimaryCorrection];
      changedControls.push({
        controlPath: `primaries.${key}`,
        before: defaultValue,
        after: value as number | RgbVector,
        reason: suggestion.reason
      });
    }

    suggestions.push({
      id: `auto-balance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      metadata: {
        type: "auto-balance",
        confidence: suggestion.confidence,
        risk: suggestion.confidence === "high" ? "safe" : "moderate",
        reason: suggestion.reason,
        diagnostics,
        changedControls,
        profileAware: true,
        timestamp: Date.now()
      },
      suggestedNodes: [newNode]
    });
  }

  return suggestions;
}

// ============================================================================
// Reference Shot Matching
// ============================================================================

export interface ReferenceMatchResult {
  suggestedNodes: ColorNode[];
  matchScore: number;
  deviations: {
    lumaDelta: number;
    chromaDelta: number;
    saturationDelta: number;
    contrastDelta: number;
  };
}

export function matchToReference(
  sourceFrame: RgbFrame,
  referenceFrame: RgbFrame,
  sourceAnalysis: ImageAnalysis,
  referenceAnalysis: ImageAnalysis
): ReferenceMatchResult {
  const newNode = createColorNode(1);

  const sourceLumaMid = (sourceAnalysis.contrast.lumaMin + sourceAnalysis.contrast.lumaMax) / 2;
  const refLumaMid = (referenceAnalysis.contrast.lumaMin + referenceAnalysis.contrast.lumaMax) / 2;
  const lumaDelta = refLumaMid - sourceLumaMid;

  const sourceChroma = sourceAnalysis.saturation.average;
  const refChroma = referenceAnalysis.saturation.average;
  const chromaDelta = refChroma - sourceChroma;

  const sourceContrast = sourceAnalysis.contrast.ratio;
  const refContrast = referenceAnalysis.contrast.ratio;
  const contrastDelta = refContrast - sourceContrast;

  const liftCorrection = lumaDelta * 0.5;
  newNode.primaries.lift = {
    r: clampPrimary(newNode.primaries.lift.r + liftCorrection * 0.3, PRIMARY_RANGES.lift.min, PRIMARY_RANGES.lift.max),
    g: clampPrimary(newNode.primaries.lift.g + liftCorrection * 0.3, PRIMARY_RANGES.lift.min, PRIMARY_RANGES.lift.max),
    b: clampPrimary(newNode.primaries.lift.b + liftCorrection * 0.3, PRIMARY_RANGES.lift.min, PRIMARY_RANGES.lift.max)
  };

  if (Math.abs(contrastDelta) > 0.05) {
    newNode.primaries.contrast = clampPrimary(
      1 + contrastDelta * 0.5,
      PRIMARY_RANGES.contrast.min,
      PRIMARY_RANGES.contrast.max
    );
  }

  if (Math.abs(chromaDelta) > 0.05) {
    newNode.primaries.saturation = clampPrimary(
      1 + chromaDelta * 0.3,
      PRIMARY_RANGES.saturation.min,
      PRIMARY_RANGES.saturation.max
    );
  }

  const tempDiff = referenceAnalysis.whiteBalance.temperature - sourceAnalysis.whiteBalance.temperature;
  const tintDiff = referenceAnalysis.whiteBalance.tint - sourceAnalysis.whiteBalance.tint;

  if (Math.abs(tempDiff) > 0.1) {
    newNode.primaries.temperature = clampPrimary(
      newNode.primaries.temperature - tempDiff * 0.2,
      PRIMARY_RANGES.temperature.min,
      PRIMARY_RANGES.temperature.max
    );
  }
  if (Math.abs(tintDiff) > 0.1) {
    newNode.primaries.tint = clampPrimary(
      newNode.primaries.tint - tintDiff * 0.2,
      PRIMARY_RANGES.tint.min,
      PRIMARY_RANGES.tint.max
    );
  }

  const matchScore = Math.max(0, 100 - (
    Math.abs(lumaDelta) * 50 +
    Math.abs(chromaDelta) * 30 +
    Math.abs(contrastDelta) * 20
  ));

  return {
    suggestedNodes: [newNode],
    matchScore,
    deviations: {
      lumaDelta,
      chromaDelta,
      saturationDelta: chromaDelta,
      contrastDelta
    }
  };
}

export function generateReferenceMatchSuggestions(
  sourceFrame: RgbFrame,
  referenceFrame: RgbFrame,
  existingNodes: readonly ColorNode[]
): AiSuggestion[] {
  const sourceAnalysis = analyzeFrame(sourceFrame);
  const referenceAnalysis = analyzeFrame(referenceFrame);

  const result = matchToReference(sourceFrame, referenceFrame, sourceAnalysis, referenceAnalysis);

  const changedControls: SuggestionControlChange[] = [];
  changedControls.push({
    controlPath: "primaries.lift",
    before: existingNodes[0]?.primaries.lift ?? { r: 0, g: 0, b: 0 },
    after: result.suggestedNodes[0].primaries.lift,
    reason: `Luma adjustment (delta: ${result.deviations.lumaDelta.toFixed(2)})`
  });
  changedControls.push({
    controlPath: "primaries.saturation",
    before: existingNodes[0]?.primaries.saturation ?? 1,
    after: result.suggestedNodes[0].primaries.saturation,
    reason: `Saturation adjustment (delta: ${result.deviations.saturationDelta.toFixed(2)})`
  });
  changedControls.push({
    controlPath: "primaries.contrast",
    before: existingNodes[0]?.primaries.contrast ?? 1,
    after: result.suggestedNodes[0].primaries.contrast,
    reason: `Contrast adjustment (delta: ${result.deviations.contrastDelta.toFixed(2)})`
  });

  return [{
    id: `ref-match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    metadata: {
      type: "reference-match",
      confidence: "medium",
      risk: "moderate",
      reason: `Reference match score: ${result.matchScore.toFixed(0)}%`,
      diagnostics: [],
      changedControls,
      profileAware: true,
      timestamp: Date.now()
    },
    suggestedNodes: result.suggestedNodes
  }];
}

// ============================================================================
// Natural Language Grade Intent
// ============================================================================

type IntentAction = "warmer" | "cooler" | "softer" | "contrasty" | "moodier" | "brighter" | "darker" | "less-saturated" | "more-saturated" | "cleaner-whites" | "punchier" | "desaturated-look";

interface IntentMapping {
  intent: IntentAction;
  primaries: Partial<PrimaryCorrection>;
  incompatibleWith?: IntentAction[];
}

const INTENT_MAPPINGS: IntentMapping[] = [
  {
    intent: "warmer",
    primaries: { temperature: 0.15, tint: 0.05 },
    incompatibleWith: ["cooler"]
  },
  {
    intent: "cooler",
    primaries: { temperature: -0.15, tint: -0.05 },
    incompatibleWith: ["warmer"]
  },
  {
    intent: "softer",
    primaries: { contrast: 0.9, saturation: 0.95 },
    incompatibleWith: ["contrasty", "punchier"]
  },
  {
    intent: "contrasty",
    primaries: { contrast: 1.2, pivot: 0.5 },
    incompatibleWith: ["softer"]
  },
  {
    intent: "moodier",
    primaries: { contrast: 1.15, saturation: 0.9, temperature: -0.1 },
    incompatibleWith: ["brighter"]
  },
  {
    intent: "brighter",
    primaries: { lift: { r: 0.05, g: 0.05, b: 0.05 }, gain: { r: 1.05, g: 1.05, b: 1.05 } },
    incompatibleWith: ["moodier", "darker"]
  },
  {
    intent: "darker",
    primaries: { lift: { r: -0.05, g: -0.05, b: -0.05 }, gain: { r: 0.95, g: 0.95, b: 0.95 } },
    incompatibleWith: ["brighter"]
  },
  {
    intent: "less-saturated",
    primaries: { saturation: 0.8 },
    incompatibleWith: ["more-saturated"]
  },
  {
    intent: "more-saturated",
    primaries: { saturation: 1.25 },
    incompatibleWith: ["less-saturated"]
  },
  {
    intent: "cleaner-whites",
    primaries: { gain: { r: 1.02, g: 1.02, b: 0.98 }, temperature: -0.05 },
    incompatibleWith: []
  },
  {
    intent: "punchier",
    primaries: { contrast: 1.25, saturation: 1.15, colorBoost: 1.1 },
    incompatibleWith: ["softer"]
  },
  {
    intent: "desaturated-look",
    primaries: { saturation: 0.6, contrast: 1.1 },
    incompatibleWith: ["more-saturated"]
  }
];

const INTENT_KEYWORDS: Record<IntentAction, string[]> = {
  "warmer": ["warm", "warmer", "heat", "golden"],
  "cooler": ["cool", "cooler", "cold", "blue"],
  "softer": ["soft", "softer", "gentle", "fade"],
  "contrasty": ["contrast", "contrasty", "punch", "snap"],
  "moodier": ["moody", "moodier", "dramatic", "darken"],
  "brighter": ["bright", "brighter", "lighten", "expose up"],
  "darker": ["dark", "darker", "shadow", "dim", "expose down"],
  "less-saturated": ["less saturated", "desaturate", "muted"],
  "more-saturated": ["more saturated", "vibrant", "saturated", "colorful"],
  "cleaner-whites": ["clean whites", "whites", "crisp"],
  "punchier": ["punchy", "punchier", "pop"],
  "desaturated-look": ["desaturated", "muted look", "flat"]
};

export interface ParsedIntent {
  actions: IntentAction[];
  unsupportedTerms: string[];
  confidence: number;
}

export function parseNaturalLanguageIntent(prompt: string): ParsedIntent {
  const lowerPrompt = prompt.toLowerCase();
  const detectedActions: IntentAction[] = [];
  const unsupportedTerms: string[] = [];
  let confidence = 0.5;

  for (const [action, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        if (!detectedActions.includes(action as IntentAction)) {
          detectedActions.push(action as IntentAction);
          confidence = Math.min(1, confidence + 0.2);
        }
        break;
      }
    }
  }

  if (lowerPrompt.includes("skin")) {
    confidence = Math.min(1, confidence + 0.1);
  }

  const ambiguousTerms = ["fix", "improve", "better", "good", "nice", "pretty"];
  for (const term of ambiguousTerms) {
    if (lowerPrompt.includes(term) && detectedActions.length === 0) {
      unsupportedTerms.push(term);
    }
  }

  if (detectedActions.length === 0 && unsupportedTerms.length === 0) {
    unsupportedTerms.push(prompt);
  }

  return { actions: detectedActions, unsupportedTerms, confidence };
}

export function generateNaturalLanguageSuggestions(
  prompt: string,
  existingNodes: readonly ColorNode[]
): AiSuggestion | null {
  const parsed = parseNaturalLanguageIntent(prompt);

  if (parsed.actions.length === 0) {
    return null;
  }

  const newNode = createColorNode(existingNodes.length + 1);
  const changedControls: SuggestionControlChange[] = [];

  let finalActions = [...parsed.actions];
  for (let i = 0; i < finalActions.length; i++) {
    const action = finalActions[i];
    const mapping = INTENT_MAPPINGS.find(m => m.intent === action);
    if (!mapping) continue;

    for (const incompatible of mapping.incompatibleWith ?? []) {
      const incompatibleIndex = finalActions.indexOf(incompatible);
      if (incompatibleIndex > -1) {
        finalActions.splice(incompatibleIndex, 1);
      }
    }
  }

  for (const action of finalActions) {
    const mapping = INTENT_MAPPINGS.find(m => m.intent === action);
    if (!mapping) continue;

    for (const [key, value] of Object.entries(mapping.primaries)) {
      if (key === "lift" || key === "gain") {
        const current = newNode.primaries[key as "lift" | "gain"] as RgbVector;
        const newVal = value as RgbVector;
        newNode.primaries[key as "lift" | "gain"] = {
          r: clampPrimary(current.r + newVal.r, PRIMARY_RANGES[key as "lift" | "gain"].min, PRIMARY_RANGES[key as "lift" | "gain"].max),
          g: clampPrimary(current.g + newVal.g, PRIMARY_RANGES[key as "lift" | "gain"].min, PRIMARY_RANGES[key as "lift" | "gain"].max),
          b: clampPrimary(current.b + newVal.b, PRIMARY_RANGES[key as "lift" | "gain"].min, PRIMARY_RANGES[key as "lift" | "gain"].max)
        };
      } else {
        const scalarKey = key as string;
        const current = newNode.primaries[key as keyof PrimaryCorrection] as number;
        const newVal = value as number;
        const rangeKey = key as keyof typeof PRIMARY_RANGES;
        const range = PRIMARY_RANGES[rangeKey];
        if (range) {
          (newNode.primaries as unknown as Record<string, number | RgbVector>)[scalarKey] = clampPrimary(
            current + newVal,
            range.min,
            range.max
          );
        }
      }

      changedControls.push({
        controlPath: `primaries.${key}`,
        before: existingNodes[0]?.primaries[key as keyof PrimaryCorrection] ?? 0,
        after: newNode.primaries[key as keyof PrimaryCorrection],
        reason: `Intent: ${action}`
      });
    }
  }

  const confidence: SuggestionConfidence = parsed.confidence > 0.7 ? "high" : parsed.confidence > 0.4 ? "medium" : "low";

  return {
    id: `nl-intent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    metadata: {
      type: "natural-language",
      confidence,
      risk: "safe",
      reason: `Intent: ${parsed.actions.join(", ") || "unsupported"}`,
      diagnostics: [],
      changedControls,
      profileAware: true,
      timestamp: Date.now()
    },
    suggestedNodes: [newNode]
  };
}

// ============================================================================
// AI Result Review
// ============================================================================

export interface ReviewState {
  accepted: AiSuggestion[];
  rejected: AiSuggestion[];
  pending: AiSuggestion[];
}

export const DEFAULT_REVIEW_STATE: ReviewState = {
  accepted: [],
  rejected: [],
  pending: []
};

export function applySuggestionToProject(
  existingNodes: ColorNode[],
  suggestion: AiSuggestion
): ColorNode[] {
  if (suggestion.suggestedNodes.length > 0) {
    return [...existingNodes, ...suggestion.suggestedNodes].slice(-3);
  }
  return existingNodes;
}
