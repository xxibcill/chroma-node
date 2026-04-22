export const MAX_SERIAL_NODES = 3;

export interface RgbVector {
  r: number;
  g: number;
  b: number;
}

export interface PrimaryCorrection {
  lift: RgbVector;
  gamma: RgbVector;
  gain: RgbVector;
  offset: RgbVector;
  contrast: number;
  pivot: number;
  saturation: number;
  temperature: number;
  tint: number;
}

export interface ColorNode {
  id: string;
  name: string;
  enabled: boolean;
  primaries: PrimaryCorrection;
}

export interface Pixel {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface NumericRange {
  min: number;
  max: number;
  neutral: number;
  step: number;
}

export const REC709_LUMA = {
  r: 0.2126,
  g: 0.7152,
  b: 0.0722
} as const;

export const PRIMARY_RANGES = {
  lift: { min: -0.5, max: 0.5, neutral: 0, step: 0.01 },
  gamma: { min: 0.1, max: 3, neutral: 1, step: 0.01 },
  gain: { min: 0, max: 4, neutral: 1, step: 0.01 },
  offset: { min: -0.5, max: 0.5, neutral: 0, step: 0.01 },
  contrast: { min: 0, max: 2, neutral: 1, step: 0.01 },
  pivot: { min: 0, max: 1, neutral: 0.5, step: 0.01 },
  saturation: { min: 0, max: 2, neutral: 1, step: 0.01 },
  temperature: { min: -1, max: 1, neutral: 0, step: 0.01 },
  tint: { min: -1, max: 1, neutral: 0, step: 0.01 }
} as const satisfies Record<string, NumericRange>;

const NEUTRAL_RGB_ADD: RgbVector = { r: 0, g: 0, b: 0 };
const NEUTRAL_RGB_MULTIPLY: RgbVector = { r: 1, g: 1, b: 1 };

export function createNeutralPrimaries(): PrimaryCorrection {
  return {
    lift: { ...NEUTRAL_RGB_ADD },
    gamma: { ...NEUTRAL_RGB_MULTIPLY },
    gain: { ...NEUTRAL_RGB_MULTIPLY },
    offset: { ...NEUTRAL_RGB_ADD },
    contrast: PRIMARY_RANGES.contrast.neutral,
    pivot: PRIMARY_RANGES.pivot.neutral,
    saturation: PRIMARY_RANGES.saturation.neutral,
    temperature: PRIMARY_RANGES.temperature.neutral,
    tint: PRIMARY_RANGES.tint.neutral
  };
}

export function createColorNode(index: number): ColorNode {
  const ordinal = Math.max(1, Math.min(MAX_SERIAL_NODES, Math.floor(index)));

  return {
    id: `node-${ordinal}`,
    name: `Node ${ordinal}`,
    enabled: true,
    primaries: createNeutralPrimaries()
  };
}

export function isNeutralPrimary(correction: PrimaryCorrection): boolean {
  const neutral = createNeutralPrimaries();
  return (
    rgbEquals(correction.lift, neutral.lift) &&
    rgbEquals(correction.gamma, neutral.gamma) &&
    rgbEquals(correction.gain, neutral.gain) &&
    rgbEquals(correction.offset, neutral.offset) &&
    correction.contrast === neutral.contrast &&
    correction.pivot === neutral.pivot &&
    correction.saturation === neutral.saturation &&
    correction.temperature === neutral.temperature &&
    correction.tint === neutral.tint
  );
}

export function clampNumber(value: number, range: NumericRange): number {
  if (!Number.isFinite(value)) {
    return range.neutral;
  }

  return Math.min(range.max, Math.max(range.min, value));
}

export function clampRgb(value: RgbVector, range: NumericRange): RgbVector {
  return {
    r: clampNumber(value.r, range),
    g: clampNumber(value.g, range),
    b: clampNumber(value.b, range)
  };
}

export function sanitizePrimaries(input: Partial<PrimaryCorrection> | undefined): PrimaryCorrection {
  const neutral = createNeutralPrimaries();

  return {
    lift: clampRgb(readRgb(input?.lift, neutral.lift), PRIMARY_RANGES.lift),
    gamma: clampRgb(readRgb(input?.gamma, neutral.gamma), PRIMARY_RANGES.gamma),
    gain: clampRgb(readRgb(input?.gain, neutral.gain), PRIMARY_RANGES.gain),
    offset: clampRgb(readRgb(input?.offset, neutral.offset), PRIMARY_RANGES.offset),
    contrast: clampNumber(readNumber(input?.contrast, neutral.contrast), PRIMARY_RANGES.contrast),
    pivot: clampNumber(readNumber(input?.pivot, neutral.pivot), PRIMARY_RANGES.pivot),
    saturation: clampNumber(readNumber(input?.saturation, neutral.saturation), PRIMARY_RANGES.saturation),
    temperature: clampNumber(readNumber(input?.temperature, neutral.temperature), PRIMARY_RANGES.temperature),
    tint: clampNumber(readNumber(input?.tint, neutral.tint), PRIMARY_RANGES.tint)
  };
}

export function sanitizeColorNode(input: Partial<ColorNode> | undefined, fallbackIndex: number): ColorNode {
  const fallback = createColorNode(fallbackIndex);
  const name = typeof input?.name === "string" && input.name.trim() ? input.name.trim().slice(0, 48) : fallback.name;
  const id = typeof input?.id === "string" && input.id.trim() ? input.id.trim().slice(0, 64) : fallback.id;

  return {
    id,
    name,
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
    primaries: sanitizePrimaries(input?.primaries)
  };
}

export function normalizeNodeGraph(nodes: readonly Partial<ColorNode>[] | undefined): ColorNode[] {
  const sourceNodes = nodes && nodes.length > 0 ? nodes.slice(0, MAX_SERIAL_NODES) : [createColorNode(1)];
  const seenIds = new Set<string>();

  return sourceNodes.map((node, index) => {
    const sanitized = sanitizeColorNode(node, index + 1);
    let id = sanitized.id;

    if (seenIds.has(id)) {
      id = `${id}-${index + 1}`;
    }

    seenIds.add(id);
    return { ...sanitized, id };
  });
}

export function applyPrimaryCorrection(pixel: Pixel, correction: PrimaryCorrection): Pixel {
  const lift = correction.lift;
  const gamma = correction.gamma;
  const gain = correction.gain;
  const offset = correction.offset;
  let r = pixel.r + lift.r;
  let g = pixel.g + lift.g;
  let b = pixel.b + lift.b;

  r = Math.pow(Math.max(0, r), 1 / Math.max(0.0001, gamma.r));
  g = Math.pow(Math.max(0, g), 1 / Math.max(0.0001, gamma.g));
  b = Math.pow(Math.max(0, b), 1 / Math.max(0.0001, gamma.b));

  r = r * gain.r + offset.r;
  g = g * gain.g + offset.g;
  b = b * gain.b + offset.b;

  r = (r - correction.pivot) * correction.contrast + correction.pivot;
  g = (g - correction.pivot) * correction.contrast + correction.pivot;
  b = (b - correction.pivot) * correction.contrast + correction.pivot;

  const luma = r * REC709_LUMA.r + g * REC709_LUMA.g + b * REC709_LUMA.b;
  r = luma + (r - luma) * correction.saturation;
  g = luma + (g - luma) * correction.saturation;
  b = luma + (b - luma) * correction.saturation;

  const whiteBalance = getWhiteBalanceScale(correction.temperature, correction.tint);
  r *= whiteBalance.r;
  g *= whiteBalance.g;
  b *= whiteBalance.b;

  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(b),
    a: pixel.a
  };
}

export function evaluateNodeGraph(pixel: Pixel, nodes: readonly ColorNode[]): Pixel {
  return normalizeNodeGraph(nodes).reduce<Pixel>((current, node) => {
    if (!node.enabled) {
      return current;
    }

    return applyPrimaryCorrection(current, node.primaries);
  }, pixel);
}

export function generateColorFragmentShader(nodeCount: number): string {
  const count = Math.max(1, Math.min(MAX_SERIAL_NODES, Math.floor(nodeCount)));
  const nodeLines = Array.from({ length: count }, (_, index) => {
    return `  if (uEnabled[${index}] == 1) {\n    graded = applyPrimary(graded, ${index});\n  }`;
  }).join("\n");

  return `#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uFrame;
uniform int uViewerMode;
uniform float uSplitPosition;
uniform int uEnabled[${count}];
uniform vec3 uLift[${count}];
uniform vec3 uGamma[${count}];
uniform vec3 uGain[${count}];
uniform vec3 uOffset[${count}];
uniform float uContrast[${count}];
uniform float uPivot[${count}];
uniform float uSaturation[${count}];
uniform float uTemperature[${count}];
uniform float uTint[${count}];

vec3 whiteBalanceScale(float temperature, float tint) {
  return vec3(
    1.0 + temperature * 0.12 + tint * 0.06,
    1.0 - tint * 0.10,
    1.0 - temperature * 0.12 + tint * 0.06
  );
}

vec3 applyPrimary(vec3 color, int index) {
  vec3 c = color + uLift[index];
  c = pow(max(c, vec3(0.0)), vec3(1.0) / max(uGamma[index], vec3(0.0001)));
  c = c * uGain[index] + uOffset[index];
  c = (c - vec3(uPivot[index])) * uContrast[index] + vec3(uPivot[index]);
  float luma = dot(c, vec3(${REC709_LUMA.r.toFixed(4)}, ${REC709_LUMA.g.toFixed(4)}, ${REC709_LUMA.b.toFixed(4)}));
  c = mix(vec3(luma), c, uSaturation[index]);
  c *= whiteBalanceScale(uTemperature[index], uTint[index]);
  return clamp(c, vec3(0.0), vec3(1.0));
}

vec4 applyColor(vec4 source) {
  vec3 graded = source.rgb;
${nodeLines}

  if (uViewerMode == 0) {
    return source;
  }

  if (uViewerMode == 2 && vTexCoord.x < uSplitPosition) {
    return source;
  }

  return vec4(graded, source.a);
}

void main() {
  outColor = applyColor(texture(uFrame, vTexCoord));
}
`;
}

function readRgb(input: RgbVector | undefined, fallback: RgbVector): RgbVector {
  if (!input || typeof input !== "object") {
    return { ...fallback };
  }

  return {
    r: readNumber(input.r, fallback.r),
    g: readNumber(input.g, fallback.g),
    b: readNumber(input.b, fallback.b)
  };
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function rgbEquals(left: RgbVector, right: RgbVector): boolean {
  return left.r === right.r && left.g === right.g && left.b === right.b;
}

function getWhiteBalanceScale(temperature: number, tint: number): RgbVector {
  return {
    r: 1 + temperature * 0.12 + tint * 0.06,
    g: 1 - tint * 0.1,
    b: 1 - temperature * 0.12 + tint * 0.06
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
