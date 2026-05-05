import type {
  ScopeHistogram,
  VectorscopeGuide,
  RgbParadeHistogram,
  RgbHistogram,
  YcbcrWaveformHistogram,
  HdrWaveformHistogram,
  ChannelWaveformHistogram,
  YrgbParadeHistogram,
  YcbcrParadeHistogram,
  HdrParadeHistogram,
  ChannelParadeHistogram,
  LogHistogram,
  CumulativeHistogram,
  SaturationHistogram,
  HueHistogram,
  ZoneHistogram,
  CieHistogram,
  ExposureMonitorStats
} from "./scopeAnalysis";
import type { RgbaFrame } from "./scopeAnalysis";

export function drawWaveformScope(canvas: HTMLCanvasElement, histogram: ScopeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawWaveformBackplane(context, width, height);
  drawWaveformGrid(context, width, height, "underlay");
  drawWaveformTrace(context, histogram, width, height);
  drawWaveformGrid(context, width, height, "overlay");
  drawWaveformLabels(context, width, height);
}

export function drawRgbParadeScope(canvas: HTMLCanvasElement, histogram: RgbParadeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);
  const segmentWidth = Math.floor(width / 3);

  drawScopeBase(context, width, height);

  const redHistogram: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.redBins, peak: histogram.peak, samples: histogram.samples };
  const greenHistogram: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.greenBins, peak: histogram.peak, samples: histogram.samples };
  const blueHistogram: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.blueBins, peak: histogram.peak, samples: histogram.samples };

  drawParadeChannel(context, redHistogram, 0, segmentWidth, height);
  drawParadeChannel(context, greenHistogram, segmentWidth, segmentWidth * 2, height);
  drawParadeChannel(context, blueHistogram, segmentWidth * 2, width, height);

  drawParadeLabels(context, width, height, segmentWidth);
}

export function drawYrgbParadeScope(canvas: HTMLCanvasElement, histogram: YrgbParadeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);
  const segmentWidth = Math.floor(width / 4);

  drawScopeBase(context, width, height);

  const yHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.yBins, peak: histogram.peak, samples: histogram.samples };
  const rHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.redBins, peak: histogram.peak, samples: histogram.samples };
  const gHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.greenBins, peak: histogram.peak, samples: histogram.samples };
  const bHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.blueBins, peak: histogram.peak, samples: histogram.samples };

  drawParadeChannel(context, yHist, 0, segmentWidth, height);
  drawParadeChannel(context, rHist, segmentWidth, segmentWidth * 2, height);
  drawParadeChannel(context, gHist, segmentWidth * 2, segmentWidth * 3, height);
  drawParadeChannel(context, bHist, segmentWidth * 3, width, height);

  drawYrgbParadeLabels(context, width, height, segmentWidth);
}

export function drawYcbcrParadeScope(canvas: HTMLCanvasElement, histogram: YcbcrParadeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);
  const segmentWidth = Math.floor(width / 3);

  drawScopeBase(context, width, height);

  const yHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.yBins, peak: histogram.peak, samples: histogram.samples };
  const cbHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.cbBins, peak: histogram.peak, samples: histogram.samples };
  const crHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.crBins, peak: histogram.peak, samples: histogram.samples };

  drawParadeChannel(context, yHist, 0, segmentWidth, height);
  drawParadeChannel(context, cbHist, segmentWidth, segmentWidth * 2, height);
  drawParadeChannel(context, crHist, segmentWidth * 2, width, height);

  drawYcbcrParadeLabels(context, width, height, segmentWidth);
}

export function drawHdrParadeScope(canvas: HTMLCanvasElement, histogram: HdrParadeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);
  const segmentWidth = Math.floor(width / 3);

  drawScopeBase(context, width, height);
  drawHdrBackplane(context, width, height, histogram.maxNit);

  const rHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.redBins, peak: histogram.peak, samples: histogram.samples };
  const gHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.greenBins, peak: histogram.peak, samples: histogram.samples };
  const bHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.blueBins, peak: histogram.peak, samples: histogram.samples };

  drawParadeChannel(context, rHist, 0, segmentWidth, height);
  drawParadeChannel(context, gHist, segmentWidth, segmentWidth * 2, height);
  drawParadeChannel(context, bHist, segmentWidth * 2, width, height);

  drawHdrParadeLabels(context, width, height, segmentWidth, histogram.maxNit);
}

export function drawChannelParadeScope(canvas: HTMLCanvasElement, histogram: ChannelParadeHistogram, channelLabel: string, channelColor: string): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);

  const channelHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.channelBins, peak: histogram.peak, samples: histogram.samples };
  drawParadeChannel(context, channelHist, 0, width, height);
  drawSingleParadeLabel(context, width, height, channelLabel, channelColor);
}

export function drawRgbHistogram(canvas: HTMLCanvasElement, histogram: RgbHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawRgbHistogramBars(context, histogram, width, height);
}

export function drawVectorscope(
  canvas: HTMLCanvasElement,
  histogram: ScopeHistogram,
  guides: readonly VectorscopeGuide[]
): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.42;

  drawScopeBase(context, width, height);
  drawHistogram(context, histogram, width, height, {
    red: 126,
    green: 199,
    blue: 164,
    alphaScale: 0.9
  });
  drawVectorGrid(context, centerX, centerY, radius);
  drawVectorGuides(context, guides, histogram.width, centerX, centerY, radius);
}

export function clearScopeCanvas(canvas: HTMLCanvasElement, label: string): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  context.fillStyle = "#716f61";
  context.font = "700 12px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, width / 2, height / 2);
}

function prepareCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor((canvas.clientWidth || canvas.width) * pixelRatio));
  const height = Math.max(1, Math.floor((canvas.clientHeight || canvas.height) * pixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create scope canvas context.");
  }

  context.setTransform(1, 0, 0, 1, 0, 0);
  return context;
}

function getCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
  return {
    width: canvas.width,
    height: canvas.height
  };
}

function drawScopeBase(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#05070b";
  context.fillRect(0, 0, width, height);
}

function drawWaveformBackplane(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();

  const topLegal = Math.round(height * 0.1);
  const bottomLegal = Math.round(height * 0.9);

  context.fillStyle = "rgba(225, 178, 94, 0.045)";
  context.fillRect(0, 0, width, topLegal);
  context.fillRect(0, bottomLegal, width, height - bottomLegal);

  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(103, 124, 150, 0.035)");
  gradient.addColorStop(0.5, "rgba(103, 124, 150, 0)");
  gradient.addColorStop(1, "rgba(103, 124, 150, 0.035)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.restore();
}

function drawWaveformGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  layer: "underlay" | "overlay"
): void {
  context.save();

  const majorAlpha = layer === "overlay" ? 0.28 : 0.16;
  const minorAlpha = layer === "overlay" ? 0.12 : 0.07;
  const verticalAlpha = layer === "overlay" ? 0.1 : 0.06;

  context.lineWidth = 1;

  context.strokeStyle = `rgba(192, 205, 221, ${minorAlpha})`;
  for (const ire of [10, 20, 30, 40, 60, 70, 80, 90]) {
    const y = height - (ire / 100) * height;
    context.beginPath();
    context.moveTo(0, Math.round(y) + 0.5);
    context.lineTo(width, Math.round(y) + 0.5);
    context.stroke();
  }

  for (const ire of [0, 25, 50, 75, 100]) {
    const y = height - (ire / 100) * height;
    context.strokeStyle = ire === 50
      ? `rgba(241, 219, 177, ${Math.min(majorAlpha + 0.12, 0.42)})`
      : `rgba(215, 224, 237, ${majorAlpha})`;
    context.lineWidth = ire === 50 ? 1.5 : 1;
    context.beginPath();
    context.moveTo(0, Math.round(y) + 0.5);
    context.lineTo(width, Math.round(y) + 0.5);
    context.stroke();
  }

  context.strokeStyle = `rgba(192, 205, 221, ${verticalAlpha})`;
  context.lineWidth = 1;
  for (const x of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
    const position = Math.round(width * x) + 0.5;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, height);
    context.stroke();
  }

  context.restore();
}

function drawWaveformLabels(context: CanvasRenderingContext2D, width: number, height: number): void {
  const pixelRatio = getPixelRatio();
  const gutterWidth = Math.round(38 * pixelRatio);
  const labelPadding = Math.round(7 * pixelRatio);

  context.save();

  const labelGradient = context.createLinearGradient(width - gutterWidth, 0, width, 0);
  labelGradient.addColorStop(0, "rgba(5, 7, 11, 0)");
  labelGradient.addColorStop(0.35, "rgba(5, 7, 11, 0.66)");
  labelGradient.addColorStop(1, "rgba(5, 7, 11, 0.9)");
  context.fillStyle = labelGradient;
  context.fillRect(width - gutterWidth, 0, gutterWidth, height);

  context.fillStyle = "rgba(233, 239, 248, 0.82)";
  context.font = `700 ${Math.round(10 * pixelRatio)}px system-ui, sans-serif`;
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (const ire of [0, 25, 50, 75, 100]) {
    const y = height - (ire / 100) * height;
    context.fillText(String(ire), width - labelPadding, Math.max(labelPadding, Math.min(height - labelPadding, y)));
  }

  context.restore();
}

function drawWaveformTrace(
  context: CanvasRenderingContext2D,
  histogram: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (histogram.peak <= 0) {
    return;
  }

  const tonePeak = calculateTonePeak(histogram.bins, histogram.peak);
  const core = context.createImageData(canvasWidth, canvasHeight);
  const halo = context.createImageData(canvasWidth, canvasHeight);
  const xScale = histogram.width / canvasWidth;
  const yScale = histogram.height / canvasHeight;
  const toneDenominator = Math.log1p(tonePeak);

  for (let y = 0; y < canvasHeight; y += 1) {
    const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
    for (let x = 0; x < canvasWidth; x += 1) {
      const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
      const density = histogram.bins[sourceY * histogram.width + sourceX];
      if (density <= 0) {
        continue;
      }

      const normalized = Math.min(1, Math.log1p(density) / toneDenominator);
      const coreStrength = Math.pow(normalized, 0.58);
      const haloStrength = Math.pow(normalized, 1.15);
      const imageIndex = (y * canvasWidth + x) * 4;
      const warmth = Math.pow(normalized, 0.85);

      core.data[imageIndex] = mixChannel(145, 255, warmth);
      core.data[imageIndex + 1] = mixChannel(155, 226, warmth);
      core.data[imageIndex + 2] = mixChannel(117, 154, warmth);
      core.data[imageIndex + 3] = Math.round(42 + coreStrength * 198);

      halo.data[imageIndex] = 215;
      halo.data[imageIndex + 1] = 171;
      halo.data[imageIndex + 2] = 82;
      halo.data[imageIndex + 3] = Math.round(haloStrength * 76);
    }
  }

  const traceCanvas = document.createElement("canvas");
  traceCanvas.width = canvasWidth;
  traceCanvas.height = canvasHeight;

  const traceContext = traceCanvas.getContext("2d");
  if (!traceContext) {
    return;
  }

  traceContext.putImageData(halo, 0, 0);

  context.save();
  context.globalCompositeOperation = "screen";
  context.filter = `blur(${Math.max(1, getPixelRatio() * 0.65)}px)`;
  context.drawImage(traceCanvas, 0, 0);

  context.filter = "none";
  traceContext.clearRect(0, 0, canvasWidth, canvasHeight);
  traceContext.putImageData(core, 0, 0);
  context.drawImage(traceCanvas, 0, 0);
  context.restore();
}

function calculateTonePeak(bins: Float32Array, absolutePeak: number): number {
  const peakBucket = Math.max(1, Math.ceil(absolutePeak));
  const buckets = new Uint32Array(peakBucket + 1);
  let occupied = 0;

  for (let index = 0; index < bins.length; index += 1) {
    const density = bins[index];
    if (density > 0) {
      const bucket = Math.min(peakBucket, Math.max(1, Math.round(density)));
      buckets[bucket] += 1;
      occupied += 1;
    }
  }

  if (occupied === 0) {
    return Math.max(1, absolutePeak);
  }

  const percentileRank = Math.max(1, Math.floor(occupied * 0.985));
  let cumulative = 0;

  for (let bucket = 1; bucket < buckets.length; bucket += 1) {
    cumulative += buckets[bucket];
    if (cumulative >= percentileRank) {
      return bucket;
    }
  }

  return Math.max(1, absolutePeak);
}

function mixChannel(start: number, end: number, amount: number): number {
  return Math.round(start + (end - start) * amount);
}

function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}

function drawVectorGrid(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
  context.save();
  context.strokeStyle = "rgba(238, 233, 216, 0.14)";
  context.lineWidth = 1;

  for (const scale of [0.33, 0.66, 1]) {
    context.beginPath();
    context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
    context.stroke();
  }

  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
    context.stroke();
  }

  context.strokeStyle = "rgba(213, 177, 79, 0.42)";
  const skinRadians = -123 * Math.PI / 180;
  context.beginPath();
  context.moveTo(centerX, centerY);
  context.lineTo(centerX + Math.cos(skinRadians) * radius, centerY + Math.sin(skinRadians) * radius);
  context.stroke();
  context.restore();
}

function drawVectorGuides(
  context: CanvasRenderingContext2D,
  guides: readonly VectorscopeGuide[],
  guideSize: number,
  centerX: number,
  centerY: number,
  radius: number
): void {
  const guideCenter = (guideSize - 1) / 2;

  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.68)";
  context.strokeStyle = "rgba(236, 232, 220, 0.28)";
  context.font = "800 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const guide of guides) {
    const x = centerX + ((guide.x - guideCenter) / guideCenter) * radius;
    const y = centerY + ((guide.y - guideCenter) / guideCenter) * radius;
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.stroke();
    context.fillText(guide.label, x, y - 11);
  }

  context.restore();
}

function drawHistogram(
  context: CanvasRenderingContext2D,
  histogram: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number,
  color: { red: number; green: number; blue: number; alphaScale: number }
): void {
  if (histogram.peak <= 0) {
    return;
  }

  const imageData = context.createImageData(canvasWidth, canvasHeight);
  const xScale = histogram.width / canvasWidth;
  const yScale = histogram.height / canvasHeight;

  for (let y = 0; y < canvasHeight; y += 1) {
    const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
    for (let x = 0; x < canvasWidth; x += 1) {
      const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
      const density = histogram.bins[sourceY * histogram.width + sourceX];
      if (density <= 0) {
        continue;
      }

      const alpha = Math.min(255, Math.round(Math.sqrt(density / histogram.peak) * 255 * color.alphaScale));
      const index = (y * canvasWidth + x) * 4;
      imageData.data[index] = color.red;
      imageData.data[index + 1] = color.green;
      imageData.data[index + 2] = color.blue;
      imageData.data[index + 3] = alpha;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function drawRgbHistogramBars(
  context: CanvasRenderingContext2D,
  histogram: RgbHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) {
    return;
  }

  const barWidth = Math.floor(width / 256);
  const maxBarHeight = height - 20;

  context.save();

  const channels = [
    { bins: histogram.redBins, color: "rgba(220, 80, 80, 0.7)" },
    { bins: histogram.greenBins, color: "rgba(80, 200, 80, 0.7)" },
    { bins: histogram.blueBins, color: "rgba(80, 120, 220, 0.7)" },
    { bins: histogram.lumaBins, color: "rgba(200, 200, 200, 0.5)" }
  ];

  for (const channel of channels) {
    context.fillStyle = channel.color;
    for (let i = 0; i < 256; i += 1) {
      const barHeight = (channel.bins[i] / histogram.peak) * maxBarHeight;
      const x = i * barWidth;
      context.fillRect(x, height - 10 - barHeight, barWidth - 1, barHeight);
    }
  }

  context.restore();
}

function drawParadeChannel(
  context: CanvasRenderingContext2D,
  histogram: ScopeHistogram,
  xStart: number,
  xEnd: number,
  height: number
): void {
  const channelWidth = xEnd - xStart;
  const imageData = context.createImageData(channelWidth, height);
  const xScale = histogram.width / channelWidth;
  const yScale = histogram.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
    for (let x = 0; x < channelWidth; x += 1) {
      const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
      const density = histogram.bins[sourceY * histogram.width + sourceX];
      if (density <= 0) {
        continue;
      }

      const alpha = Math.min(255, Math.round(Math.sqrt(density / histogram.peak) * 255 * 0.85));
      const imageIndex = (y * channelWidth + x) * 4;
      imageData.data[imageIndex] = 255;
      imageData.data[imageIndex + 1] = 255;
      imageData.data[imageIndex + 2] = 255;
      imageData.data[imageIndex + 3] = alpha;
    }
  }

  context.putImageData(imageData, xStart, 0);
}

function drawParadeLabels(context: CanvasRenderingContext2D, width: number, height: number, segmentWidth: number): void {
  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.56)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("R", segmentWidth / 2, height - 14);
  context.fillText("G", segmentWidth * 1.5, height - 14);
  context.fillText("B", segmentWidth * 2.5, height - 14);
  context.restore();
}

function drawYrgbParadeLabels(context: CanvasRenderingContext2D, width: number, height: number, segmentWidth: number): void {
  context.save();
  context.fillStyle = "rgba(200, 200, 200, 0.7)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("Y", segmentWidth / 2, height - 14);
  context.fillStyle = "rgba(220, 80, 80, 0.8)";
  context.fillText("R", segmentWidth * 1.5, height - 14);
  context.fillStyle = "rgba(80, 200, 80, 0.8)";
  context.fillText("G", segmentWidth * 2.5, height - 14);
  context.fillStyle = "rgba(80, 120, 220, 0.8)";
  context.fillText("B", segmentWidth * 3.5, height - 14);
  context.restore();
}

function drawYcbcrParadeLabels(context: CanvasRenderingContext2D, width: number, height: number, segmentWidth: number): void {
  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.56)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText("Y", segmentWidth / 2, height - 14);
  context.fillStyle = "rgba(126, 199, 164, 0.7)";
  context.fillText("Cb", segmentWidth * 1.5, height - 14);
  context.fillStyle = "rgba(241, 219, 177, 0.7)";
  context.fillText("Cr", segmentWidth * 2.5, height - 14);
  context.restore();
}

function drawHdrParadeLabels(context: CanvasRenderingContext2D, width: number, height: number, segmentWidth: number, maxNit: number): void {
  context.save();
  context.fillStyle = "rgba(220, 80, 80, 0.8)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(`R ${maxNit}nit`, segmentWidth / 2, height - 14);
  context.fillStyle = "rgba(80, 200, 80, 0.8)";
  context.fillText(`G ${maxNit}nit`, segmentWidth * 1.5, height - 14);
  context.fillStyle = "rgba(80, 120, 220, 0.8)";
  context.fillText(`B ${maxNit}nit`, segmentWidth * 2.5, height - 14);
  context.restore();
}

function drawSingleParadeLabel(context: CanvasRenderingContext2D, width: number, height: number, label: string, color: string): void {
  context.save();
  context.fillStyle = color;
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(label, width / 2, height - 14);
  context.restore();
}

export function drawYcbcrWaveformScope(canvas: HTMLCanvasElement, histogram: YcbcrWaveformHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawWaveformBackplane(context, width, height);
  drawWaveformGrid(context, width, height, "underlay");

  const yHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.yBins, peak: histogram.peak, samples: histogram.samples };
  const cbHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.cbBins, peak: histogram.peak, samples: histogram.samples };
  const crHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.crBins, peak: histogram.peak, samples: histogram.samples };

  drawYcbcrChannelTrace(context, yHist, cbHist, crHist, width, height);
  drawWaveformGrid(context, width, height, "overlay");
  drawYcbcrLabels(context, width, height);
}

export function drawHdrWaveformScope(canvas: HTMLCanvasElement, histogram: HdrWaveformHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawHdrBackplane(context, width, height, histogram.maxNit);
  drawWaveformGrid(context, width, height, "underlay");
  drawWaveformTrace(context, histogram, width, height);
  drawWaveformGrid(context, width, height, "overlay");
  drawHdrLabels(context, width, height, histogram.maxNit);
}

export function drawChannelWaveformScope(canvas: HTMLCanvasElement, histogram: ChannelWaveformHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawWaveformBackplane(context, width, height);
  drawWaveformGrid(context, width, height, "underlay");

  const redHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.redBins, peak: histogram.peak, samples: histogram.samples };
  const greenHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.greenBins, peak: histogram.peak, samples: histogram.samples };
  const blueHist: ScopeHistogram = { width: histogram.width, height: histogram.height, bins: histogram.blueBins, peak: histogram.peak, samples: histogram.samples };

  drawRgbOverlayTrace(context, redHist, greenHist, blueHist, width, height);
  drawWaveformGrid(context, width, height, "overlay");
  drawChannelLabels(context, width, height);
}

function drawYcbcrChannelTrace(
  context: CanvasRenderingContext2D,
  yHist: ScopeHistogram,
  cbHist: ScopeHistogram,
  crHist: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (yHist.peak <= 0) return;

  const tonePeak = calculateTonePeak(yHist.bins, yHist.peak);
  const toneDenominator = Math.log1p(tonePeak);

  drawChannelComponent(context, yHist, canvasWidth, canvasHeight, toneDenominator, 255, 255, 255);
  drawChannelComponent(context, cbHist, canvasWidth, canvasHeight, toneDenominator, 126, 199, 164);
  drawChannelComponent(context, crHist, canvasWidth, canvasHeight, toneDenominator, 241, 219, 177);
}

function drawChannelComponent(
  context: CanvasRenderingContext2D,
  histogram: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number,
  toneDenominator: number,
  r: number, g: number, b: number
): void {
  const xScale = histogram.width / canvasWidth;
  const yScale = histogram.height / canvasHeight;

  for (let y = 0; y < canvasHeight; y += 1) {
    const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
    for (let x = 0; x < canvasWidth; x += 1) {
      const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
      const density = histogram.bins[sourceY * histogram.width + sourceX];
      if (density <= 0) continue;

      const normalized = Math.min(1, Math.log1p(density) / toneDenominator);
      const alpha = Math.round(normalized * 200);
      context.fillStyle = `rgba(${r},${g},${b},${alpha / 255})`;
      context.fillRect(x, y, 1, 1);
    }
  }
}

function drawRgbOverlayTrace(
  context: CanvasRenderingContext2D,
  red: ScopeHistogram,
  green: ScopeHistogram,
  blue: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (red.peak <= 0) return;
  const tonePeak = calculateTonePeak(red.bins, red.peak);
  const toneDenominator = Math.log1p(tonePeak);

  context.save();
  context.globalCompositeOperation = "screen";

  drawRgbComponent(context, red, canvasWidth, canvasHeight, toneDenominator, 220, 80, 80);
  drawRgbComponent(context, green, canvasWidth, canvasHeight, toneDenominator, 80, 200, 80);
  drawRgbComponent(context, blue, canvasWidth, canvasHeight, toneDenominator, 80, 120, 220);

  context.restore();
}

function drawRgbComponent(
  context: CanvasRenderingContext2D,
  histogram: ScopeHistogram,
  canvasWidth: number,
  canvasHeight: number,
  toneDenominator: number,
  r: number, g: number, b: number
): void {
  const xScale = histogram.width / canvasWidth;
  const yScale = histogram.height / canvasHeight;

  for (let y = 0; y < canvasHeight; y += 1) {
    const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
    for (let x = 0; x < canvasWidth; x += 1) {
      const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
      const density = histogram.bins[sourceY * histogram.width + sourceX];
      if (density <= 0) continue;

      const normalized = Math.min(1, Math.log1p(density) / toneDenominator);
      const alpha = Math.round(normalized * 180);
      context.fillStyle = `rgba(${r},${g},${b},${alpha / 255})`;
      context.fillRect(x, y, 1, 1);
    }
  }
}

function drawHdrBackplane(context: CanvasRenderingContext2D, width: number, height: number, maxNit: number): void {
  context.save();

  const zones = [
    { start: 0, end: 100, color: "rgba(0, 0, 180, 0.05)" },
    { start: 100, end: 203, color: "rgba(0, 180, 0, 0.03)" },
    { start: 203, end: 10000, color: "rgba(180, 0, 0, 0.05)" }
  ];

  for (const zone of zones) {
    const yStart = Math.round((1 - zone.end / maxNit) * height);
    const yEnd = Math.round((1 - zone.start / maxNit) * height);
    context.fillStyle = zone.color;
    context.fillRect(0, yStart, width, yEnd - yStart);
  }

  context.restore();
}

function drawHdrLabels(context: CanvasRenderingContext2D, width: number, height: number, maxNit: number): void {
  const pixelRatio = getPixelRatio();
  const gutterWidth = Math.round(42 * pixelRatio);
  const labelPadding = Math.round(7 * pixelRatio);

  context.save();

  const labelGradient = context.createLinearGradient(width - gutterWidth, 0, width, 0);
  labelGradient.addColorStop(0, "rgba(5, 7, 11, 0)");
  labelGradient.addColorStop(0.35, "rgba(5, 7, 11, 0.66)");
  labelGradient.addColorStop(1, "rgba(5, 7, 11, 0.9)");
  context.fillStyle = labelGradient;
  context.fillRect(width - gutterWidth, 0, gutterWidth, height);

  context.fillStyle = "rgba(233, 239, 248, 0.82)";
  context.font = `700 ${Math.round(10 * pixelRatio)}px system-ui, sans-serif`;
  context.textAlign = "right";
  context.textBaseline = "middle";

  const labels = maxNit <= 1000
    ? [0, 100, 200, 300, 500, 750, 1000]
    : [0, 1000, 2000, 4000, 6000, 8000, 10000];

  for (const nit of labels) {
    const y = height - (nit / maxNit) * height;
    context.fillText(`${nit}`, width - labelPadding, Math.max(labelPadding, Math.min(height - labelPadding, y)));
  }

  context.restore();
}

function drawYcbcrLabels(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.56)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText("Y", width / 2, height - 2);
  context.fillStyle = "rgba(126, 199, 164, 0.7)";
  context.fillText("Cb", width / 4, height - 2);
  context.fillStyle = "rgba(241, 219, 177, 0.7)";
  context.fillText("Cr", width * 3 / 4, height - 2);
  context.restore();
}

function drawChannelLabels(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillStyle = "rgba(220, 80, 80, 0.8)";
  context.fillText("R", width / 2, height - 14);
  context.fillStyle = "rgba(80, 200, 80, 0.8)";
  context.fillText("G", width / 2, height - 28);
  context.fillStyle = "rgba(80, 120, 220, 0.8)";
  context.fillText("B", width / 2, height - 42);
  context.restore();
}

export function drawLogHistogram(canvas: HTMLCanvasElement, histogram: LogHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawLogHistogramBars(context, histogram, width, height);
}

export function drawCumulativeHistogram(canvas: HTMLCanvasElement, histogram: CumulativeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawCumulativeHistogramLines(context, histogram, width, height);
}

export function drawSaturationHistogram(canvas: HTMLCanvasElement, histogram: SaturationHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawSaturationHistogramBar(context, histogram, width, height);
}

export function drawHueHistogram(canvas: HTMLCanvasElement, histogram: HueHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawHueHistogramWheel(context, histogram, width, height);
}

export function drawZoneHistogram(canvas: HTMLCanvasElement, histogram: ZoneHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawZoneHistogramBars(context, histogram, width, height);
}

export function drawCieScope(canvas: HTMLCanvasElement, histogram: CieHistogram, gamutBoundary?: { rec709: [number, number][]; p3: [number, number][]; bt2020: [number, number][] }): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);

  if (histogram.peak > 0) {
    const xScale = histogram.width / width;
    const yScale = histogram.height / height;
    const imageData = context.createImageData(width, height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceX = Math.min(histogram.width - 1, Math.floor(x * xScale));
        const sourceY = Math.min(histogram.height - 1, Math.floor(y * yScale));
        const density = histogram.bins[sourceY * histogram.width + sourceX];
        if (density <= 0) continue;

        const alpha = Math.min(255, Math.round(Math.sqrt(density / histogram.peak) * 255 * 0.8));
        const index = (y * width + x) * 4;
        imageData.data[index] = 126;
        imageData.data[index + 1] = 199;
        imageData.data[index + 2] = 164;
        imageData.data[index + 3] = alpha;
      }
    }
    context.putImageData(imageData, 0, 0);
  }

  if (gamutBoundary) {
    drawGamutBoundary(context, gamutBoundary, width, height, histogram.variant);
  }

  drawCieGrid(context, width, height, histogram.variant);
  drawCieLabels(context);
}

function drawLogHistogramBars(
  context: CanvasRenderingContext2D,
  histogram: LogHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) return;

  const barWidth = Math.floor(width / histogram.redBins.length);
  const maxBarHeight = height - 20;

  context.save();

  const channels = [
    { bins: histogram.redBins, color: "rgba(220, 80, 80, 0.7)" },
    { bins: histogram.greenBins, color: "rgba(80, 200, 80, 0.7)" },
    { bins: histogram.blueBins, color: "rgba(80, 120, 220, 0.7)" },
    { bins: histogram.lumaBins, color: "rgba(200, 200, 200, 0.5)" }
  ];

  for (const channel of channels) {
    context.fillStyle = channel.color;
    for (let i = 0; i < channel.bins.length; i += 1) {
      const barHeight = (channel.bins[i] / histogram.peak) * maxBarHeight;
      const x = i * barWidth;
      context.fillRect(x, height - 10 - barHeight, barWidth - 1, barHeight);
    }
  }

  context.restore();
}

function drawCumulativeHistogramLines(
  context: CanvasRenderingContext2D,
  histogram: CumulativeHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) return;

  const maxValue = histogram.totalPixels || 1;
  const step = width / histogram.redBins.length;

  context.save();

  const channels = [
    { bins: histogram.redBins, color: "rgba(220, 80, 80, 0.8)" },
    { bins: histogram.greenBins, color: "rgba(80, 200, 80, 0.8)" },
    { bins: histogram.blueBins, color: "rgba(80, 120, 220, 0.8)" },
    { bins: histogram.lumaBins, color: "rgba(200, 200, 200, 0.6)" }
  ];

  for (const channel of channels) {
    context.strokeStyle = channel.color;
    context.lineWidth = 1.5;
    context.beginPath();
    for (let i = 0; i < channel.bins.length; i += 1) {
      const x = i * step;
      const y = height - 10 - (channel.bins[i] / maxValue) * (height - 20);
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();
  }

  context.restore();
}

function drawSaturationHistogramBar(
  context: CanvasRenderingContext2D,
  histogram: SaturationHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) return;

  const barWidth = Math.floor(width / histogram.saturationBins.length);
  const maxBarHeight = height - 20;

  context.save();
  context.fillStyle = "rgba(180, 100, 200, 0.7)";

  for (let i = 0; i < histogram.saturationBins.length; i += 1) {
    const barHeight = (histogram.saturationBins[i] / histogram.peak) * maxBarHeight;
    const x = i * barWidth;
    context.fillRect(x, height - 10 - barHeight, barWidth - 1, barHeight);
  }

  context.restore();
}

function drawHueHistogramWheel(
  context: CanvasRenderingContext2D,
  histogram: HueHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.4;

  context.save();

  const colors = [
    "rgba(255,0,0,0.7)", "rgba(255,127,0,0.7)", "rgba(255,255,0,0.7)",
    "rgba(0,255,0,0.7)", "rgba(0,255,255,0.7)", "rgba(0,0,255,0.7)",
    "rgba(127,0,255,0.7)", "rgba(255,0,255,0.7)"
  ];

  const binCount = histogram.hueBins.length;
  const angleStep = (2 * Math.PI) / binCount;

  for (let i = 0; i < binCount; i += 1) {
    const barHeight = (histogram.hueBins[i] / histogram.peak) * radius;
    const angle = i * angleStep - Math.PI / 2;
    const nextAngle = (i + 1) * angleStep - Math.PI / 2;

    context.fillStyle = colors[i % colors.length];
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(centerX, centerY, barHeight, angle, nextAngle);
    context.closePath();
    context.fill();
  }

  context.restore();
}

function drawZoneHistogramBars(
  context: CanvasRenderingContext2D,
  histogram: ZoneHistogram,
  width: number,
  height: number
): void {
  if (histogram.peak <= 0) return;

  const barWidth = Math.floor(width / 10);
  const maxBarHeight = height - 30;

  context.save();

  const zoneColors = [
    "rgba(30,30,50,0.8)", "rgba(50,50,80,0.8)", "rgba(70,70,100,0.8)",
    "rgba(90,90,120,0.8)", "rgba(128,128,128,0.8)", "rgba(160,160,160,0.8)",
    "rgba(190,190,190,0.8)", "rgba(210,210,210,0.8)", "rgba(235,235,235,0.8)",
    "rgba(250,250,250,0.8)"
  ];

  for (let i = 0; i < 10; i += 1) {
    const barHeight = (histogram.zoneBins[i] / histogram.peak) * maxBarHeight;
    const x = i * barWidth;
    context.fillStyle = zoneColors[i];
    context.fillRect(x, height - 20 - barHeight, barWidth - 2, barHeight);
    context.fillStyle = "rgba(236, 232, 220, 0.56)";
    context.font = "600 7px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(histogram.zoneNames[i].slice(0, 3), x + barWidth / 2, height - 3);
  }

  context.restore();
}

function drawCieGrid(context: CanvasRenderingContext2D, width: number, height: number, variant: "cie1931" | "cie1976"): void {
  context.save();
  context.strokeStyle = "rgba(192, 205, 221, 0.15)";
  context.lineWidth = 1;

  const divisions = variant === "cie1976" ? [0.1, 0.2, 0.3, 0.4, 0.5] : [0.1, 0.2, 0.3, 0.4, 0.5];

  for (const d of divisions) {
    if (variant === "cie1976") {
      const y = (1 - d) * height;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    } else {
      const x = d * width;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
  }

  context.restore();
}

function drawGamutBoundary(
  context: CanvasRenderingContext2D,
  boundary: { rec709: [number, number][]; p3: [number, number][]; bt2020: [number, number][] },
  width: number,
  height: number,
  variant: "cie1931" | "cie1976"
): void {
  context.save();

  const drawLine = (points: [number, number][], color: string) => {
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    for (let i = 0; i < points.length; i += 1) {
      const [px, py] = points[i];
      const x = variant === "cie1976" ? px * width : px * width;
      const y = variant === "cie1976" ? (1 - py) * height : (1 - py) * height;
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.stroke();
  };

  if (boundary.rec709.length > 0) drawLine(boundary.rec709, "rgba(220, 80, 80, 0.6)");
  if (boundary.p3.length > 0) drawLine(boundary.p3, "rgba(80, 200, 80, 0.6)");
  if (boundary.bt2020.length > 0) drawLine(boundary.bt2020, "rgba(80, 120, 220, 0.6)");

  context.restore();
}

function drawCieLabels(context: CanvasRenderingContext2D): void {
  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.56)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("CIE", 4, 4);
  context.restore();
}

export function drawExposureMonitor(canvas: HTMLCanvasElement, stats: ExposureMonitorStats): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);

  if (stats.samples === 0) return;

  const barHeight = (height - 20) / 10;
  const zones = [
    { label: "S.Black", value: stats.superBlacks, color: "rgba(20, 20, 40, 0.9)" },
    { label: "Black", value: stats.blacks, color: "rgba(0, 0, 80, 0.9)" },
    { label: "Shadow", value: stats.shadows, color: "rgba(0, 60, 120, 0.9)" },
    { label: "Dark", value: stats.darks, color: "rgba(0, 100, 60, 0.9)" },
    { label: "Mid", value: stats.midtones, color: "rgba(60, 120, 60, 0.9)" },
    { label: "Light", value: stats.lights, color: "rgba(120, 120, 0, 0.9)" },
    { label: "Highlight", value: stats.highlights, color: "rgba(180, 60, 0, 0.9)" },
    { label: "White", value: stats.whites, color: "rgba(220, 220, 220, 0.9)" },
    { label: "S.White", value: stats.superWhites, color: "rgba(255, 255, 255, 0.9)" },
    { label: "Clip", value: stats.clipping, color: "rgba(255, 0, 0, 0.9)" }
  ];

  context.save();

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    const barWidth = (zone.value / stats.samples) * (width - 80);
    const y = 10 + i * barHeight;

    context.fillStyle = zone.color;
    context.fillRect(70, y, barWidth, barHeight - 2);

    context.fillStyle = "rgba(236, 232, 220, 0.7)";
    context.font = "600 9px system-ui, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(zone.label, 4, y + (barHeight - 2) / 2);

    context.textAlign = "right";
    context.fillText(zone.value.toLocaleString(), width - 4, y + (barHeight - 2) / 2);
  }

  context.restore();
}

export function drawFalseColorOverlay(canvas: HTMLCanvasElement, overlayData: Uint8ClampedArray, width: number, height: number, opacity: number = 0.5): void {
  const context = prepareCanvas(canvas);
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize(canvas);

  context.save();
  context.globalAlpha = opacity;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempContext = tempCanvas.getContext("2d");
  if (!tempContext) return;

  const dataCopy = new Uint8ClampedArray(overlayData);
  const imageData = new ImageData(dataCopy, width, height);
  tempContext.putImageData(imageData, 0, 0);

  context.drawImage(tempCanvas, 0, 0, canvasWidth, canvasHeight);
  context.restore();
}

export function drawGamutWarning(canvas: HTMLCanvasElement, frame: RgbaFrame, targetGamut: "rec709" | "p3" | "bt2020"): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);

  let warningCount = 0;

  context.save();

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = (y * frame.width + x) * 4;
      const r = frame.data[index] / 255;
      const g = frame.data[index + 1] / 255;
      const b = frame.data[index + 2] / 255;

      const [cx, cy] = rgbToXyzForGamut(r, g, b);

      let inGamut = true;
      if (targetGamut === "rec709") {
        inGamut = cx >= 0.01 && cx <= 0.74 && cy >= 0.01 && cy <= 0.83;
      } else if (targetGamut === "p3") {
        inGamut = cx >= 0.02 && cx <= 0.76 && cy >= 0.02 && cy <= 0.85;
      } else {
        inGamut = cx >= 0.01 && cx <= 0.78 && cy >= 0.01 && cy <= 0.89;
      }

      if (!inGamut) {
        warningCount += 1;
        const canvasX = Math.round((x / frame.width) * width);
        const canvasY = Math.round((y / frame.height) * height);
        context.fillStyle = "rgba(255, 0, 0, 0.7)";
        context.fillRect(canvasX, canvasY, 2, 2);
      }
    }
  }

  context.restore();

  context.fillStyle = "rgba(255, 0, 0, 0.8)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.fillText(`Gamut warnings: ${warningCount}`, width - 4, height - 4);
}

function rgbToXyzForGamut(r: number, g: number, b: number): [number, number] {
  const rl = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const gl = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const bl = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;

  const sum = x + y + z;
  return sum > 0 ? [x / sum, y / sum] : [0, 0];
}

