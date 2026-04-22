import type { ScopeHistogram, VectorscopeGuide } from "./scopeAnalysis";

export function drawWaveformScope(canvas: HTMLCanvasElement, histogram: ScopeHistogram): void {
  const context = prepareCanvas(canvas);
  const { width, height } = getCanvasSize(canvas);

  drawScopeBase(context, width, height);
  drawHistogram(context, histogram, width, height, {
    red: 213,
    green: 177,
    blue: 79,
    alphaScale: 0.82
  });
  drawWaveformGrid(context, width, height);
  drawWaveformLabels(context, width, height);
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
  context.fillStyle = "#0b0c09";
  context.fillRect(0, 0, width, height);
}

function drawWaveformGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.strokeStyle = "rgba(238, 233, 216, 0.12)";
  context.lineWidth = 1;

  for (const ire of [0, 25, 50, 75, 100]) {
    const y = height - (ire / 100) * height;
    context.beginPath();
    context.moveTo(0, Math.round(y) + 0.5);
    context.lineTo(width, Math.round(y) + 0.5);
    context.stroke();
  }

  for (const x of [0.25, 0.5, 0.75]) {
    const position = Math.round(width * x) + 0.5;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, height);
    context.stroke();
  }

  context.restore();
}

function drawWaveformLabels(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.fillStyle = "rgba(236, 232, 220, 0.56)";
  context.font = "700 10px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";

  for (const ire of [0, 50, 100]) {
    const y = height - (ire / 100) * height;
    context.fillText(String(ire), width - 6, Math.max(8, Math.min(height - 8, y)));
  }

  context.restore();
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
