import type { PowerWindow } from "../../shared/colorEngine";

export interface LumaFrame {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface TemplateMatchOptions {
  searchRadiusPx: number;
  minTemplateSizePx: number;
  minTextureStandardDeviation: number;
}

export interface TranslationMatch {
  dxPx: number;
  dyPx: number;
  confidence: number;
}

export class TrackingFailure extends Error {
  constructor(
    readonly frame: number,
    readonly reason: "bad-window" | "low-texture" | "object-out-of-frame" | "low-confidence",
    message: string
  ) {
    super(message);
    this.name = "TrackingFailure";
  }
}

interface PixelBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TemplateStats {
  samples: number[];
  mean: number;
  varianceSum: number;
  stride: number;
}

export function matchTranslation(
  sourceFrame: LumaFrame,
  targetFrame: LumaFrame,
  window: PowerWindow,
  frame: number,
  options: TemplateMatchOptions
): TranslationMatch {
  if (sourceFrame.width !== targetFrame.width || sourceFrame.height !== targetFrame.height) {
    throw new TrackingFailure(frame, "bad-window", `Tracking frames have mismatched dimensions at frame ${frame + 1}.`);
  }

  const bounds = getTemplateBounds(window, sourceFrame, frame, options.minTemplateSizePx);
  const template = readTemplateStats(sourceFrame, bounds);
  const standardDeviation = Math.sqrt(template.varianceSum / Math.max(1, template.samples.length));

  if (standardDeviation < options.minTextureStandardDeviation) {
    throw new TrackingFailure(frame, "low-texture", `Tracking target has too little texture at frame ${frame + 1}.`);
  }

  const searchRadius = Math.max(0, Math.round(options.searchRadiusPx));
  let best: TranslationMatch | undefined;

  for (let dy = -searchRadius; dy <= searchRadius; dy += 1) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 1) {
      if (!boundsFit(targetFrame, bounds.left + dx, bounds.top + dy, bounds.width, bounds.height)) {
        continue;
      }

      const confidence = scoreCandidate(targetFrame, bounds, dx, dy, template);
      if (!best || confidence > best.confidence) {
        best = { dxPx: dx, dyPx: dy, confidence };
      }
    }
  }

  if (!best) {
    throw new TrackingFailure(frame, "object-out-of-frame", `Tracking target leaves the frame at frame ${frame + 1}.`);
  }

  return best;
}

export function getScaledSearchRadius(width: number, height: number): number {
  const referenceScale = Math.min(width / 1920, height / 1080);
  return Math.max(8, Math.round(48 * referenceScale));
}

function getTemplateBounds(window: PowerWindow, sourceFrame: LumaFrame, frameIndex: number, minTemplateSizePx: number): PixelBounds {
  const width = Math.round(window.width * sourceFrame.width);
  const height = Math.round(window.height * sourceFrame.height);
  const left = Math.round(window.centerX * sourceFrame.width - width / 2);
  const top = Math.round(window.centerY * sourceFrame.height - height / 2);

  if (width < minTemplateSizePx || height < minTemplateSizePx || !boundsFit(sourceFrame, left, top, width, height)) {
    throw new TrackingFailure(frameIndex, "bad-window", `Tracking window is too small or outside the usable frame at frame ${frameIndex + 1}.`);
  }

  return { left, top, width, height };
}

function readTemplateStats(frame: LumaFrame, bounds: PixelBounds): TemplateStats {
  const stride = Math.max(1, Math.floor(Math.max(bounds.width, bounds.height) / 72));
  const samples: number[] = [];
  let sum = 0;

  for (let y = bounds.top; y < bounds.top + bounds.height; y += stride) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += stride) {
      const value = frame.data[y * frame.width + x];
      samples.push(value);
      sum += value;
    }
  }

  const mean = sum / Math.max(1, samples.length);
  let varianceSum = 0;
  for (const value of samples) {
    const centered = value - mean;
    varianceSum += centered * centered;
  }

  return { samples, mean, varianceSum, stride };
}

function scoreCandidate(
  frame: LumaFrame,
  bounds: PixelBounds,
  dx: number,
  dy: number,
  template: TemplateStats
): number {
  let targetSum = 0;
  let sampleIndex = 0;

  for (let y = bounds.top; y < bounds.top + bounds.height; y += template.stride) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += template.stride) {
      targetSum += frame.data[(y + dy) * frame.width + x + dx];
      sampleIndex += 1;
    }
  }

  const targetMean = targetSum / Math.max(1, sampleIndex);
  let numerator = 0;
  let targetVarianceSum = 0;
  sampleIndex = 0;

  for (let y = bounds.top; y < bounds.top + bounds.height; y += template.stride) {
    for (let x = bounds.left; x < bounds.left + bounds.width; x += template.stride) {
      const templateValue = template.samples[sampleIndex] - template.mean;
      const targetValue = frame.data[(y + dy) * frame.width + x + dx] - targetMean;
      numerator += templateValue * targetValue;
      targetVarianceSum += targetValue * targetValue;
      sampleIndex += 1;
    }
  }

  const denominator = Math.sqrt(template.varianceSum * targetVarianceSum);
  if (denominator <= 0.00001) {
    return 0;
  }

  return Math.max(0, Math.min(1, (numerator / denominator + 1) / 2));
}

function boundsFit(frame: LumaFrame, left: number, top: number, width: number, height: number): boolean {
  return left >= 0 && top >= 0 && left + width <= frame.width && top + height <= frame.height;
}
