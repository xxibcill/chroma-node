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

export interface HslQualifier {
  enabled: boolean;
  hueCenter: number;
  hueWidth: number;
  hueSoftness: number;
  saturationMin: number;
  saturationMax: number;
  saturationSoftness: number;
  luminanceMin: number;
  luminanceMax: number;
  luminanceSoftness: number;
  invert: boolean;
}

export type PowerWindowShape = "ellipse" | "rectangle";

export interface PowerWindow {
  enabled: boolean;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotationDegrees: number;
  softness: number;
  invert: boolean;
}

export interface PowerWindows {
  ellipse: PowerWindow;
  rectangle: PowerWindow;
}

export interface ColorNode {
  id: string;
  name: string;
  enabled: boolean;
  primaries: PrimaryCorrection;
  qualifier: HslQualifier;
  windows: PowerWindows;
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

export interface NormalizedPoint {
  x: number;
  y: number;
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

export const QUALIFIER_RANGES = {
  hueCenter: { min: 0, max: 360, neutral: 0, step: 1 },
  hueWidth: { min: 0, max: 360, neutral: 360, step: 1 },
  hueSoftness: { min: 0, max: 180, neutral: 0, step: 1 },
  saturationMin: { min: 0, max: 1, neutral: 0, step: 0.01 },
  saturationMax: { min: 0, max: 1, neutral: 1, step: 0.01 },
  saturationSoftness: { min: 0, max: 1, neutral: 0, step: 0.01 },
  luminanceMin: { min: 0, max: 1, neutral: 0, step: 0.01 },
  luminanceMax: { min: 0, max: 1, neutral: 1, step: 0.01 },
  luminanceSoftness: { min: 0, max: 1, neutral: 0, step: 0.01 }
} as const satisfies Record<keyof Omit<HslQualifier, "enabled" | "invert">, NumericRange>;

export const WINDOW_RANGES = {
  centerX: { min: 0, max: 1, neutral: 0.5, step: 0.01 },
  centerY: { min: 0, max: 1, neutral: 0.5, step: 0.01 },
  width: { min: 0.05, max: 1, neutral: 0.5, step: 0.01 },
  height: { min: 0.05, max: 1, neutral: 0.5, step: 0.01 },
  rotationDegrees: { min: -180, max: 180, neutral: 0, step: 1 },
  softness: { min: 0, max: 1, neutral: 0, step: 0.01 }
} as const satisfies Record<keyof Omit<PowerWindow, "enabled" | "invert">, NumericRange>;

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

export function createDefaultQualifier(): HslQualifier {
  return {
    enabled: false,
    hueCenter: QUALIFIER_RANGES.hueCenter.neutral,
    hueWidth: QUALIFIER_RANGES.hueWidth.neutral,
    hueSoftness: QUALIFIER_RANGES.hueSoftness.neutral,
    saturationMin: QUALIFIER_RANGES.saturationMin.neutral,
    saturationMax: QUALIFIER_RANGES.saturationMax.neutral,
    saturationSoftness: QUALIFIER_RANGES.saturationSoftness.neutral,
    luminanceMin: QUALIFIER_RANGES.luminanceMin.neutral,
    luminanceMax: QUALIFIER_RANGES.luminanceMax.neutral,
    luminanceSoftness: QUALIFIER_RANGES.luminanceSoftness.neutral,
    invert: false
  };
}

export function createDefaultPowerWindow(shape: PowerWindowShape): PowerWindow {
  const isRectangle = shape === "rectangle";

  return {
    enabled: false,
    centerX: WINDOW_RANGES.centerX.neutral,
    centerY: WINDOW_RANGES.centerY.neutral,
    width: isRectangle ? 0.56 : WINDOW_RANGES.width.neutral,
    height: isRectangle ? 0.36 : WINDOW_RANGES.height.neutral,
    rotationDegrees: WINDOW_RANGES.rotationDegrees.neutral,
    softness: WINDOW_RANGES.softness.neutral,
    invert: false
  };
}

export function createDefaultPowerWindows(): PowerWindows {
  return {
    ellipse: createDefaultPowerWindow("ellipse"),
    rectangle: createDefaultPowerWindow("rectangle")
  };
}

export function createColorNode(index: number): ColorNode {
  const ordinal = Math.max(1, Math.min(MAX_SERIAL_NODES, Math.floor(index)));

  return {
    id: `node-${ordinal}`,
    name: `Node ${ordinal}`,
    enabled: true,
    primaries: createNeutralPrimaries(),
    qualifier: createDefaultQualifier(),
    windows: createDefaultPowerWindows()
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

export function sanitizeQualifier(input: Partial<HslQualifier> | undefined): HslQualifier {
  const fallback = createDefaultQualifier();
  const minSaturation = clampNumber(readNumber(input?.saturationMin, fallback.saturationMin), QUALIFIER_RANGES.saturationMin);
  const maxSaturation = clampNumber(readNumber(input?.saturationMax, fallback.saturationMax), QUALIFIER_RANGES.saturationMax);
  const minLuminance = clampNumber(readNumber(input?.luminanceMin, fallback.luminanceMin), QUALIFIER_RANGES.luminanceMin);
  const maxLuminance = clampNumber(readNumber(input?.luminanceMax, fallback.luminanceMax), QUALIFIER_RANGES.luminanceMax);

  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
    hueCenter: normalizeDegrees(clampNumber(readNumber(input?.hueCenter, fallback.hueCenter), QUALIFIER_RANGES.hueCenter)),
    hueWidth: clampNumber(readNumber(input?.hueWidth, fallback.hueWidth), QUALIFIER_RANGES.hueWidth),
    hueSoftness: clampNumber(readNumber(input?.hueSoftness, fallback.hueSoftness), QUALIFIER_RANGES.hueSoftness),
    saturationMin: Math.min(minSaturation, maxSaturation),
    saturationMax: Math.max(minSaturation, maxSaturation),
    saturationSoftness: clampNumber(readNumber(input?.saturationSoftness, fallback.saturationSoftness), QUALIFIER_RANGES.saturationSoftness),
    luminanceMin: Math.min(minLuminance, maxLuminance),
    luminanceMax: Math.max(minLuminance, maxLuminance),
    luminanceSoftness: clampNumber(readNumber(input?.luminanceSoftness, fallback.luminanceSoftness), QUALIFIER_RANGES.luminanceSoftness),
    invert: typeof input?.invert === "boolean" ? input.invert : fallback.invert
  };
}

export function sanitizePowerWindow(input: Partial<PowerWindow> | undefined, shape: PowerWindowShape): PowerWindow {
  const fallback = createDefaultPowerWindow(shape);

  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
    centerX: clampNumber(readNumber(input?.centerX, fallback.centerX), WINDOW_RANGES.centerX),
    centerY: clampNumber(readNumber(input?.centerY, fallback.centerY), WINDOW_RANGES.centerY),
    width: clampNumber(readNumber(input?.width, fallback.width), WINDOW_RANGES.width),
    height: clampNumber(readNumber(input?.height, fallback.height), WINDOW_RANGES.height),
    rotationDegrees: normalizeSignedDegrees(clampNumber(readNumber(input?.rotationDegrees, fallback.rotationDegrees), WINDOW_RANGES.rotationDegrees)),
    softness: clampNumber(readNumber(input?.softness, fallback.softness), WINDOW_RANGES.softness),
    invert: typeof input?.invert === "boolean" ? input.invert : fallback.invert
  };
}

export function sanitizePowerWindows(input: Partial<PowerWindows> | undefined): PowerWindows {
  return {
    ellipse: sanitizePowerWindow(input?.ellipse, "ellipse"),
    rectangle: sanitizePowerWindow(input?.rectangle, "rectangle")
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
    primaries: sanitizePrimaries(input?.primaries),
    qualifier: sanitizeQualifier(input?.qualifier),
    windows: sanitizePowerWindows(input?.windows)
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

export function evaluateQualifierMask(pixel: Pixel, qualifier: HslQualifier): number {
  const sanitized = sanitizeQualifier(qualifier);
  if (!sanitized.enabled) {
    return 1;
  }

  const hsl = rgbToHsl(pixel);
  const luminance = pixel.r * REC709_LUMA.r + pixel.g * REC709_LUMA.g + pixel.b * REC709_LUMA.b;
  const mask = (
    evaluateHueRange(hsl.hue, sanitized.hueCenter, sanitized.hueWidth, sanitized.hueSoftness) *
    evaluateLinearRange(hsl.saturation, sanitized.saturationMin, sanitized.saturationMax, sanitized.saturationSoftness) *
    evaluateLinearRange(luminance, sanitized.luminanceMin, sanitized.luminanceMax, sanitized.luminanceSoftness)
  );

  return sanitized.invert ? 1 - mask : mask;
}

export function evaluatePowerWindowMask(point: NormalizedPoint, windows: PowerWindows): number {
  const sanitized = sanitizePowerWindows(windows);
  const masks = [
    evaluateWindowShapeMask(point, sanitized.ellipse, "ellipse"),
    evaluateWindowShapeMask(point, sanitized.rectangle, "rectangle")
  ];
  const enabledCount = Number(sanitized.ellipse.enabled) + Number(sanitized.rectangle.enabled);

  if (enabledCount === 0) {
    return 1;
  }

  return Math.max(...masks);
}

export function evaluateNodeMask(pixel: Pixel, node: ColorNode, point: NormalizedPoint = { x: 0.5, y: 0.5 }): number {
  const sanitized = sanitizeColorNode(node, 1);
  return evaluateQualifierMask(pixel, sanitized.qualifier) * evaluatePowerWindowMask(point, sanitized.windows);
}

export function evaluateNodeGraph(pixel: Pixel, nodes: readonly ColorNode[], point: NormalizedPoint = { x: 0.5, y: 0.5 }): Pixel {
  return normalizeNodeGraph(nodes).reduce<Pixel>((current, node) => {
    if (!node.enabled) {
      return current;
    }

    const corrected = applyPrimaryCorrection(current, node.primaries);
    const mask = evaluateNodeMask(current, node, point);
    return mixPixels(current, corrected, mask);
  }, pixel);
}

export function generateColorFragmentShader(nodeCount: number): string {
  const count = Math.max(1, Math.min(MAX_SERIAL_NODES, Math.floor(nodeCount)));
  const nodeLines = Array.from({ length: count }, (_, index) => {
    return `  float nodeMask${index} = nodeMask(graded, ${index}, vTexCoord);
  if (uMatteNodeIndex == ${index}) {
    activeMatte = nodeMask${index};
  }
  if (uEnabled[${index}] == 1) {
    vec3 corrected${index} = applyPrimary(graded, ${index});
    graded = mix(graded, corrected${index}, nodeMask${index});
  }`;
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
uniform int uMatteNodeIndex;
uniform int uQualifierEnabled[${count}];
uniform float uHueCenter[${count}];
uniform float uHueWidth[${count}];
uniform float uHueSoftness[${count}];
uniform float uSaturationMin[${count}];
uniform float uSaturationMax[${count}];
uniform float uSaturationSoftness[${count}];
uniform float uLuminanceMin[${count}];
uniform float uLuminanceMax[${count}];
uniform float uLuminanceSoftness[${count}];
uniform int uQualifierInvert[${count}];
uniform int uEllipseEnabled[${count}];
uniform vec2 uEllipseCenter[${count}];
uniform vec2 uEllipseSize[${count}];
uniform float uEllipseRotation[${count}];
uniform float uEllipseSoftness[${count}];
uniform int uEllipseInvert[${count}];
uniform int uRectangleEnabled[${count}];
uniform vec2 uRectangleCenter[${count}];
uniform vec2 uRectangleSize[${count}];
uniform float uRectangleRotation[${count}];
uniform float uRectangleSoftness[${count}];
uniform int uRectangleInvert[${count}];

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

vec3 rgbToHsl(vec3 color) {
  float maxValue = max(max(color.r, color.g), color.b);
  float minValue = min(min(color.r, color.g), color.b);
  float delta = maxValue - minValue;
  float luminance = (maxValue + minValue) * 0.5;
  float hue = 0.0;
  float saturation = 0.0;

  if (delta > 0.00001) {
    saturation = delta / max(0.00001, 1.0 - abs(2.0 * luminance - 1.0));
    if (maxValue == color.r) {
      hue = mod((color.g - color.b) / delta, 6.0);
    } else if (maxValue == color.g) {
      hue = ((color.b - color.r) / delta) + 2.0;
    } else {
      hue = ((color.r - color.g) / delta) + 4.0;
    }
  }

  return vec3(mod(hue * 60.0 + 360.0, 360.0), clamp(saturation, 0.0, 1.0), luminance);
}

float linearRangeMask(float value, float rangeMin, float rangeMax, float softness) {
  float lower = min(rangeMin, rangeMax);
  float upper = max(rangeMin, rangeMax);

  if (softness <= 0.00001) {
    return value >= lower && value <= upper ? 1.0 : 0.0;
  }

  float lowEdge = smoothstep(lower - softness, lower, value);
  float highEdge = 1.0 - smoothstep(upper, upper + softness, value);
  return clamp(min(lowEdge, highEdge), 0.0, 1.0);
}

float hueRangeMask(float hue, float center, float width, float softness) {
  if (width >= 359.999) {
    return 1.0;
  }

  float distance = abs(mod(hue - center + 540.0, 360.0) - 180.0);
  float halfWidth = width * 0.5;

  if (softness <= 0.00001) {
    return distance <= halfWidth ? 1.0 : 0.0;
  }

  return 1.0 - smoothstep(halfWidth, halfWidth + softness, distance);
}

float qualifierMask(vec3 color, int index) {
  if (uQualifierEnabled[index] == 0) {
    return 1.0;
  }

  vec3 hsl = rgbToHsl(color);
  float rec709Luma = dot(color, vec3(${REC709_LUMA.r.toFixed(4)}, ${REC709_LUMA.g.toFixed(4)}, ${REC709_LUMA.b.toFixed(4)}));
  float mask = hueRangeMask(hsl.x, uHueCenter[index], uHueWidth[index], uHueSoftness[index]);
  mask *= linearRangeMask(hsl.y, uSaturationMin[index], uSaturationMax[index], uSaturationSoftness[index]);
  mask *= linearRangeMask(rec709Luma, uLuminanceMin[index], uLuminanceMax[index], uLuminanceSoftness[index]);

  return uQualifierInvert[index] == 1 ? 1.0 - mask : mask;
}

vec2 rotatePoint(vec2 point, float degrees) {
  float radiansValue = radians(degrees);
  float s = sin(radiansValue);
  float c = cos(radiansValue);
  return vec2(point.x * c - point.y * s, point.x * s + point.y * c);
}

float shapedWindowMask(vec2 coord, vec2 center, vec2 size, float rotationDegrees, float softness, int invert, int shape) {
  vec2 halfSize = max(size * 0.5, vec2(0.0001));
  vec2 local = rotatePoint(coord - center, -rotationDegrees) / halfSize;
  float metric = shape == 0 ? length(local) : max(abs(local.x), abs(local.y));
  float mask = softness <= 0.00001 ? (metric <= 1.0 ? 1.0 : 0.0) : 1.0 - smoothstep(1.0, 1.0 + softness, metric);
  return invert == 1 ? 1.0 - mask : mask;
}

float windowMask(vec2 coord, int index) {
  float unionMask = 0.0;
  int enabledCount = 0;

  if (uEllipseEnabled[index] == 1) {
    unionMask = max(unionMask, shapedWindowMask(coord, uEllipseCenter[index], uEllipseSize[index], uEllipseRotation[index], uEllipseSoftness[index], uEllipseInvert[index], 0));
    enabledCount += 1;
  }

  if (uRectangleEnabled[index] == 1) {
    unionMask = max(unionMask, shapedWindowMask(coord, uRectangleCenter[index], uRectangleSize[index], uRectangleRotation[index], uRectangleSoftness[index], uRectangleInvert[index], 1));
    enabledCount += 1;
  }

  return enabledCount == 0 ? 1.0 : unionMask;
}

float nodeMask(vec3 color, int index, vec2 coord) {
  return qualifierMask(color, index) * windowMask(coord, index);
}

vec4 applyColor(vec4 source) {
  vec3 graded = source.rgb;
  float activeMatte = 1.0;
${nodeLines}

  if (uMatteNodeIndex >= 0) {
    return vec4(vec3(activeMatte), source.a);
  }

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

function rgbToHsl(pixel: Pixel): { hue: number; saturation: number; lightness: number } {
  const maxValue = Math.max(pixel.r, pixel.g, pixel.b);
  const minValue = Math.min(pixel.r, pixel.g, pixel.b);
  const delta = maxValue - minValue;
  const lightness = (maxValue + minValue) / 2;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;

  if (maxValue === pixel.r) {
    hue = 60 * (((pixel.g - pixel.b) / delta) % 6);
  } else if (maxValue === pixel.g) {
    hue = 60 * ((pixel.b - pixel.r) / delta + 2);
  } else {
    hue = 60 * ((pixel.r - pixel.g) / delta + 4);
  }

  return {
    hue: normalizeDegrees(hue),
    saturation: clamp01(saturation),
    lightness
  };
}

function evaluateHueRange(hue: number, center: number, width: number, softness: number): number {
  if (width >= 360) {
    return 1;
  }

  const distance = circularHueDistance(hue, center);
  const halfWidth = width / 2;
  if (softness <= 0) {
    return distance <= halfWidth ? 1 : 0;
  }

  return 1 - smoothstep(halfWidth, halfWidth + softness, distance);
}

function evaluateLinearRange(value: number, min: number, max: number, softness: number): number {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);

  if (softness <= 0) {
    return value >= lower && value <= upper ? 1 : 0;
  }

  return clamp01(Math.min(
    smoothstep(lower - softness, lower, value),
    1 - smoothstep(upper, upper + softness, value)
  ));
}

function evaluateWindowShapeMask(point: NormalizedPoint, window: PowerWindow, shape: PowerWindowShape): number {
  if (!window.enabled) {
    return 0;
  }

  const local = rotatePoint(
    {
      x: point.x - window.centerX,
      y: point.y - window.centerY
    },
    -window.rotationDegrees
  );
  const halfWidth = Math.max(0.0001, window.width / 2);
  const halfHeight = Math.max(0.0001, window.height / 2);
  const metric = shape === "ellipse"
    ? Math.hypot(local.x / halfWidth, local.y / halfHeight)
    : Math.max(Math.abs(local.x / halfWidth), Math.abs(local.y / halfHeight));
  const mask = window.softness <= 0 ? (metric <= 1 ? 1 : 0) : 1 - smoothstep(1, 1 + window.softness, metric);

  return window.invert ? 1 - mask : mask;
}

function mixPixels(source: Pixel, corrected: Pixel, mask: number): Pixel {
  const mixAmount = clamp01(mask);

  return {
    r: source.r + (corrected.r - source.r) * mixAmount,
    g: source.g + (corrected.g - source.g) * mixAmount,
    b: source.b + (corrected.b - source.b) * mixAmount,
    a: source.a
  };
}

function rotatePoint(point: NormalizedPoint, degrees: number): NormalizedPoint {
  const radians = degrees * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}

function circularHueDistance(left: number, right: number): number {
  return Math.abs(((left - right + 540) % 360) - 180);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDegrees(value: number): number {
  const degrees = normalizeDegrees(value + 180) - 180;
  return degrees === -180 ? 180 : degrees;
}
