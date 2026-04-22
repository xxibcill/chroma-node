import type { ColorNode, Pixel } from "../../shared/colorEngine";
import { REC709_LUMA, evaluateNodeGraph } from "../../shared/colorEngine";

export interface RgbaFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface ScopeHistogram {
  width: number;
  height: number;
  bins: Float32Array;
  peak: number;
  samples: number;
}

export interface VectorscopeGuide {
  label: string;
  x: number;
  y: number;
}

export const VECTORSCOPE_CHROMA_SCALE = 0.5;

const HUE_GUIDE_COLORS = [
  { label: "R", pixel: { r: 1, g: 0, b: 0 } },
  { label: "Y", pixel: { r: 1, g: 1, b: 0 } },
  { label: "G", pixel: { r: 0, g: 1, b: 0 } },
  { label: "C", pixel: { r: 0, g: 1, b: 1 } },
  { label: "B", pixel: { r: 0, g: 0, b: 1 } },
  { label: "M", pixel: { r: 1, g: 0, b: 1 } }
] as const satisfies readonly { label: string; pixel: Pixel }[];

export function createGradedScopeFrame(source: RgbaFrame, nodes: readonly ColorNode[]): RgbaFrame {
  const output = new Uint8ClampedArray(source.data.length);
  const maxX = Math.max(1, source.width - 1);
  const maxY = Math.max(1, source.height - 1);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const graded = evaluateNodeGraph(
        {
          r: source.data[index] / 255,
          g: source.data[index + 1] / 255,
          b: source.data[index + 2] / 255,
          a: source.data[index + 3] / 255
        },
        nodes,
        {
          x: x / maxX,
          y: y / maxY
        }
      );

      output[index] = Math.round(clamp01(graded.r) * 255);
      output[index + 1] = Math.round(clamp01(graded.g) * 255);
      output[index + 2] = Math.round(clamp01(graded.b) * 255);
      output[index + 3] = source.data[index + 3];
    }
  }

  return {
    width: source.width,
    height: source.height,
    data: output
  };
}

export function createWaveformHistogram(frame: RgbaFrame, width: number, height: number): ScopeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const bins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const luma = calculateRec709Luma(frame.data[index], frame.data[index + 1], frame.data[index + 2]);
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const binY = Math.round((1 - luma) * (scopeHeight - 1));
      const binIndex = binY * scopeWidth + binX;
      const next = bins[binIndex] + 1;
      bins[binIndex] = next;
      peak = Math.max(peak, next);
      samples += 1;
    }
  }

  return {
    width: scopeWidth,
    height: scopeHeight,
    bins,
    peak,
    samples
  };
}

export function createVectorscopeHistogram(frame: RgbaFrame, size: number): ScopeHistogram {
  const scopeSize = sanitizeDimension(size);
  const bins = new Float32Array(scopeSize * scopeSize);
  const center = (scopeSize - 1) / 2;
  const radius = center * 0.92;
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const chroma = calculateRec709Chroma(frame.data[index], frame.data[index + 1], frame.data[index + 2]);
      const binX = Math.round(center + (chroma.cb / VECTORSCOPE_CHROMA_SCALE) * radius);
      const binY = Math.round(center - (chroma.cr / VECTORSCOPE_CHROMA_SCALE) * radius);

      if (binX < 0 || binX >= scopeSize || binY < 0 || binY >= scopeSize) {
        continue;
      }

      const binIndex = binY * scopeSize + binX;
      const next = bins[binIndex] + 1;
      bins[binIndex] = next;
      peak = Math.max(peak, next);
      samples += 1;
    }
  }

  return {
    width: scopeSize,
    height: scopeSize,
    bins,
    peak,
    samples
  };
}

export function createVectorscopeGuides(size: number): VectorscopeGuide[] {
  const scopeSize = sanitizeDimension(size);
  const center = (scopeSize - 1) / 2;
  const radius = center * 0.92;

  return HUE_GUIDE_COLORS.map(({ label, pixel }) => {
    const chroma = calculateRec709Chroma(pixel.r * 255, pixel.g * 255, pixel.b * 255);

    return {
      label,
      x: center + (chroma.cb / VECTORSCOPE_CHROMA_SCALE) * radius,
      y: center - (chroma.cr / VECTORSCOPE_CHROMA_SCALE) * radius
    };
  });
}

export function calculateRec709Luma(red: number, green: number, blue: number): number {
  return clamp01(
    red / 255 * REC709_LUMA.r +
    green / 255 * REC709_LUMA.g +
    blue / 255 * REC709_LUMA.b
  );
}

export function calculateRec709Chroma(red: number, green: number, blue: number): { y: number; cb: number; cr: number } {
  const r = clamp01(red / 255);
  const g = clamp01(green / 255);
  const b = clamp01(blue / 255);
  const y = r * REC709_LUMA.r + g * REC709_LUMA.g + b * REC709_LUMA.b;

  return {
    y,
    cb: (b - y) / 1.8556,
    cr: (r - y) / 1.5748
  };
}

function sanitizeDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
