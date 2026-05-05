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

export interface RgbParadeHistogram {
  width: number;
  height: number;
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  peak: number;
  samples: number;
}

export interface YrgbParadeHistogram {
  width: number;
  height: number;
  yBins: Float32Array;
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  peak: number;
  samples: number;
}

export interface YcbcrParadeHistogram {
  width: number;
  height: number;
  yBins: Float32Array;
  cbBins: Float32Array;
  crBins: Float32Array;
  peak: number;
  samples: number;
}

export interface HdrParadeHistogram {
  width: number;
  height: number;
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  peak: number;
  samples: number;
  maxNit: number;
}

export interface ChannelParadeHistogram {
  width: number;
  height: number;
  channelBins: Float32Array;
  peak: number;
  samples: number;
}

export function createRgbParadeHistogram(frame: RgbaFrame, width: number, height: number): RgbParadeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const redBins = new Float32Array(scopeWidth * scopeHeight);
  const greenBins = new Float32Array(scopeWidth * scopeHeight);
  const blueBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));

      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;

      const rBinY = Math.round((1 - r) * (scopeHeight - 1));
      const gBinY = Math.round((1 - g) * (scopeHeight - 1));
      const bBinY = Math.round((1 - b) * (scopeHeight - 1));

      const rBinIndex = rBinY * scopeWidth + binX;
      const gBinIndex = gBinY * scopeWidth + binX;
      const bBinIndex = bBinY * scopeWidth + binX;

      redBins[rBinIndex] += 1;
      greenBins[gBinIndex] += 1;
      blueBins[bBinIndex] += 1;

      peak = Math.max(peak, redBins[rBinIndex], greenBins[gBinIndex], blueBins[bBinIndex]);
      samples += 1;
    }
  }

  return {
    width: scopeWidth,
    height: scopeHeight,
    redBins,
    greenBins,
    blueBins,
    peak,
    samples
  };
}

export function createYrgbParadeHistogram(frame: RgbaFrame, width: number, height: number): YrgbParadeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const yBins = new Float32Array(scopeWidth * scopeHeight);
  const redBins = new Float32Array(scopeWidth * scopeHeight);
  const greenBins = new Float32Array(scopeWidth * scopeHeight);
  const blueBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;
      const luma = calculateRec709Luma(frame.data[index], frame.data[index + 1], frame.data[index + 2]);

      const yBinY = Math.round((1 - luma) * (scopeHeight - 1));
      const rBinY = Math.round((1 - r) * (scopeHeight - 1));
      const gBinY = Math.round((1 - g) * (scopeHeight - 1));
      const bBinY = Math.round((1 - b) * (scopeHeight - 1));

      yBins[yBinY * scopeWidth + binX] += 1;
      redBins[rBinY * scopeWidth + binX] += 1;
      greenBins[gBinY * scopeWidth + binX] += 1;
      blueBins[bBinY * scopeWidth + binX] += 1;

      peak = Math.max(peak, yBins[yBinY * scopeWidth + binX], redBins[rBinY * scopeWidth + binX], greenBins[gBinY * scopeWidth + binX], blueBins[bBinY * scopeWidth + binX]);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, yBins, redBins, greenBins, blueBins, peak, samples };
}

export function createYcbcrParadeHistogram(frame: RgbaFrame, width: number, height: number): YcbcrParadeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const yBins = new Float32Array(scopeWidth * scopeHeight);
  const cbBins = new Float32Array(scopeWidth * scopeHeight);
  const crBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const chroma = calculateRec709Chroma(frame.data[index], frame.data[index + 1], frame.data[index + 2]);

      const yBinY = Math.round((1 - chroma.y) * (scopeHeight - 1));
      const cbBinY = Math.round((1 - (chroma.cb + 0.5)) * (scopeHeight - 1));
      const crBinY = Math.round((1 - (chroma.cr + 0.5)) * (scopeHeight - 1));

      yBins[yBinY * scopeWidth + binX] += 1;
      cbBins[cbBinY * scopeWidth + binX] += 1;
      crBins[crBinY * scopeWidth + binX] += 1;

      peak = Math.max(peak, yBins[yBinY * scopeWidth + binX], cbBins[cbBinY * scopeWidth + binX], crBins[crBinY * scopeWidth + binX]);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, yBins, cbBins, crBins, peak, samples };
}

export function createHdrParadeHistogram(frame: RgbaFrame, width: number, height: number, maxNit: number = 1000): HdrParadeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const redBins = new Float32Array(scopeWidth * scopeHeight);
  const greenBins = new Float32Array(scopeWidth * scopeHeight);
  const blueBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;

      const rNit = r * maxNit;
      const gNit = g * maxNit;
      const bNit = b * maxNit;

      const rBinY = Math.round((1 - rNit / maxNit) * (scopeHeight - 1));
      const gBinY = Math.round((1 - gNit / maxNit) * (scopeHeight - 1));
      const bBinY = Math.round((1 - bNit / maxNit) * (scopeHeight - 1));

      redBins[rBinY * scopeWidth + binX] += 1;
      greenBins[gBinY * scopeWidth + binX] += 1;
      blueBins[bBinY * scopeWidth + binX] += 1;

      peak = Math.max(peak, redBins[rBinY * scopeWidth + binX], greenBins[gBinY * scopeWidth + binX], blueBins[bBinY * scopeWidth + binX]);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, redBins, greenBins, blueBins, peak, samples, maxNit };
}

export function createChannelParadeHistogram(frame: RgbaFrame, width: number, height: number, channel: "red" | "green" | "blue"): ChannelParadeHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const channelBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      let value: number;
      switch (channel) {
        case "red": value = frame.data[index] / 255; break;
        case "green": value = frame.data[index + 1] / 255; break;
        case "blue": value = frame.data[index + 2] / 255; break;
      }
      const binY = Math.round((1 - value) * (scopeHeight - 1));
      const binIndex = binY * scopeWidth + binX;
      const next = channelBins[binIndex] + 1;
      channelBins[binIndex] = next;
      peak = Math.max(peak, next);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, channelBins, peak, samples };
}

export function createLogHistogram(frame: RgbaFrame, binCount: number = 256): LogHistogram {
  const bins = sanitizeDimension(binCount);
  const redBins = new Float32Array(bins);
  const greenBins = new Float32Array(bins);
  const blueBins = new Float32Array(bins);
  const lumaBins = new Float32Array(bins);
  let peak = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i];
    const g = frame.data[i + 1];
    const b = frame.data[i + 2];
    const luma = calculateRec709Luma(r, g, b);

    const rBin = Math.min(bins - 1, Math.floor(Math.log1p(r) / Math.log1p(255) * (bins - 1)));
    const gBin = Math.min(bins - 1, Math.floor(Math.log1p(g) / Math.log1p(255) * (bins - 1)));
    const bBin = Math.min(bins - 1, Math.floor(Math.log1p(b) / Math.log1p(255) * (bins - 1)));
    const lumaBin = Math.min(bins - 1, Math.floor(Math.log1p(luma * 255) / Math.log1p(255) * (bins - 1)));

    redBins[rBin] += 1;
    greenBins[gBin] += 1;
    blueBins[bBin] += 1;
    lumaBins[lumaBin] += 1;

    peak = Math.max(peak, redBins[rBin], greenBins[gBin], blueBins[bBin], lumaBins[lumaBin]);
    samples += 1;
  }

  return { redBins, greenBins, blueBins, lumaBins, peak, samples };
}

export function createCumulativeHistogram(frame: RgbaFrame, binCount: number = 256): CumulativeHistogram {
  const result = createRgbHistogram(frame, binCount);
  let totalPixels = 0;

  const redCumulative = new Float32Array(result.redBins.length);
  const greenCumulative = new Float32Array(result.greenBins.length);
  const blueCumulative = new Float32Array(result.blueBins.length);
  const lumaCumulative = new Float32Array(result.lumaBins.length);

  for (let i = 0; i < result.redBins.length; i += 1) {
    totalPixels += result.redBins[i] + result.greenBins[i] + result.blueBins[i] + result.lumaBins[i];
  }

  let redSum = 0, greenSum = 0, blueSum = 0, lumaSum = 0;
  for (let i = 0; i < result.redBins.length; i += 1) {
    redSum += result.redBins[i];
    greenSum += result.greenBins[i];
    blueSum += result.blueBins[i];
    lumaSum += result.lumaBins[i];
    redCumulative[i] = redSum;
    greenCumulative[i] = greenSum;
    blueCumulative[i] = blueSum;
    lumaCumulative[i] = lumaSum;
  }

  return {
    redBins: redCumulative,
    greenBins: greenCumulative,
    blueBins: blueCumulative,
    lumaBins: lumaCumulative,
    peak: result.peak,
    samples: result.samples,
    totalPixels
  };
}

export function createSaturationHistogram(frame: RgbaFrame, binCount: number = 360): SaturationHistogram {
  const bins = sanitizeDimension(binCount);
  const saturationBins = new Float32Array(bins);
  let peak = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i] / 255;
    const g = frame.data[i + 1] / 255;
    const b = frame.data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;
    const bin = Math.min(bins - 1, Math.floor(saturation * (bins - 1)));
    const next = saturationBins[bin] + 1;
    saturationBins[bin] = next;
    peak = Math.max(peak, next);
    samples += 1;
  }

  return { saturationBins, peak, samples };
}

export function createHueHistogram(frame: RgbaFrame, binCount: number = 360): HueHistogram {
  const bins = sanitizeDimension(binCount);
  const hueBins = new Float32Array(bins);
  let peak = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i] / 255;
    const g = frame.data[i + 1] / 255;
    const b = frame.data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta > 0) {
      if (max === r) {
        hue = ((g - b) / delta) % 6;
      } else if (max === g) {
        hue = (b - r) / delta + 2;
      } else {
        hue = (r - g) / delta + 4;
      }
    }
    hue = hue < 0 ? hue + 6 : hue;
    const bin = Math.min(bins - 1, Math.floor(hue / 6 * (bins - 1)));
    const next = hueBins[bin] + 1;
    hueBins[bin] = next;
    peak = Math.max(peak, next);
    samples += 1;
  }

  return { hueBins, peak, samples };
}

export function createZoneHistogram(frame: RgbaFrame): ZoneHistogram {
  const zoneBins = new Float32Array(10);
  const zoneNames = ["Blacks", "Shadows", "Dark", "Mid-Dark", "Mid", "Mid-Light", "Light", "Bright", "Highlights", "White"];
  let peak = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const luma = calculateRec709Luma(frame.data[i], frame.data[i + 1], frame.data[i + 2]);
    const zone = Math.min(9, Math.floor(luma * 10));
    const next = zoneBins[zone] + 1;
    zoneBins[zone] = next;
    peak = Math.max(peak, next);
    samples += 1;
  }

  return { zoneBins, zoneNames, peak, samples };
}

export function createCieHistogram(frame: RgbaFrame, size: number, variant: "cie1931" | "cie1976" = "cie1931"): CieHistogram {
  const scopeSize = sanitizeDimension(size);
  const bins = new Float32Array(scopeSize * scopeSize);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;

      const [cx, cy] = rgbToXyz(r, g, b);
      let binX: number, binY: number;

      if (variant === "cie1976") {
        const u = 4 * cx / (-2 * cx + 12 * cy + 3);
        const v = 9 * cy / (-2 * cx + 12 * cy + 3);
        binX = Math.round(u * scopeSize);
        binY = Math.round((1 - v) * scopeSize);
      } else {
        binX = Math.round(cx * scopeSize);
        binY = Math.round((1 - cy) * scopeSize);
      }

      if (binX < 0 || binX >= scopeSize || binY < 0 || binY >= scopeSize) continue;
      const binIndex = binY * scopeSize + binX;
      const next = bins[binIndex] + 1;
      bins[binIndex] = next;
      peak = Math.max(peak, next);
      samples += 1;
    }
  }

  return { width: scopeSize, height: scopeSize, bins, peak, samples, variant };
}

function rgbToXyz(r: number, g: number, b: number): [number, number] {
  const rl = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const gl = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const bl = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  const sum = x + y + z;
  return sum > 0 ? [x / sum, y / sum] : [0, 0];
}

export function analyzeExposureMonitor(frame: RgbaFrame): ExposureMonitorStats {
  let shadows = 0, blacks = 0, darks = 0, midtones = 0, lights = 0, highlights = 0, whites = 0, superBlacks = 0, superWhites = 0, clipping = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const luma = calculateRec709Luma(frame.data[i], frame.data[i + 1], frame.data[i + 2]) * 100;
    samples += 1;

    if (luma <= 0) { superBlacks += 1; }
    else if (luma < 10) { blacks += 1; }
    else if (luma < 25) { shadows += 1; }
    else if (luma < 45) { darks += 1; }
    else if (luma < 55) { midtones += 1; }
    else if (luma < 70) { lights += 1; }
    else if (luma < 90) { highlights += 1; }
    else if (luma < 100) { whites += 1; }
    else if (luma >= 100) { superWhites += 1; }

    if (luma >= 100) clipping += 1;
    else if (luma <= 0) clipping += 1;
  }

  return { shadows, blacks, darks, midtones, lights, highlights, whites, superBlacks, superWhites, clipping, samples };
}

export function classifyPixelFalseColor(
  r: number,
  g: number,
  b: number,
  isHdr: boolean,
  maxNit: number = 1000
): FalseColorRange | undefined {
  const luma = calculateRec709Luma(r, g, b);
  const nitValue = isHdr ? luma * maxNit : luma * 100;
  const ranges = isHdr ? FALSE_COLOR_RANGES_HDR : FALSE_COLOR_RANGES_SDR;

  for (const range of ranges) {
    if (nitValue >= range.min && nitValue < range.max) {
      return range;
    }
  }
  return undefined;
}

export function createFalseColorOverlay(frame: RgbaFrame, isHdr: boolean, maxNit: number = 1000): Uint8ClampedArray {
  const output = new Uint8ClampedArray(frame.data.length);

  for (let i = 0; i < frame.data.length; i += 4) {
    const range = classifyPixelFalseColor(frame.data[i], frame.data[i + 1], frame.data[i + 2], isHdr, maxNit);
    if (range) {
      const colorMatch = range.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (colorMatch) {
        output[i] = parseInt(colorMatch[1]);
        output[i + 1] = parseInt(colorMatch[2]);
        output[i + 2] = parseInt(colorMatch[3]);
        output[i + 3] = 180;
      } else {
        output[i] = frame.data[i];
        output[i + 1] = frame.data[i + 1];
        output[i + 2] = frame.data[i + 2];
        output[i + 3] = 180;
      }
    } else {
      output[i] = frame.data[i];
      output[i + 1] = frame.data[i + 1];
      output[i + 2] = frame.data[i + 2];
      output[i + 3] = frame.data[i + 3];
    }
  }

  return output;
}

export interface LogHistogram {
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  lumaBins: Float32Array;
  peak: number;
  samples: number;
}

export interface CumulativeHistogram {
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  lumaBins: Float32Array;
  peak: number;
  samples: number;
  totalPixels: number;
}

export interface SaturationHistogram {
  saturationBins: Float32Array;
  peak: number;
  samples: number;
}

export interface HueHistogram {
  hueBins: Float32Array;
  peak: number;
  samples: number;
}

export interface ZoneHistogram {
  zoneBins: Float32Array;
  zoneNames: string[];
  peak: number;
  samples: number;
}

export interface CieHistogram {
  width: number;
  height: number;
  bins: Float32Array;
  peak: number;
  samples: number;
  variant: "cie1931" | "cie1976";
}

export interface FalseColorRange {
  min: number;
  max: number;
  label: string;
  color: string;
}

export interface ExposureMonitorStats {
  shadows: number;
  blacks: number;
  darks: number;
  midtones: number;
  lights: number;
  highlights: number;
  whites: number;
  superBlacks: number;
  superWhites: number;
  clipping: number;
  samples: number;
}

export const FALSE_COLOR_RANGES_SDR: FalseColorRange[] = [
  { min: 0, max: 10, label: "Blacks", color: "rgba(30, 30, 80, 0.6)" },
  { min: 10, max: 25, label: "Shadows", color: "rgba(0, 0, 120, 0.6)" },
  { min: 25, max: 45, label: "Dark Mid", color: "rgba(0, 60, 120, 0.6)" },
  { min: 45, max: 55, label: "Midtones", color: "rgba(0, 100, 0, 0.6)" },
  { min: 55, max: 70, label: "Light Mid", color: "rgba(120, 120, 0, 0.6)" },
  { min: 70, max: 90, label: "Highlights", color: "rgba(180, 0, 0, 0.6)" },
  { min: 90, max: 100, label: "Whites", color: "rgba(255, 255, 255, 0.6)" }
];

export const FALSE_COLOR_RANGES_HDR: FalseColorRange[] = [
  { min: 0, max: 100, label: "<100 nit", color: "rgba(0, 0, 180, 0.6)" },
  { min: 100, max: 203, label: "100-203 nit", color: "rgba(0, 180, 0, 0.6)" },
  { min: 203, max: 500, label: "203-500 nit", color: "rgba(180, 120, 0, 0.6)" },
  { min: 500, max: 1000, label: "500-1000 nit", color: "rgba(180, 0, 0, 0.6)" },
  { min: 1000, max: 4000, label: "1-4k nit", color: "rgba(255, 100, 0, 0.6)" },
  { min: 4000, max: 10000, label: "4-10k nit", color: "rgba(255, 0, 0, 0.6)" },
  { min: 10000, max: Infinity, label: ">10k nit", color: "rgba(255, 255, 0, 0.6)" }
];

export interface RgbHistogram {
  redBins: Uint32Array;
  greenBins: Uint32Array;
  blueBins: Uint32Array;
  lumaBins: Uint32Array;
  peak: number;
  samples: number;
}

export interface YcbcrWaveformHistogram {
  width: number;
  height: number;
  yBins: Float32Array;
  cbBins: Float32Array;
  crBins: Float32Array;
  peak: number;
  samples: number;
}

export interface HdrWaveformHistogram {
  width: number;
  height: number;
  bins: Float32Array;
  peak: number;
  samples: number;
  maxNit: number;
}

export interface ChannelWaveformHistogram {
  width: number;
  height: number;
  redBins: Float32Array;
  greenBins: Float32Array;
  blueBins: Float32Array;
  peak: number;
  samples: number;
}

export function createYcbcrWaveformHistogram(frame: RgbaFrame, width: number, height: number): YcbcrWaveformHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const yBins = new Float32Array(scopeWidth * scopeHeight);
  const cbBins = new Float32Array(scopeWidth * scopeHeight);
  const crBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const chroma = calculateRec709Chroma(frame.data[index], frame.data[index + 1], frame.data[index + 2]);
      const luma = chroma.y;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const yBinY = Math.round((1 - luma) * (scopeHeight - 1));
      const cbBinY = Math.round((1 - (chroma.cb + 0.5)) * (scopeHeight - 1));
      const crBinY = Math.round((1 - (chroma.cr + 0.5)) * (scopeHeight - 1));

      yBins[yBinY * scopeWidth + binX] += 1;
      cbBins[cbBinY * scopeWidth + binX] += 1;
      crBins[crBinY * scopeWidth + binX] += 1;

      peak = Math.max(peak, yBins[yBinY * scopeWidth + binX], cbBins[cbBinY * scopeWidth + binX], crBins[crBinY * scopeWidth + binX]);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, yBins, cbBins, crBins, peak, samples };
}

export function createHdrWaveformHistogram(frame: RgbaFrame, width: number, height: number, maxNit: number = 1000): HdrWaveformHistogram {
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
      const nitValue = luma * maxNit;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));
      const binY = Math.round((1 - nitValue / maxNit) * (scopeHeight - 1));
      const binIndex = binY * scopeWidth + binX;
      const next = bins[binIndex] + 1;
      bins[binIndex] = next;
      peak = Math.max(peak, next);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, bins, peak, samples, maxNit };
}

export function createChannelWaveformHistogram(frame: RgbaFrame, width: number, height: number): ChannelWaveformHistogram {
  const scopeWidth = sanitizeDimension(width);
  const scopeHeight = sanitizeDimension(height);
  const redBins = new Float32Array(scopeWidth * scopeHeight);
  const greenBins = new Float32Array(scopeWidth * scopeHeight);
  const blueBins = new Float32Array(scopeWidth * scopeHeight);
  const maxSourceX = Math.max(1, frame.width - 1);
  let peak = 0;
  let samples = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;
      const binX = Math.round((x / maxSourceX) * (scopeWidth - 1));

      const rBinY = Math.round((1 - r) * (scopeHeight - 1));
      const gBinY = Math.round((1 - g) * (scopeHeight - 1));
      const bBinY = Math.round((1 - b) * (scopeHeight - 1));

      redBins[rBinY * scopeWidth + binX] += 1;
      greenBins[gBinY * scopeWidth + binX] += 1;
      blueBins[bBinY * scopeWidth + binX] += 1;

      peak = Math.max(peak, redBins[rBinY * scopeWidth + binX], greenBins[gBinY * scopeWidth + binX], blueBins[bBinY * scopeWidth + binX]);
      samples += 1;
    }
  }

  return { width: scopeWidth, height: scopeHeight, redBins, greenBins, blueBins, peak, samples };
}

export function createRgbHistogram(frame: RgbaFrame, binCount: number = 256): RgbHistogram {
  const bins = sanitizeDimension(binCount);
  const redBins = new Uint32Array(bins);
  const greenBins = new Uint32Array(bins);
  const blueBins = new Uint32Array(bins);
  const lumaBins = new Uint32Array(bins);
  let peak = 0;
  let samples = 0;

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i];
    const g = frame.data[i + 1];
    const b = frame.data[i + 2];

    const luma = calculateRec709Luma(r, g, b);

    const rBin = Math.min(bins - 1, Math.floor(r * (bins / 256)));
    const gBin = Math.min(bins - 1, Math.floor(g * (bins / 256)));
    const bBin = Math.min(bins - 1, Math.floor(b * (bins / 256)));
    const lumaBin = Math.min(bins - 1, Math.floor(luma * (bins - 1)));

    redBins[rBin] += 1;
    greenBins[gBin] += 1;
    blueBins[bBin] += 1;
    lumaBins[lumaBin] += 1;

    peak = Math.max(peak, redBins[rBin], greenBins[gBin], blueBins[bBin], lumaBins[lumaBin]);
    samples += 1;
  }

  return {
    redBins,
    greenBins,
    blueBins,
    lumaBins,
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
