export const MAX_SERIAL_NODES = 3;
export const MAX_CURVE_POINTS = 16;

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
  hueShift: number;
  colorBoost: number;
  midtoneDetail: number;
  shadowAmount: number;
  highlightAmount: number;
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

export type TrackingDataState = "empty" | "ready" | "stale" | "failed";

export interface TrackingKeyframe {
  frame: number;
  dx: number;
  dy: number;
  confidence: number;
}

export interface TrackingData {
  targetShape: PowerWindowShape;
  keyframes: TrackingKeyframe[];
  state: TrackingDataState;
  failureFrame?: number;
  failureReason?: string;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export type CurveChannel = "master" | "red" | "green" | "blue" | "hueVsHue" | "hueVsSaturation" | "hueVsLuminance" | "luminanceVsSaturation" | "saturationVsSaturation";

export interface CurveData {
  enabled: boolean;
  points: CurvePoint[];
}

export interface NodeCurves {
  master: CurveData;
  red: CurveData;
  green: CurveData;
  blue: CurveData;
  hueVsHue: CurveData;
  hueVsSaturation: CurveData;
  hueVsLuminance: CurveData;
  luminanceVsSaturation: CurveData;
  saturationVsSaturation: CurveData;
}

export interface LutData {
  name: string;
  size: number;
  data: Float32Array;
}

export interface LutSettings {
  enabled: boolean;
  lut: LutData | null;
  intensity: number;
}

// Technical LUT types (separate from creative node LUTs)

export type LutInterpolation = "trilinear" | "tetrahedral";
export type LutSlot = "input" | "display" | "output" | "calibration" | "viewing";

export interface TechnicalLutDescriptor {
  id: string;
  name: string;
  slot: LutSlot;
  size: number;
  interpolation: LutInterpolation;
  lut: LutData | null; // actual LUT data
  inputProfile: string; // expected input color space
  outputProfile: string; // expected output color space
  isValid: boolean;
  validationErrors: string[];
  filePath: string | null;
  provenance: string | null;
}

export interface TechnicalLutRegistry {
  inputLut: TechnicalLutDescriptor | null;
  displayLut: TechnicalLutDescriptor | null;
  outputLut: TechnicalLutDescriptor | null;
  calibrationLut: TechnicalLutDescriptor | null;
  viewingLut: TechnicalLutDescriptor | null;
}

export function createTechnicalLutDescriptor(
  id: string,
  name: string,
  slot: LutSlot,
  lutData: LutData | null,
  inputProfile: string,
  outputProfile: string,
  filePath: string | null = null
): TechnicalLutDescriptor {
  const errors: string[] = [];

  if (!lutData) {
    errors.push("No LUT data provided");
  } else {
    // Validate LUT dimensions
    if (lutData.size < 2) {
      errors.push(`LUT size ${lutData.size} is too small (minimum 2)`);
    }
    if (lutData.size > 65) {
      errors.push(`LUT size ${lutData.size} is too large (maximum 65)`);
    }

    // Validate LUT data is finite
    const data = lutData.data;
    for (let i = 0; i < data.length; i++) {
      if (!Number.isFinite(data[i])) {
        errors.push(`LUT data contains non-finite value at index ${i}`);
        break;
      }
    }

    // Validate expected count
    const expectedCount = lutData.size * lutData.size * lutData.size * 3;
    if (data.length !== expectedCount) {
      errors.push(
        `LUT data length ${data.length} does not match expected ${expectedCount} for size ${lutData.size}`
      );
    }
  }

  return {
    id,
    name,
    slot,
    size: lutData?.size ?? 0,
    interpolation: "trilinear",
    lut: lutData,
    inputProfile,
    outputProfile,
    isValid: errors.length === 0,
    validationErrors: errors,
    filePath,
    provenance: null
  };
}

export function validateTechnicalLut(lut: TechnicalLutDescriptor): TechnicalLutDescriptor {
  const validated = { ...lut };

  if (lut.size < 2) {
    validated.isValid = false;
    if (!validated.validationErrors.includes(`LUT size ${lut.size} is too small`)) {
      validated.validationErrors.push(`LUT size ${lut.size} is too small (minimum 2)`);
    }
  }

  if (lut.size > 65) {
    validated.isValid = false;
    if (!validated.validationErrors.includes(`LUT size ${lut.size} is too large`)) {
      validated.validationErrors.push(`LUT size ${lut.size} is too large (maximum 65)`);
    }
  }

  return validated;
}

export interface ColorManagementSettings {
  inputColorSpace: ColorSpace;
  outputColorSpace: ColorSpace;
  workingColorSpace: ColorSpace;
  inputTransform: InputTransform;
  outputTransform: OutputTransform;
  toneMapping: ToneMappingMode;
  gamutMapping: GamutMappingMode;
}

export type ColorSpace =
  | "auto"
  | "rec709"
  | "rec2020"
  | "srgb"
  | "p3"
  | "appleLog"
  | "hlg"
  | "pq"
  | "linear";

export type InputTransform =
  | "auto"
  | "none"
  | "rec709"
  | "rec2020"
  | "srgb"
  | "p3"
  | "appleLog"
  | "hlg"
  | "pq";

export type OutputTransform =
  | "none"
  | "rec709"
  | "rec2020"
  | "srgb"
  | "p3";

export type ToneMappingMode =
  | "none"
  | "sdr"
  | "hlg"
  | "pq";

export type GamutMappingMode =
  | "none"
  | "clip"
  | "compress";

export interface ColorPrimaries {
  type: ColorPrimariesType;
  redX: number;
  redY: number;
  greenX: number;
  greenY: number;
  blueX: number;
  blueY: number;
  whiteX: number;
  whiteY: number;
}

export type ColorPrimariesType =
  | "rec709"
  | "rec2020"
  | "p3"
  | "appleLog"
  | "unknown";

export interface TransferFunction {
  type: TransferFunctionType;
  power?: number;
  epsilon?: number;
  alpha?: number;
  beta?: number;
}

export type TransferFunctionType =
  | "bt1886"
  | "srgb"
  | "linear"
  | "hlg"
  | "pq"
  | "appleLog"
  | "log25"
  | "unknown";

export interface ColorMatrix {
  type: ColorMatrixType;
}

export type ColorMatrixType =
  | "bt601"
  | "bt709"
  | "bt2020nc"
  | "bt2020c"
  | "identity"
  | "unknown";

export interface ColorRange {
  type: ColorRangeType;
}

export type ColorRangeType =
  | "full"
  | "limited";

export interface ColorMetadata {
  primaries: ColorPrimaries;
  transfer: TransferFunction;
  matrix: ColorMatrix;
  range: ColorRange;
  bitDepth: 8 | 10 | 12 | 16;
  profileLabel: string;
}

export interface SourceColorInfo {
  metadata: ColorMetadata | null;
  detectedProfile: ColorSpace;
  isHDR: boolean;
  isWideGamut: boolean;
}

export interface ColorNode {
  id: string;
  name: string;
  enabled: boolean;
  primaries: PrimaryCorrection;
  qualifier: HslQualifier;
  windows: PowerWindows;
  tracking: TrackingData;
  curves: NodeCurves;
  lut: LutSettings;
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
  tint: { min: -1, max: 1, neutral: 0, step: 0.01 },
  hueShift: { min: -180, max: 180, neutral: 0, step: 1 },
  colorBoost: { min: 0, max: 2, neutral: 1, step: 0.01 },
  midtoneDetail: { min: 0, max: 2, neutral: 1, step: 0.01 },
  shadowAmount: { min: -1, max: 1, neutral: 0, step: 0.01 },
  highlightAmount: { min: -1, max: 1, neutral: 0, step: 0.01 }
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

export const TRACKING_OFFSET_RANGE = { min: -1, max: 1, neutral: 0, step: 0.001 } as const satisfies NumericRange;
export const TRACKING_CONFIDENCE_RANGE = { min: 0, max: 1, neutral: 0, step: 0.001 } as const satisfies NumericRange;

export const CURVE_RANGE = { min: 0, max: 1, neutral: 0, step: 0.01 } as const satisfies NumericRange;

export const LUT_RANGE = { min: 0, max: 1, neutral: 1, step: 0.01 } as const satisfies NumericRange;

const IDENTITY_CURVE_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 }
];

export function createNeutralCurve(): CurveData {
  return {
    enabled: false,
    points: IDENTITY_CURVE_POINTS.map((p) => ({ ...p }))
  };
}

export function createDefaultNodeCurves(): NodeCurves {
  return {
    master: createNeutralCurve(),
    red: createNeutralCurve(),
    green: createNeutralCurve(),
    blue: createNeutralCurve(),
    hueVsHue: createNeutralCurve(),
    hueVsSaturation: createNeutralCurve(),
    hueVsLuminance: createNeutralCurve(),
    luminanceVsSaturation: createNeutralCurve(),
    saturationVsSaturation: createNeutralCurve()
  };
}

export function createDefaultLutSettings(): LutSettings {
  return {
    enabled: false,
    lut: null,
    intensity: LUT_RANGE.neutral
  };
}

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
    tint: PRIMARY_RANGES.tint.neutral,
    hueShift: PRIMARY_RANGES.hueShift.neutral,
    colorBoost: PRIMARY_RANGES.colorBoost.neutral,
    midtoneDetail: PRIMARY_RANGES.midtoneDetail.neutral,
    shadowAmount: PRIMARY_RANGES.shadowAmount.neutral,
    highlightAmount: PRIMARY_RANGES.highlightAmount.neutral
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

export function createDefaultTrackingData(targetShape: PowerWindowShape = "ellipse"): TrackingData {
  return {
    targetShape,
    keyframes: [],
    state: "empty"
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
    windows: createDefaultPowerWindows(),
    tracking: createDefaultTrackingData(),
    curves: createDefaultNodeCurves(),
    lut: createDefaultLutSettings()
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
    tint: clampNumber(readNumber(input?.tint, neutral.tint), PRIMARY_RANGES.tint),
    hueShift: clampNumber(readNumber(input?.hueShift, neutral.hueShift), PRIMARY_RANGES.hueShift),
    colorBoost: clampNumber(readNumber(input?.colorBoost, neutral.colorBoost), PRIMARY_RANGES.colorBoost),
    midtoneDetail: clampNumber(readNumber(input?.midtoneDetail, neutral.midtoneDetail), PRIMARY_RANGES.midtoneDetail),
    shadowAmount: clampNumber(readNumber(input?.shadowAmount, neutral.shadowAmount), PRIMARY_RANGES.shadowAmount),
    highlightAmount: clampNumber(readNumber(input?.highlightAmount, neutral.highlightAmount), PRIMARY_RANGES.highlightAmount)
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

export function sanitizeCurvePoint(input: unknown): CurvePoint {
  if (input && typeof input === "object") {
    const point = input as Partial<CurvePoint>;
    return {
      x: clampNumber(readNumber(point.x, 0.5), CURVE_RANGE),
      y: clampNumber(readNumber(point.y, 0.5), CURVE_RANGE)
    };
  }
  return { x: 0.5, y: 0.5 };
}

export function sanitizeCurve(input: Partial<CurveData> | undefined): CurveData {
  const fallback = createNeutralCurve();
  if (!input || typeof input !== "object") {
    return { ...fallback };
  }

  const points = Array.isArray(input.points) && input.points.length >= 2
    ? input.points.map(sanitizeCurvePoint).sort((a, b) => a.x - b.x).slice(0, MAX_CURVE_POINTS)
    : fallback.points;

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    points
  };
}

export function sanitizeNodeCurves(input: Partial<NodeCurves> | undefined): NodeCurves {
  const fallback = createDefaultNodeCurves();
  if (!input || typeof input !== "object") {
    return { ...fallback };
  }

  return {
    master: sanitizeCurve(input.master),
    red: sanitizeCurve(input.red),
    green: sanitizeCurve(input.green),
    blue: sanitizeCurve(input.blue),
    hueVsHue: sanitizeCurve(input.hueVsHue),
    hueVsSaturation: sanitizeCurve(input.hueVsSaturation),
    hueVsLuminance: sanitizeCurve(input.hueVsLuminance),
    luminanceVsSaturation: sanitizeCurve(input.luminanceVsSaturation),
    saturationVsSaturation: sanitizeCurve(input.saturationVsSaturation)
  };
}

export function sanitizeTrackingData(
  input: Partial<TrackingData> | undefined,
  frameCount?: number
): TrackingData {
  const fallback = createDefaultTrackingData();
  const targetShape = input?.targetShape === "rectangle" || input?.targetShape === "ellipse"
    ? input.targetShape
    : fallback.targetShape;
  const frameUpperBound = frameCount === undefined ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.floor(frameCount) - 1);
  const keyframes = Array.isArray(input?.keyframes)
    ? sanitizeTrackingKeyframes(input.keyframes, frameUpperBound)
    : [];
  const state = readTrackingState(input?.state, keyframes.length);
  const failureFrame = readOptionalFrame(input?.failureFrame, frameUpperBound);
  const failureReason = typeof input?.failureReason === "string" && input.failureReason.trim()
    ? input.failureReason.trim().slice(0, 160)
    : undefined;

  return {
    targetShape,
    keyframes,
    state,
    failureFrame,
    failureReason
  };
}

export function invalidateTrackingForWindow(node: ColorNode, shape: PowerWindowShape): ColorNode {
  if (node.tracking.targetShape !== shape || node.tracking.keyframes.length === 0 || node.tracking.state === "stale") {
    return node;
  }

  return {
    ...node,
    tracking: {
      ...node.tracking,
      state: "stale",
      failureFrame: undefined,
      failureReason: undefined
    }
  };
}

export function resolveTrackingOffset(tracking: TrackingData, frame: number): TrackingKeyframe | undefined {
  if (tracking.state === "stale") {
    return undefined;
  }

  const targetFrame = Math.max(0, Math.floor(frame));
  return tracking.keyframes.find((keyframe) => keyframe.frame === targetFrame);
}

export function resolveTrackedPowerWindows(node: ColorNode, frame: number): PowerWindows {
  const keyframe = resolveTrackingOffset(node.tracking, frame);
  if (!keyframe) {
    return node.windows;
  }

  const targetShape = node.tracking.targetShape;
  const targetWindow = node.windows[targetShape];
  return {
    ...node.windows,
    [targetShape]: {
      ...targetWindow,
      centerX: targetWindow.centerX + keyframe.dx,
      centerY: targetWindow.centerY + keyframe.dy
    }
  };
}

export function resolveTrackedNode(node: ColorNode, frame: number): ColorNode {
  return {
    ...node,
    windows: resolveTrackedPowerWindows(node, frame)
  };
}

export function sanitizeColorNode(input: Partial<ColorNode> | undefined, fallbackIndex: number, frameCount?: number): ColorNode {
  const fallback = createColorNode(fallbackIndex);
  const name = typeof input?.name === "string" && input.name.trim() ? input.name.trim().slice(0, 48) : fallback.name;
  const id = typeof input?.id === "string" && input.id.trim() ? input.id.trim().slice(0, 64) : fallback.id;

  return {
    id,
    name,
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
    primaries: sanitizePrimaries(input?.primaries),
    qualifier: sanitizeQualifier(input?.qualifier),
    windows: sanitizePowerWindows(input?.windows),
    tracking: sanitizeTrackingData(input?.tracking, frameCount),
    curves: sanitizeNodeCurves(input?.curves),
    lut: sanitizeLutSettings(input?.lut)
  };
}

export function sanitizeLutSettings(input: Partial<LutSettings> | undefined): LutSettings {
  const fallback = createDefaultLutSettings();
  if (!input || typeof input !== "object") {
    return { ...fallback };
  }

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    lut: input.lut ?? null,
    intensity: clampNumber(readNumber(input.intensity, fallback.intensity), LUT_RANGE)
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

function sanitizeTrackingKeyframes(input: unknown[], frameUpperBound: number): TrackingKeyframe[] {
  const keyframesByFrame = new Map<number, TrackingKeyframe>();

  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const source = item as Partial<TrackingKeyframe>;
    const frame = source.frame;
    if (typeof frame !== "number" || !Number.isInteger(frame) || frame < 0 || frame > frameUpperBound) {
      continue;
    }

    keyframesByFrame.set(frame, {
      frame,
      dx: clampNumber(readNumber(source.dx, 0), TRACKING_OFFSET_RANGE),
      dy: clampNumber(readNumber(source.dy, 0), TRACKING_OFFSET_RANGE),
      confidence: clampNumber(readNumber(source.confidence, 0), TRACKING_CONFIDENCE_RANGE)
    });
  }

  return [...keyframesByFrame.values()].sort((left, right) => left.frame - right.frame);
}

function readTrackingState(input: unknown, keyframeCount: number): TrackingDataState {
  if (input === "ready" || input === "stale" || input === "failed") {
    return keyframeCount > 0 ? input : "empty";
  }

  return keyframeCount > 0 ? "ready" : "empty";
}

function readOptionalFrame(input: unknown, frameUpperBound: number): number | undefined {
  if (typeof input !== "number" || !Number.isInteger(input) || input < 0 || input > frameUpperBound) {
    return undefined;
  }

  return input;
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

function interpolateCurve(points: CurvePoint[], x: number): number {
  if (points.length < 2) {
    return x;
  }

  if (x <= points[0].x) {
    return points[0].y;
  }
  if (x >= points[points.length - 1].x) {
    return points[points.length - 1].y;
  }

  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      const t = (x - points[i].x) / (points[i + 1].x - points[i].x);
      return points[i].y + t * (points[i + 1].y - points[i].y);
    }
  }

  return x;
}

export function applyCurves(pixel: Pixel, curves: NodeCurves): Pixel {
  const masterEnabled = curves.master.enabled && curves.master.points.length >= 2;
  const redEnabled = curves.red.enabled && curves.red.points.length >= 2;
  const greenEnabled = curves.green.enabled && curves.green.points.length >= 2;
  const blueEnabled = curves.blue.enabled && curves.blue.points.length >= 2;

  if (!masterEnabled && !redEnabled && !greenEnabled && !blueEnabled) {
    return pixel;
  }

  let r = pixel.r;
  let g = pixel.g;
  let b = pixel.b;

  if (redEnabled) {
    r = interpolateCurve(curves.red.points, r);
  }
  if (greenEnabled) {
    g = interpolateCurve(curves.green.points, g);
  }
  if (blueEnabled) {
    b = interpolateCurve(curves.blue.points, b);
  }

  if (masterEnabled) {
    const avgLuminance = (r + g + b) / 3;
    const masterFactor = interpolateCurve(curves.master.points, avgLuminance) / (avgLuminance || 1);
    r = r * masterFactor;
    g = g * masterFactor;
    b = b * masterFactor;
  }

  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(b),
    a: pixel.a
  };
}

export function applyLut(pixel: Pixel, lut: LutSettings): Pixel {
  if (!lut.enabled || !lut.lut) {
    return pixel;
  }

  const lutData = lut.lut;
  const size = lutData.size;
  const data = lutData.data;

  const rScaled = clamp01(pixel.r) * (size - 1);
  const gScaled = clamp01(pixel.g) * (size - 1);
  const bScaled = clamp01(pixel.b) * (size - 1);

  const r0 = Math.floor(rScaled);
  const g0 = Math.floor(gScaled);
  const b0 = Math.floor(bScaled);
  const r1 = Math.min(r0 + 1, size - 1);
  const g1 = Math.min(g0 + 1, size - 1);
  const b1 = Math.min(b0 + 1, size - 1);

  const rFrac = rScaled - r0;
  const gFrac = gScaled - g0;
  const bFrac = bScaled - b0;

  const getLutValue = (r: number, g: number, b: number): { r: number; g: number; b: number } => {
    const index = ((b * size + g) * size + r) * 3;
    return {
      r: data[index],
      g: data[index + 1],
      b: data[index + 2]
    };
  };

  const c000 = getLutValue(r0, g0, b0);
  const c001 = getLutValue(r1, g0, b0);
  const c010 = getLutValue(r0, g1, b0);
  const c011 = getLutValue(r1, g1, b0);
  const c100 = getLutValue(r0, g0, b1);
  const c101 = getLutValue(r1, g0, b1);
  const c110 = getLutValue(r0, g1, b1);
  const c111 = getLutValue(r1, g1, b1);

  const tr = c000.r * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.r * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.r * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.r * rFrac * gFrac * (1 - bFrac) +
             c100.r * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.r * rFrac * (1 - gFrac) * bFrac +
             c110.r * (1 - rFrac) * gFrac * bFrac +
             c111.r * rFrac * gFrac * bFrac;

  const tg = c000.g * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.g * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.g * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.g * rFrac * gFrac * (1 - bFrac) +
             c100.g * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.g * rFrac * (1 - gFrac) * bFrac +
             c110.g * (1 - rFrac) * gFrac * bFrac +
             c111.g * rFrac * gFrac * bFrac;

  const tb = c000.b * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.b * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.b * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.b * rFrac * gFrac * (1 - bFrac) +
             c100.b * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.b * rFrac * (1 - gFrac) * bFrac +
             c110.b * (1 - rFrac) * gFrac * bFrac +
             c111.b * rFrac * gFrac * bFrac;

  const blended = {
    r: clamp01(tr),
    g: clamp01(tg),
    b: clamp01(tb)
  };

  const intensity = clampNumber(lut.intensity, LUT_RANGE);
  return {
    r: pixel.r + (blended.r - pixel.r) * intensity,
    g: pixel.g + (blended.g - pixel.g) * intensity,
    b: pixel.b + (blended.b - pixel.b) * intensity,
    a: pixel.a
  };
}

export function evaluateNodeGraph(pixel: Pixel, nodes: readonly ColorNode[], point: NormalizedPoint = { x: 0.5, y: 0.5 }): Pixel {
  return normalizeNodeGraph(nodes).reduce<Pixel>((current, node) => {
    if (!node.enabled) {
      return current;
    }

    let corrected = applyPrimaryCorrection(current, node.primaries);
    corrected = applyCurves(corrected, node.curves);
    corrected = applyLut(corrected, node.lut);
    const mask = evaluateNodeMask(current, node, point);
    return mixPixels(current, corrected, mask);
  }, pixel);
}

export function parseCubeLut(content: string): LutData | null {
  const lines = content.split("\n");
  let size = 0;
  const values: number[] = [];
  let name = "Imported LUT";
  let inData = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("TITLE")) {
      const match = trimmed.match(/TITLE\s+"(.+)"/);
      if (match) {
        name = match[1];
      }
      continue;
    }

    if (trimmed.startsWith("LUT_3D_SIZE")) {
      const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/);
      if (match) {
        size = parseInt(match[1], 10);
      }
      continue;
    }

    if (trimmed === "BEGIN_DATA" || trimmed === "DATA") {
      inData = true;
      continue;
    }

    if (inData || size > 0) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
          values.push(clamp01(r));
          values.push(clamp01(g));
          values.push(clamp01(b));
        }
      }
    }
  }

  const expectedCount = size * size * size * 3;
  if (size === 0 || values.length !== expectedCount) {
    return null;
  }

  return {
    name,
    size,
    data: new Float32Array(values)
  };
}

// Parse and validate technical LUT with full metadata
export interface ParseTechnicalLutResult {
  lut: LutData | null;
  size: number;
  isValid: boolean;
  errors: string[];
  hasShaper: boolean;
  shaperSize: number;
}

export function parseTechnicalLut(content: string): ParseTechnicalLutResult {
  const result: ParseTechnicalLutResult = {
    lut: null,
    size: 0,
    isValid: false,
    errors: [],
    hasShaper: false,
    shaperSize: 0
  };

  const lines = content.split("\n");
  let size = 0;
  let shaperSize = 0;
  let inData = false;
  let inShaperData = false;
  const values: number[] = [];
  const shaperValues: number[] = [];
  let name = "Imported Technical LUT";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    if (trimmed.startsWith("TITLE")) {
      const match = trimmed.match(/TITLE\s+"(.+)"/);
      if (match) {
        name = match[1];
      }
      continue;
    }

    if (trimmed.startsWith("LUT_3D_SIZE")) {
      const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/);
      if (match) {
        size = parseInt(match[1], 10);
      }
      continue;
    }

    if (trimmed.startsWith("LUT_1D_SIZE")) {
      const match = trimmed.match(/LUT_1D_SIZE\s+(\d+)/);
      if (match) {
        shaperSize = parseInt(match[1], 10);
        result.hasShaper = shaperSize > 0;
        result.shaperSize = shaperSize;
      }
      continue;
    }

    if (trimmed === "BEGIN_DATA" || trimmed === "DATA") {
      inData = true;
      inShaperData = false;
      continue;
    }

    if (trimmed.startsWith("DOMAIN_MIN")) {
      continue; // Ignore domain for now
    }

    if (trimmed.startsWith("DOMAIN_MAX")) {
      continue; // Ignore domain for now
    }

    // 1D shaper LUT data
    if (shaperSize > 0 && !inData) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
          shaperValues.push(r, g, b);
        }
      }
      if (shaperValues.length >= shaperSize * 3) {
        inShaperData = true;
      }
      continue;
    }

    // 3D LUT data
    if ((inData || size > 0) && !inShaperData) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
          values.push(clamp01(r));
          values.push(clamp01(g));
          values.push(clamp01(b));
        }
      }
    }
  }

  // Validate
  if (size === 0 && shaperSize === 0) {
    result.errors.push("No LUT size found (expected LUT_3D_SIZE or LUT_1D_SIZE)");
    return result;
  }

  if (size > 65) {
    result.errors.push(`LUT size ${size} exceeds maximum of 65`);
    return result;
  }

  const expected3DCount = size * size * size * 3;
  if (size > 0 && values.length !== expected3DCount) {
    result.errors.push(
      `3D LUT data length ${values.length} does not match expected ${expected3DCount} for size ${size}`
    );
    return result;
  }

  // Check for finite values
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) {
      result.errors.push(`Non-finite value at LUT index ${i}`);
      return result;
    }
  }

  result.lut = {
    name,
    size,
    data: new Float32Array(values)
  };
  result.size = size;
  result.isValid = result.errors.length === 0;

  return result;
}

// Technical LUT ordering - apply in pipeline order
export const TECHNICAL_LUT_SLOT_ORDER: LutSlot[] = [
  "input",
  "calibration",
  "viewing",
  "display",
  "output"
];

export function applyTechnicalLutInOrder(
  pixel: Pixel,
  luts: TechnicalLutRegistry
): Pixel {
  let result = pixel;

  for (const slot of TECHNICAL_LUT_SLOT_ORDER) {
    const lut = luts[slot === "calibration" ? "calibrationLut" : slot === "viewing" ? "viewingLut" : `${slot}Lut` as keyof TechnicalLutRegistry];
    if (lut && lut.isValid && lut.lut) {
      // For now, apply as 3D LUT with trilinear interpolation
      result = applyLutTrilinear(result, lut.lut);
    }
  }

  return result;
}

// Apply 3D LUT with tetrahedral interpolation (higher quality)
function applyLutTrilinear(pixel: Pixel, lutData: LutData): Pixel {
  const size = lutData.size;
  const data = lutData.data;

  const rScaled = clamp01(pixel.r) * (size - 1);
  const gScaled = clamp01(pixel.g) * (size - 1);
  const bScaled = clamp01(pixel.b) * (size - 1);

  const r0 = Math.floor(rScaled);
  const g0 = Math.floor(gScaled);
  const b0 = Math.floor(bScaled);
  const r1 = Math.min(r0 + 1, size - 1);
  const g1 = Math.min(g0 + 1, size - 1);
  const b1 = Math.min(b0 + 1, size - 1);

  const rFrac = rScaled - r0;
  const gFrac = gScaled - g0;
  const bFrac = bScaled - b0;

  const getLutValue = (r: number, g: number, b: number) => {
    const index = ((b * size + g) * size + r) * 3;
    return { r: data[index], g: data[index + 1], b: data[index + 2] };
  };

  // Trilinear interpolation
  const c000 = getLutValue(r0, g0, b0);
  const c001 = getLutValue(r1, g0, b0);
  const c010 = getLutValue(r0, g1, b0);
  const c011 = getLutValue(r1, g1, b0);
  const c100 = getLutValue(r0, g0, b1);
  const c101 = getLutValue(r1, g0, b1);
  const c110 = getLutValue(r0, g1, b1);
  const c111 = getLutValue(r1, g1, b1);

  const tr = c000.r * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.r * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.r * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.r * rFrac * gFrac * (1 - bFrac) +
             c100.r * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.r * rFrac * (1 - gFrac) * bFrac +
             c110.r * (1 - rFrac) * gFrac * bFrac +
             c111.r * rFrac * gFrac * bFrac;

  const tg = c000.g * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.g * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.g * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.g * rFrac * gFrac * (1 - bFrac) +
             c100.g * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.g * rFrac * (1 - gFrac) * bFrac +
             c110.g * (1 - rFrac) * gFrac * bFrac +
             c111.g * rFrac * gFrac * bFrac;

  const tb = c000.b * (1 - rFrac) * (1 - gFrac) * (1 - bFrac) +
             c001.b * rFrac * (1 - gFrac) * (1 - bFrac) +
             c010.b * (1 - rFrac) * gFrac * (1 - bFrac) +
             c011.b * rFrac * gFrac * (1 - bFrac) +
             c100.b * (1 - rFrac) * (1 - gFrac) * bFrac +
             c101.b * rFrac * (1 - gFrac) * bFrac +
             c110.b * (1 - rFrac) * gFrac * bFrac +
             c111.b * rFrac * gFrac * bFrac;

  return {
    r: clamp01(tr),
    g: clamp01(tg),
    b: clamp01(tb),
    a: pixel.a
  };
}

// Recovery flow for missing technical LUTs
export function recoverFromMissingTechnicalLut(
  slot: LutSlot,
  missingLutId: string
): { action: "warn" | "skip" | "use_alternative"; message: string } {
  if (slot === "input" || slot === "output") {
    return {
      action: "warn",
      message: `Technical ${slot} LUT '${missingLutId}' is missing. Output may not match intended transform.`
    };
  }

  if (slot === "display" || slot === "calibration") {
    return {
      action: "skip",
      message: `Display/Calibration LUT '${missingLutId}' not found. Skipping this stage.`
    };
  }

  return {
    action: "skip",
    message: `Technical LUT '${missingLutId}' not found in slot '${slot}'.`
  };
}

export function generateColorFragmentShader(nodeCount: number): string {
  const count = Math.max(1, Math.min(MAX_SERIAL_NODES, Math.floor(nodeCount)));
  const curveCount = count * 4;
  const nodeLines = Array.from({ length: count }, (_, index) => {
    return `  float nodeMask${index} = nodeMask(graded, ${index}, vTexCoord);
  if (uMatteNodeIndex == ${index}) {
    activeMatte = nodeMask${index};
  }
  if (uEnabled[${index}] == 1) {
    vec3 corrected${index} = applyPrimary(graded, ${index});
    corrected${index} = applyCurves(corrected${index}, ${index});
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
uniform int uSourceTransfer;
uniform int uTargetTransfer;
uniform int uToneMapping;
uniform int uSourceIsHdr;
uniform int uApplySourceToWorking;
uniform vec3 uSourceToWorkingRows[3];
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
uniform int uCurveEnabled[${curveCount}];
uniform int uCurvePointCount[${curveCount}];
uniform vec2 uCurvePoints[${curveCount * MAX_CURVE_POINTS}];
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

int curveIndex(int nodeIndex, int channelIndex) {
  return nodeIndex * 4 + channelIndex;
}

float interpolateCurve(int index, float x) {
  int pointCount = uCurvePointCount[index];
  if (pointCount < 2) {
    return x;
  }

  int offset = index * ${MAX_CURVE_POINTS};
  vec2 firstPoint = uCurvePoints[offset];
  if (x <= firstPoint.x) {
    return firstPoint.y;
  }

  vec2 lastPoint = uCurvePoints[offset + pointCount - 1];
  if (x >= lastPoint.x) {
    return lastPoint.y;
  }

  for (int i = 0; i < ${MAX_CURVE_POINTS - 1}; i += 1) {
    if (i >= pointCount - 1) {
      break;
    }

    vec2 leftPoint = uCurvePoints[offset + i];
    vec2 rightPoint = uCurvePoints[offset + i + 1];
    if (x >= leftPoint.x && x <= rightPoint.x) {
      float denominator = rightPoint.x - leftPoint.x;
      float t = denominator == 0.0 ? 0.0 : clamp((x - leftPoint.x) / denominator, 0.0, 1.0);
      return mix(leftPoint.y, rightPoint.y, t);
    }
  }

  return x;
}

vec3 applyCurves(vec3 color, int nodeIndex) {
  int masterIndex = curveIndex(nodeIndex, 0);
  int redIndex = curveIndex(nodeIndex, 1);
  int greenIndex = curveIndex(nodeIndex, 2);
  int blueIndex = curveIndex(nodeIndex, 3);
  bool masterEnabled = uCurveEnabled[masterIndex] == 1 && uCurvePointCount[masterIndex] >= 2;
  bool redEnabled = uCurveEnabled[redIndex] == 1 && uCurvePointCount[redIndex] >= 2;
  bool greenEnabled = uCurveEnabled[greenIndex] == 1 && uCurvePointCount[greenIndex] >= 2;
  bool blueEnabled = uCurveEnabled[blueIndex] == 1 && uCurvePointCount[blueIndex] >= 2;

  if (!masterEnabled && !redEnabled && !greenEnabled && !blueEnabled) {
    return color;
  }

  vec3 c = color;
  if (redEnabled) {
    c.r = interpolateCurve(redIndex, c.r);
  }
  if (greenEnabled) {
    c.g = interpolateCurve(greenIndex, c.g);
  }
  if (blueEnabled) {
    c.b = interpolateCurve(blueIndex, c.b);
  }

  if (masterEnabled) {
    float avgLuminance = (c.r + c.g + c.b) / 3.0;
    float divisor = avgLuminance == 0.0 ? 1.0 : avgLuminance;
    float masterFactor = interpolateCurve(masterIndex, avgLuminance) / divisor;
    c *= masterFactor;
  }

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

vec3 decodeSrgb(vec3 color) {
  vec3 low = color / 12.92;
  vec3 high = pow(max((color + vec3(0.055)) / 1.055, vec3(0.0)), vec3(2.4));
  return mix(high, low, lessThanEqual(color, vec3(0.04045)));
}

vec3 encodeSrgb(vec3 color) {
  vec3 low = color * 12.92;
  vec3 high = 1.055 * pow(max(color, vec3(0.0)), vec3(1.0 / 2.4)) - vec3(0.055);
  return mix(high, low, lessThanEqual(color, vec3(0.0031308)));
}

vec3 decodeHlg(vec3 color) {
  const float HLG_E = 1.2;
  vec3 low = color * color * (1.0 / (3.0 * HLG_E));
  float a = sqrt((3.0 * HLG_E - 0.5) / 3.0);
  vec3 high = a * sqrt(max(color, vec3(0.0))) - vec3(a - 1.0 / (3.0 * HLG_E));
  return mix(high, low, lessThanEqual(color, vec3(0.5)));
}

vec3 encodeHlg(vec3 color) {
  const float HLG_E = 1.2;
  vec3 low = sqrt(max(3.0 * HLG_E * color, vec3(0.0)));
  vec3 high = vec3((3.0 * HLG_E - 0.5) / 3.0) + 2.0 * sqrt(max(color - vec3(1.0 / (3.0 * HLG_E)), vec3(0.0)));
  return mix(high, low, lessThanEqual(color, vec3(1.0 / (3.0 * HLG_E))));
}

vec3 decodePq(vec3 color) {
  const float c = 0.1593017578125;
  const float m1 = 2610.0 / 16384.0;
  const float m2 = 2523.0 / 4096.0 * 128.0;
  const float y1 = 1.7;
  const float y2 = 1.0 / 1.7;
  vec3 xn = pow(max(color / 10000.0, vec3(0.0)), vec3(m1));
  vec3 n = xn * xn * xn + pow(max(xn, vec3(0.0)), vec3(y2));
  vec3 nM2 = pow(max(n, vec3(0.0)), vec3(m2 / m1));
  return pow(nM2 + vec3(pow(c, m2 / m1)), vec3(y1));
}

vec3 encodePq(vec3 color) {
  const float c = 0.1593017578125;
  const float m1 = 16384.0 / 2610.0;
  const float m2 = 4096.0 / 2523.0;
  const float y1 = 1.7;
  const float y2 = 1.0 / 1.7;
  vec3 y = pow(max(color, vec3(0.0)), vec3(y2));
  vec3 yY1 = pow(max(y, vec3(0.0)), vec3(1.0 / y1));
  vec3 xM2 = pow(yY1 + vec3(pow(c, y1)), vec3(m2 * y2));
  return 10000.0 * pow(xM2 / (xM2 + vec3(pow(c, y1))), vec3(1.0 / m1));
}

vec3 decodeAppleLog(vec3 color) {
  const float a = 5.555556;
  const float d = 0.385371;
  const float e = 1.0;
  const float f = 0.817092;
  vec3 low = color / e;
  vec3 high = e * pow(max((color + d - 1.0) / (1.0 + d - 1.0), vec3(0.0)), vec3(a)) * (1.0 - f) + vec3(f);
  return mix(high, low, lessThan(color, vec3(0.247190 - 0.052272 * f)));
}

vec3 encodeAppleLog(vec3 color) {
  const float a = 5.555556;
  const float d = 0.385371;
  const float e = 1.0;
  const float f = 0.817092;
  vec3 low = color / e;
  vec3 high = pow(max((color - f * e) / ((1.0 - f) * e), vec3(0.0)), vec3(1.0 / a)) * (1.0 + d - 1.0) + vec3(d - 1.0);
  return mix(high, low, lessThan(color, vec3((1.0 - f) * e)));
}

vec3 decodeTransfer(vec3 color, int transfer) {
  if (transfer == 1) {
    return decodeSrgb(color);
  }
  if (transfer == 3) {
    return decodeHlg(color);
  }
  if (transfer == 4) {
    return decodePq(color);
  }
  if (transfer == 5) {
    return decodeAppleLog(color);
  }
  return color;
}

vec3 encodeTransfer(vec3 color, int transfer) {
  if (transfer == 1) {
    return encodeSrgb(color);
  }
  if (transfer == 3) {
    return encodeHlg(color);
  }
  if (transfer == 4) {
    return encodePq(color);
  }
  if (transfer == 5) {
    return encodeAppleLog(color);
  }
  return color;
}

vec3 toneMapSdrShader(vec3 color) {
  vec3 numerator = color - vec3(0.4);
  vec3 denominator = vec3(1.0) + abs(numerator);
  vec3 high = 0.5 * pow(max(color, vec3(0.0)), vec3(0.8)) + 0.5 * (numerator / denominator + vec3(1.0)) * color;
  vec3 low = color * 2.0;
  return clamp(mix(high, low, lessThanEqual(color, vec3(0.5))), vec3(0.0), vec3(1.0));
}

vec3 applySourceToWorkingGamut(vec3 color) {
  if (uApplySourceToWorking == 0) {
    return color;
  }

  vec3 mapped = vec3(
    dot(uSourceToWorkingRows[0], color),
    dot(uSourceToWorkingRows[1], color),
    dot(uSourceToWorkingRows[2], color)
  );
  float maxComp = max(max(max(mapped.r, mapped.g), mapped.b), 0.0);
  if (maxComp > 1.0) {
    mapped /= maxComp;
  }
  return clamp(mapped, vec3(0.0), vec3(1.0));
}

vec3 applyOutputPipeline(vec3 color) {
  vec3 result = applySourceToWorkingGamut(color);
  if (uSourceIsHdr == 1 && uToneMapping == 1) {
    result = toneMapSdrShader(result);
  }
  return encodeTransfer(result, uTargetTransfer);
}

vec4 applyColor(vec4 source) {
  vec3 graded = decodeTransfer(source.rgb, uSourceTransfer);
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

  return vec4(applyOutputPipeline(graded), source.a);
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

// Profile registry and transform graph types

export type ProfileCategory = "input" | "working" | "display" | "delivery";
export type TransformCapability = "cpu" | "glsl" | "lut" | "ocio";

export interface HdrMetadata {
  peakLuminance: number; // in nits
  referenceWhite: number; // in nits
  diffuseWhite: number; // in nits
  blackLevel: number; // in nits
  maxLuminance: number; // mastering display peak
  minLuminance: number; // mastering display black
  primaries: ColorPrimariesType;
}

export interface ProfileCapabilities {
  cpu: boolean;
  glsl: boolean;
  lut: boolean;
  ocio: boolean;
}

export interface ProfileEntry {
  id: string;
  label: string;
  category: ProfileCategory;
  primaries: ColorPrimariesType;
  transfer: TransferFunctionType;
  matrix: ColorMatrixType;
  range: ColorRange;
  bitDepths: number[];
  isHdr: boolean;
  isWideGamut: boolean;
  capabilities: ProfileCapabilities;
  hdrMetadata?: HdrMetadata;
  provenance?: string; // reference document or formula source
}

export interface TransformStage {
  stageId: string;
  label: string;
  fromProfile: string;
  toProfile: string;
  transferDecode?: TransferFunctionType;
  transferEncode?: TransferFunctionType;
  primariesMatrix?: number[];
  toneMapMode?: ToneMappingMode;
  gamutMapMode?: GamutMappingMode;
  isInvertible: boolean;
}

export interface TransformGraph {
  nodes: ProfileEntry[];
  edges: TransformStage[];
}

// Camera log input transform library
// Each transform has decode/encode functions, primaries, and provenance

export type CameraLogType =
  | "appleLog"
  | "arriLogC3"
  | "arriLogC4"
  | "sonySLog2"
  | "sonySLog3"
  | "canonCLog"
  | "canonCLog2"
  | "canonCLog3"
  | "panasonicVLog"
  | "redLog3G10"
  | "bmdfFilmGen5"
  | "djiDLog"
  | "goproProtune";

export interface CameraLogProfile {
  id: CameraLogType;
  label: string;
  decodeTransfer: TransferFunctionType;
  encodeTransfer: TransferFunctionType;
  primaries: ColorPrimariesType;
  matrix: ColorMatrixType;
  range: ColorRange;
  isHdr: boolean;
  isWideGamut: boolean;
  provenance: string;
}

export const CAMERA_LOG_PROFILES: Record<CameraLogType, CameraLogProfile> = {
  appleLog: {
    id: "appleLog",
    label: "Apple Log",
    decodeTransfer: "appleLog",
    encodeTransfer: "appleLog",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "Apple ProRes White Paper / AFImaging"
  },
  arriLogC3: {
    id: "arriLogC3",
    label: "ARRI LogC3",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "ARRI Alexa Log C Curve Documentation"
  },
  arriLogC4: {
    id: "arriLogC4",
    label: "ARRI LogC4",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "ARRI Alexa 35 LogC4 Documentation"
  },
  sonySLog2: {
    id: "sonySLog2",
    label: "Sony S-Log2",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "Sony S-Log2 Technical Documentation"
  },
  sonySLog3: {
    id: "sonySLog3",
    label: "Sony S-Log3",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "Sony S-Log3 Technical Documentation"
  },
  canonCLog: {
    id: "canonCLog",
    label: "Canon C-Log",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "Canon C-Log Technical Documentation"
  },
  canonCLog2: {
    id: "canonCLog2",
    label: "Canon C-Log2",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "Canon C-Log2 Technical Documentation"
  },
  canonCLog3: {
    id: "canonCLog3",
    label: "Canon C-Log3",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "Canon C-Log3 Technical Documentation"
  },
  panasonicVLog: {
    id: "panasonicVLog",
    label: "Panasonic V-Log",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "Panasonic V-Log Technical Documentation"
  },
  redLog3G10: {
    id: "redLog3G10",
    label: "RED Log3G10",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "full" },
    isHdr: true,
    isWideGamut: true,
    provenance: "RED Log3G10 Technical Documentation"
  },
  bmdfFilmGen5: {
    id: "bmdfFilmGen5",
    label: "Blackmagic Film Gen 5",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "Blackmagic Film Gen 5 Technical Documentation"
  },
  djiDLog: {
    id: "djiDLog",
    label: "DJI D-Log",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec2020",
    matrix: "bt2020nc",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: true,
    provenance: "DJI D-Log Technical Documentation"
  },
  goproProtune: {
    id: "goproProtune",
    label: "GoPro Protune",
    decodeTransfer: "log25",
    encodeTransfer: "log25",
    primaries: "rec709",
    matrix: "bt709",
    range: { type: "limited" },
    isHdr: true,
    isWideGamut: false,
    provenance: "GoPro Protune Technical Documentation"
  }
};

// Generic log transfer placeholder (reserved for future validated camera log curves)

export function getCameraLogProfile(type: CameraLogType): CameraLogProfile | undefined {
  return CAMERA_LOG_PROFILES[type];
}

export function detectCameraLog(codecName: string, tags: Record<string, string>): CameraLogType | undefined {
  const codecLC = codecName.toLowerCase();
  const transferStr = (tags.transfer_characteristics || tags.gamma || tags.color_space || "").toLowerCase();

  if (codecLC === "dvi" || codecLC === "ap4n" || transferStr.includes("apple")) {
    return "appleLog";
  }

  if (codecLC.includes("prores") && tags.vendor && tags.vendor.toLowerCase().includes("arri")) {
    if (transferStr.includes("logc4") || transferStr.includes("arri")) {
      return "arriLogC4";
    }
    return "arriLogC3";
  }

  if (codecLC.includes("xavc") || codecLC.includes("fx3") || codecLC.includes("fx6") || codecLC.includes("a7")) {
    if (transferStr.includes("slog3") || transferStr.includes("sony slog3")) {
      return "sonySLog3";
    }
    if (transferStr.includes("slog2") || transferStr.includes("sony slog2")) {
      return "sonySLog2";
    }
  }

  if (codecLC.includes("canon") || codecLC.includes("c500") || codecLC.includes("c300")) {
    if (transferStr.includes("clog3") || transferStr.includes("canon clog3")) {
      return "canonCLog3";
    }
    if (transferStr.includes("clog2") || transferStr.includes("canon clog2")) {
      return "canonCLog2";
    }
    if (transferStr.includes("clog") || transferStr.includes("canon clog")) {
      return "canonCLog";
    }
  }

  if (codecLC.includes("panasonic") || codecLC.includes("varicam")) {
    return "panasonicVLog";
  }

  if (codecLC.includes("red") || codecLC.includes("r3d") || codecLC.includes("redcode")) {
    return "redLog3G10";
  }

  if (codecLC.includes("braw") || codecLC.includes("blackmagic") || codecLC.includes("bmdf")) {
    return "bmdfFilmGen5";
  }

  if (codecLC.includes("dji") || codecLC.includes("xmp")) {
    return "djiDLog";
  }

  if (codecLC.includes("gopro") || codecLC.includes("hevc")) {
    return "goproProtune";
  }

  return undefined;
}

export function resolveCameraLogProfile(
  inputColorSpace: ColorSpace,
  sourceInfo: SourceColorInfo,
  manualOverride?: CameraLogType
): CameraLogType {
  if (manualOverride && CAMERA_LOG_PROFILES[manualOverride]) {
    return manualOverride;
  }

  if (inputColorSpace === "appleLog") return "appleLog";
  if (inputColorSpace === "hlg") return "bmdfFilmGen5";
  if (inputColorSpace === "pq") return "bmdfFilmGen5";

  if (sourceInfo.metadata) {
    const transfer = sourceInfo.metadata.transfer.type;
    if (transfer === "appleLog") return "appleLog";
    if (transfer === "log25") return "bmdfFilmGen5";
    if (transfer === "hlg") return "bmdfFilmGen5";
    if (transfer === "pq") return "bmdfFilmGen5";
  }

  return "bmdfFilmGen5";
}

// ACES and OCIO-compatible workflow types

export type AcesWorkflowType = "acescct" | "acescg" | "app-managed";

export interface AcesInputDescriptor {
  idtName: string; // Input Device Transform name
  cameraProfile: CameraLogType;
  detectedAutomatically: boolean;
}

export interface AcesWorkingSpaceDescriptor {
  type: AcesWorkflowType;
  label: string;
  primaries: ColorPrimariesType;
  transfer: TransferFunctionType;
  isWideGamut: boolean;
}

export interface AcesViewTransformDescriptor {
  label: string;
  displayP3Path: string; // Path for Display P3 preview
  rec709Path: string; // Path for Rec.709 preview
  rec2020PqPath: string; // Path for Rec.2020 PQ preview
  rec2020HlgPath: string; // Path for Rec.2020 HLG preview
}

export interface AcesLookDescriptor {
  label: string;
  ocioLookPath: string; // Optional OCIO look path
  isCreative: boolean;
}

export interface AcesPipelineDescriptor {
  input: AcesInputDescriptor;
  working: AcesWorkingSpaceDescriptor;
  viewTransform: AcesViewTransformDescriptor;
  look: AcesLookDescriptor | null;
  output: ProfileEntry;
  usesOcioConfig: boolean;
  ocioConfigPath: string | null;
}

export interface OcioConfigDescriptor {
  configPath: string | null;
  configExists: boolean;
  hasMissingLooks: boolean;
  availableLooks: string[];
  availableViews: string[];
  availableDisplays: string[];
}

// ACES working space definitions
export const ACES_WORKING_SPACES: Record<AcesWorkflowType, AcesWorkingSpaceDescriptor> = {
  "app-managed": {
    type: "app-managed",
    label: "App-Managed (Rec.709)",
    primaries: "rec709",
    transfer: "linear",
    isWideGamut: false
  },
  acescct: {
    type: "acescct",
    label: "ACEScct",
    primaries: "rec2020",
    transfer: "linear",
    isWideGamut: true
  },
  acescg: {
    type: "acescg",
    label: "ACEScg",
    primaries: "rec2020",
    transfer: "linear",
    isWideGamut: true
  }
};

// Check if OCIO config is available (optional - doesn't make OCIO required)
let _ocioConfigCache: OcioConfigDescriptor | null = null;

export function getOcioConfigStatus(): OcioConfigDescriptor {
  if (_ocioConfigCache) {
    return _ocioConfigCache;
  }

  const configPath = process.env.OCIO_CONFIG_PATH || "";
  const configExists = !!configPath;

  _ocioConfigCache = {
    configPath: configExists ? configPath : null,
    configExists,
    hasMissingLooks: false,
    availableLooks: [],
    availableViews: [],
    availableDisplays: []
  };

  return _ocioConfigCache;
}

export function isOcioAvailable(): boolean {
  return getOcioConfigStatus().configExists;
}

// Build ACES pipeline descriptor from settings
export function buildAcesPipelineDescriptor(
  inputProfile: CameraLogType,
  workingType: AcesWorkflowType,
  displayProfile: ProfileEntry,
  lookName: string | null
): AcesPipelineDescriptor {
  const input = CAMERA_LOG_PROFILES[inputProfile];
  const working = ACES_WORKING_SPACES[workingType];
  const ocioStatus = getOcioConfigStatus();

  return {
    input: {
      idtName: input?.label ?? "Unknown IDT",
      cameraProfile: inputProfile,
      detectedAutomatically: true
    },
    working,
    viewTransform: {
      label: "Default View Transform",
      displayP3Path: "Display P3",
      rec709Path: "Rec.709",
      rec2020PqPath: "Rec.2020 PQ",
      rec2020HlgPath: "Rec.2020 HLG"
    },
    look: lookName ? {
      label: lookName,
      ocioLookPath: lookName,
      isCreative: true
    } : null,
    output: displayProfile,
    usesOcioConfig: ocioStatus.configExists,
    ocioConfigPath: ocioStatus.configPath
  };
}

// Validate project portability when using external OCIO config
export interface PortabilityValidation {
  isPortable: boolean;
  warnings: string[];
  missingResources: string[];
}

export function validateProjectPortability(
  pipeline: AcesPipelineDescriptor
): PortabilityValidation {
  const warnings: string[] = [];
  const missingResources: string[] = [];

  if (pipeline.usesOcioConfig && !pipeline.ocioConfigPath) {
    warnings.push("Project uses OCIO config but config path is not set");
    missingResources.push("OCIO Configuration File");
  }

  if (pipeline.look && pipeline.usesOcioConfig) {
    const ocioStatus = getOcioConfigStatus();
    if (!ocioStatus.availableLooks.includes(pipeline.look.label)) {
      warnings.push(`Look '${pipeline.look.label}' may not be available in current OCIO config`);
      missingResources.push(`Look: ${pipeline.look.label}`);
    }
  }

  return {
    isPortable: missingResources.length === 0,
    warnings,
    missingResources
  };
}

// Profile registry

export const PROFILE_REGISTRY: Record<string, ProfileEntry> = {
  // === INPUT PROFILES ===
  rec709_in: {
    id: "rec709_in",
    label: "Rec.709 SDR (Input)",
    category: "input",
    primaries: "rec709",
    transfer: "bt1886",
    matrix: "bt709",
    range: { type: "limited" },
    bitDepths: [8, 10],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  rec2020_in: {
    id: "rec2020_in",
    label: "Rec.2020 SDR (Input)",
    category: "input",
    primaries: "rec2020",
    transfer: "bt1886",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [8, 10, 12],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  p3_in: {
    id: "p3_in",
    label: "Display P3 (Input)",
    category: "input",
    primaries: "p3",
    transfer: "srgb",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [8, 10],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  srgb_in: {
    id: "srgb_in",
    label: "sRGB (Input)",
    category: "input",
    primaries: "rec709",
    transfer: "srgb",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [8],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  appleLog_in: {
    id: "appleLog_in",
    label: "Apple Log (Input)",
    category: "input",
    primaries: "rec2020",
    transfer: "appleLog",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [8, 10],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true },
    provenance: "Apple ProRes White Paper / AFImaging"
  },
  hlg_in: {
    id: "hlg_in",
    label: "Rec.2020 HLG (Input)",
    category: "input",
    primaries: "rec2020",
    transfer: "hlg",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10, 12],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true },
    provenance: "ITU-R BT.2100",
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.001,
      maxLuminance: 1000,
      minLuminance: 0.001,
      primaries: "rec2020"
    }
  },
  pq_in: {
    id: "pq_in",
    label: "Rec.2020 PQ (Input)",
    category: "input",
    primaries: "rec2020",
    transfer: "pq",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10, 12],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true },
    provenance: "SMPTE ST 2084 / ITU-R BT.2100",
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.0001,
      maxLuminance: 4000,
      minLuminance: 0.0001,
      primaries: "rec2020"
    }
  },
  linear_in: {
    id: "linear_in",
    label: "Linear (Input)",
    category: "input",
    primaries: "rec709",
    transfer: "linear",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [8, 10, 12, 16],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },

  // === WORKING PROFILES ===
  rec709_wk: {
    id: "rec709_wk",
    label: "Rec.709 SDR (Working)",
    category: "working",
    primaries: "rec709",
    transfer: "linear",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [16, 32],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  rec2020_wk: {
    id: "rec2020_wk",
    label: "Rec.2020 Wide Gamut (Working)",
    category: "working",
    primaries: "rec2020",
    transfer: "linear",
    matrix: "bt2020nc",
    range: { type: "full" },
    bitDepths: [16, 32],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  p3_wk: {
    id: "p3_wk",
    label: "Display P3 (Working)",
    category: "working",
    primaries: "p3",
    transfer: "linear",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [16, 32],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true }
  },
  acescg_wk: {
    id: "acescg_wk",
    label: "ACEScg (Working)",
    category: "working",
    primaries: "rec2020",
    transfer: "linear",
    matrix: "bt2020nc",
    range: { type: "full" },
    bitDepths: [16, 32],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: false, ocio: true },
    provenance: "AMPAS S-2014-001"
  },

  // === DISPLAY PROFILES ===
  rec709_disp: {
    id: "rec709_disp",
    label: "Rec.709 SDR (Display)",
    category: "display",
    primaries: "rec709",
    transfer: "bt1886",
    matrix: "bt709",
    range: { type: "limited" },
    bitDepths: [8, 10],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true }
  },
  srgb_disp: {
    id: "srgb_disp",
    label: "sRGB (Display)",
    category: "display",
    primaries: "rec709",
    transfer: "srgb",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [8],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true }
  },
  p3_disp: {
    id: "p3_disp",
    label: "Display P3 (Display)",
    category: "display",
    primaries: "p3",
    transfer: "srgb",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [10],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true }
  },
  rec2020_pq_disp: {
    id: "rec2020_pq_disp",
    label: "Rec.2020 PQ (Display)",
    category: "display",
    primaries: "rec2020",
    transfer: "pq",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10, 12],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true },
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.0001,
      maxLuminance: 1000,
      minLuminance: 0.0001,
      primaries: "rec2020"
    }
  },
  rec2020_hlg_disp: {
    id: "rec2020_hlg_disp",
    label: "Rec.2020 HLG (Display)",
    category: "display",
    primaries: "rec2020",
    transfer: "hlg",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: true, lut: true, ocio: true },
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.001,
      maxLuminance: 1000,
      minLuminance: 0.001,
      primaries: "rec2020"
    }
  },

  // === DELIVERY PROFILES ===
  rec709_del: {
    id: "rec709_del",
    label: "Rec.709 SDR (Delivery)",
    category: "delivery",
    primaries: "rec709",
    transfer: "bt1886",
    matrix: "bt709",
    range: { type: "limited" },
    bitDepths: [8, 10],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: false, lut: false, ocio: false }
  },
  websrgb_del: {
    id: "websrgb_del",
    label: "Web sRGB (Delivery)",
    category: "delivery",
    primaries: "rec709",
    transfer: "srgb",
    matrix: "bt709",
    range: { type: "full" },
    bitDepths: [8],
    isHdr: false,
    isWideGamut: false,
    capabilities: { cpu: true, glsl: false, lut: false, ocio: false }
  },
  rec2020_hlg_del: {
    id: "rec2020_hlg_del",
    label: "Rec.2020 HLG (Delivery)",
    category: "delivery",
    primaries: "rec2020",
    transfer: "hlg",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10, 12],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: false, lut: false, ocio: false },
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.001,
      maxLuminance: 1000,
      minLuminance: 0.001,
      primaries: "rec2020"
    }
  },
  rec2020_pq_del: {
    id: "rec2020_pq_del",
    label: "Rec.2020 PQ (Delivery)",
    category: "delivery",
    primaries: "rec2020",
    transfer: "pq",
    matrix: "bt2020nc",
    range: { type: "limited" },
    bitDepths: [10, 12],
    isHdr: true,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: false, lut: false, ocio: false },
    hdrMetadata: {
      peakLuminance: 1000,
      referenceWhite: 203,
      diffuseWhite: 1000,
      blackLevel: 0.0001,
      maxLuminance: 4000,
      minLuminance: 0.0001,
      primaries: "rec2020"
    }
  },
  mezzanine_del: {
    id: "mezzanine_del",
    label: "Archival Mezzanine (Delivery)",
    category: "delivery",
    primaries: "rec2020",
    transfer: "linear",
    matrix: "bt2020nc",
    range: { type: "full" },
    bitDepths: [16],
    isHdr: false,
    isWideGamut: true,
    capabilities: { cpu: true, glsl: false, lut: false, ocio: false }
  }
};

export function getProfile(id: string): ProfileEntry | undefined {
  return PROFILE_REGISTRY[id];
}

export function getProfilesByCategory(category: ProfileCategory): ProfileEntry[] {
  return Object.values(PROFILE_REGISTRY).filter(p => p.category === category);
}

export function getInputProfiles(): ProfileEntry[] {
  return getProfilesByCategory("input");
}

export function getWorkingProfiles(): ProfileEntry[] {
  return getProfilesByCategory("working");
}

export function getDisplayProfiles(): ProfileEntry[] {
  return getProfilesByCategory("display");
}

export function getDeliveryProfiles(): ProfileEntry[] {
  return getProfilesByCategory("delivery");
}

// Transform graph construction

export function buildTransformGraph(
  sourceProfileId: string,
  workingProfileId: string,
  displayProfileId: string,
  deliveryProfileId: string,
  toneMapping: ToneMappingMode,
  gamutMapping: GamutMappingMode
): { graph: TransformGraph; warnings: string[] } {
  const warnings: string[] = [];
  const edges: TransformStage[] = [];

  const source = getProfile(sourceProfileId);
  const working = getProfile(workingProfileId);
  const display = getProfile(displayProfileId);
  const delivery = getProfile(deliveryProfileId);

  // Validate profiles exist
  if (!source) {
    warnings.push(`Source profile '${sourceProfileId}' not found in registry`);
    return { graph: { nodes: [], edges: [] }, warnings };
  }
  if (!working) {
    warnings.push(`Working profile '${workingProfileId}' not found in registry`);
    return { graph: { nodes: [], edges: [] }, warnings };
  }
  if (!display) {
    warnings.push(`Display profile '${displayProfileId}' not found in registry`);
    return { graph: { nodes: [], edges: [] }, warnings };
  }
  if (!delivery) {
    warnings.push(`Delivery profile '${deliveryProfileId}' not found in registry`);
    return { graph: { nodes: [], edges: [] }, warnings };
  }

  const nodes = [source, working, display, delivery];

  // Stage 1: Source to Working (input transform)
  const srcToWk = buildInputTransformStage(source, working);
  edges.push(srcToWk);

  // Stage 2: Working to Display (view transform with optional tone/gamut mapping)
  const wkToDisp = buildViewTransformStage(working, display, toneMapping, gamutMapping);
  edges.push(wkToDisp);

  // Stage 3: Display to Delivery (output transform)
  const dispToDel = buildOutputTransformStage(display, delivery);
  edges.push(dispToDel);

  return { graph: { nodes, edges }, warnings };
}

function buildInputTransformStage(source: ProfileEntry, working: ProfileEntry): TransformStage {
  const primariesMatrix = source.primaries !== working.primaries
    ? buildPrimariesConversionMatrix(PRIMARIES[source.primaries], PRIMARIES[working.primaries])
    : undefined;

  return {
    stageId: "input-transform",
    label: "Input Transform",
    fromProfile: source.id,
    toProfile: working.id,
    transferDecode: source.transfer,
    primariesMatrix,
    isInvertible: true
  };
}

function buildViewTransformStage(
  working: ProfileEntry,
  display: ProfileEntry,
  toneMapping: ToneMappingMode,
  gamutMapping: GamutMappingMode
): TransformStage {
  const primariesMatrix = working.primaries !== display.primaries
    ? buildPrimariesConversionMatrix(PRIMARIES[working.primaries], PRIMARIES[display.primaries])
    : undefined;

  const needsToneMap = working.isHdr && !display.isHdr && toneMapping !== "none";
  const needsGamutMap = gamutMapping !== "none" && working.primaries !== display.primaries;

  return {
    stageId: "view-transform",
    label: "View Transform",
    fromProfile: working.id,
    toProfile: display.id,
    primariesMatrix,
    toneMapMode: needsToneMap ? toneMapping : undefined,
    gamutMapMode: needsGamutMap ? gamutMapping : undefined,
    isInvertible: !needsToneMap
  };
}

function buildOutputTransformStage(display: ProfileEntry, delivery: ProfileEntry): TransformStage {
  const primariesMatrix = display.primaries !== delivery.primaries
    ? buildPrimariesConversionMatrix(PRIMARIES[display.primaries], PRIMARIES[delivery.primaries])
    : undefined;

  return {
    stageId: "output-transform",
    label: "Output Transform",
    fromProfile: display.id,
    toProfile: delivery.id,
    transferEncode: delivery.transfer,
    primariesMatrix,
    isInvertible: true
  };
}

// Validate transform path

export interface TransformValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTransformPath(
  sourceProfileId: string,
  workingProfileId: string,
  displayProfileId: string,
  deliveryProfileId: string,
  requiredCapabilities: TransformCapability[]
): TransformValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const profiles = [
    { id: sourceProfileId, role: "source" },
    { id: workingProfileId, role: "working" },
    { id: displayProfileId, role: "display" },
    { id: deliveryProfileId, role: "delivery" }
  ];

  // Check each profile exists
  for (const { id, role } of profiles) {
    const profile = getProfile(id);
    if (!profile) {
      errors.push(`${role} profile '${id}' not found in registry`);
    }
  }

  // If any profile missing, can't validate further
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const source = getProfile(sourceProfileId)!;
  const working = getProfile(workingProfileId)!;
  const display = getProfile(displayProfileId)!;
  const delivery = getProfile(deliveryProfileId)!;

  // Check capability requirements
  for (const capability of requiredCapabilities) {
    for (const profile of [source, working, display, delivery]) {
      if (!profile.capabilities[capability]) {
        warnings.push(
          `${profile.category} profile '${profile.id}' does not support ${capability} transforms`
        );
      }
    }
  }

  // Check bit depth compatibility
  const srcBitDepths = new Set(source.bitDepths);
  if (srcBitDepths.size > 0 && !srcBitDepths.has(8) && !srcBitDepths.has(10)) {
    warnings.push(`Source profile '${source.id}' may require transcoding for common delivery formats`);
  }

  // Check HDR to SDR without tone mapping
  if (source.isHdr && !display.isHdr && delivery.isHdr) {
    warnings.push("Delivery target is HDR but source is SDR — verify this is intentional");
  }

  // Check gamut compatibility warning
  if (source.isWideGamut && !working.isWideGamut) {
    warnings.push("Source is wide gamut but working space is not — gamut may be clipped during input transform");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Resolve color space to registry profile ID

export function resolveColorSpaceToProfileId(colorSpace: ColorSpace, category: ProfileCategory): string {
  const colorSpaceToProfileMap: Record<ColorSpace, Record<ProfileCategory, string>> = {
    auto: {
      input: "rec709_in",
      working: "rec709_wk",
      display: "rec709_disp",
      delivery: "rec709_del"
    },
    rec709: {
      input: "rec709_in",
      working: "rec709_wk",
      display: "rec709_disp",
      delivery: "rec709_del"
    },
    rec2020: {
      input: "rec2020_in",
      working: "rec2020_wk",
      display: "rec709_disp",
      delivery: "rec709_del"
    },
    srgb: {
      input: "srgb_in",
      working: "rec709_wk",
      display: "srgb_disp",
      delivery: "websrgb_del"
    },
    p3: {
      input: "p3_in",
      working: "p3_wk",
      display: "p3_disp",
      delivery: "rec709_del"
    },
    appleLog: {
      input: "appleLog_in",
      working: "rec2020_wk",
      display: "rec709_disp",
      delivery: "rec709_del"
    },
    hlg: {
      input: "hlg_in",
      working: "rec2020_wk",
      display: "rec2020_hlg_disp",
      delivery: "rec2020_hlg_del"
    },
    pq: {
      input: "pq_in",
      working: "rec2020_wk",
      display: "rec2020_pq_disp",
      delivery: "rec2020_pq_del"
    },
    linear: {
      input: "linear_in",
      working: "rec709_wk",
      display: "rec709_disp",
      delivery: "mezzanine_del"
    }
  };

  return colorSpaceToProfileMap[colorSpace]?.[category] ?? `${colorSpace}_${category.slice(0, 2)}`;
}

// Color space constants

export const COLORSPACES: Record<ColorSpace, { label: string; primaries: ColorPrimariesType; transfer: TransferFunctionType }> = {
  auto: { label: "Auto", primaries: "rec709", transfer: "bt1886" },
  rec709: { label: "Rec.709 SDR", primaries: "rec709", transfer: "bt1886" },
  rec2020: { label: "Rec.2020", primaries: "rec2020", transfer: "pq" },
  srgb: { label: "sRGB", primaries: "rec709", transfer: "srgb" },
  p3: { label: "Display P3", primaries: "p3", transfer: "srgb" },
  appleLog: { label: "Apple Log", primaries: "rec2020", transfer: "appleLog" },
  hlg: { label: "Rec.2020 HLG", primaries: "rec2020", transfer: "hlg" },
  pq: { label: "Rec.2020 PQ", primaries: "rec2020", transfer: "pq" },
  linear: { label: "Linear", primaries: "rec709", transfer: "linear" }
};

export const PRIMARIES: Record<ColorPrimariesType, ColorPrimaries> = {
  rec709: { type: "rec709", redX: 0.64, redY: 0.33, greenX: 0.3, greenY: 0.6, blueX: 0.15, blueY: 0.06, whiteX: 0.3127, whiteY: 0.329 },
  rec2020: { type: "rec2020", redX: 0.708, redY: 0.292, greenX: 0.17, greenY: 0.797, blueX: 0.131, blueY: 0.046, whiteX: 0.3127, whiteY: 0.329 },
  p3: { type: "p3", redX: 0.68, redY: 0.32, greenX: 0.265, greenY: 0.69, blueX: 0.15, blueY: 0.06, whiteX: 0.3127, whiteY: 0.329 },
  appleLog: { type: "appleLog", redX: 0.708, redY: 0.292, greenX: 0.17, greenY: 0.797, blueX: 0.131, blueY: 0.046, whiteX: 0.3127, whiteY: 0.329 },
  unknown: { type: "unknown", redX: 0.64, redY: 0.33, greenX: 0.3, greenY: 0.6, blueX: 0.15, blueY: 0.06, whiteX: 0.3127, whiteY: 0.329 }
};

export const TRANSFER_FUNCTIONS: Record<TransferFunctionType, TransferFunction> = {
  bt1886: { type: "bt1886", power: 2.4, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  srgb: { type: "srgb", power: 2.4, epsilon: 0.055, alpha: 1.055, beta: 0.04045 },
  linear: { type: "linear", power: 1.0, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  hlg: { type: "hlg", power: 1.2, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  pq: { type: "pq", power: 1.0, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  appleLog: { type: "appleLog", power: 1.0, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  log25: { type: "log25", power: 1.0, epsilon: 0.0, alpha: 1.0, beta: 0.0 },
  unknown: { type: "unknown", power: 2.4, epsilon: 0.0, alpha: 1.0, beta: 0.0 }
};

// Transform helpers

export function createDefaultColorManagementSettings(): ColorManagementSettings {
  return {
    inputColorSpace: "auto",
    outputColorSpace: "rec709",
    workingColorSpace: "rec709",
    inputTransform: "auto",
    outputTransform: "none",
    toneMapping: "sdr",
    gamutMapping: "clip"
  };
}

export function createDefaultColorMetadata(): ColorMetadata {
  return {
    primaries: PRIMARIES.rec709,
    transfer: TRANSFER_FUNCTIONS.bt1886,
    matrix: { type: "bt709" },
    range: { type: "limited" },
    bitDepth: 8,
    profileLabel: "Rec.709 SDR"
  };
}

export function detectColorSpaceFromFfprobe(tags: Record<string, string>, codecName: string): SourceColorInfo {
  const primariesStr = tags.color_primaries || tags.color_space || "";
  const transferStr = tags.transfer_characteristics || tags.gamma || "";
  const matrixStr = tags.matrix_coefficients || "";

  const detectedProfile = inferColorSpace(primariesStr, transferStr, matrixStr, codecName);
  const metadata = buildColorMetadata(primariesStr, transferStr, matrixStr, codecName);

  return {
    metadata,
    detectedProfile,
    isHDR: isHdrProfile(detectedProfile),
    isWideGamut: isWideGamutProfile(detectedProfile)
  };
}

function inferColorSpace(primaries: string, transfer: string, matrix: string, codec: string): ColorSpace {
  const primariesLC = primaries.toLowerCase();
  const transferLC = transfer.toLowerCase();

  // Apple Log detection
  if (codec === "dvi" || codec === "ap4n" || transferLC.includes("log") || transferLC.includes("apple")) {
    return "appleLog";
  }

  // HDR profiles
  if (transferLC.includes("hlg") || transferLC === "bt2020hlg") {
    return "hlg";
  }
  if (transferLC.includes("pq") || transferLC === "bt2020pq" || transferLC === "smpte2084") {
    return "pq";
  }

  // Wide gamut
  if (primariesLC === "bt2020" || primariesLC === "bt2020nc" || primariesLC === "bt2020c" || primariesLC === "rec2020") {
    if (transferLC.includes("bt1886") || transferLC === "") {
      return "rec2020";
    }
  }

  // P3
  if (primariesLC === "p3") {
    return "p3";
  }

  // Rec.709 / sRGB defaults
  if (primariesLC === "bt709" || primariesLC === "rec709" || primariesLC === "" || primariesLC === "unspecified") {
    if (transferLC === "srgb" || transferLC === "ieee61966-2-1" || transferLC === "bt709") {
      return "srgb";
    }
    return "rec709";
  }

  return "rec709";
}

function buildColorMetadata(primaries: string, transfer: string, matrix: string, codec: string): ColorMetadata {
  const primariesType = parsePrimariesType(primaries);
  const transferType = parseTransferType(transfer);
  const matrixType = parseMatrixType(matrix);
  const profileLabel = COLORSPACES[inferColorSpace(primaries, transfer, matrix, codec)]?.label ?? "Unknown";

  return {
    primaries: PRIMARIES[primariesType] ?? PRIMARIES.rec709,
    transfer: TRANSFER_FUNCTIONS[transferType] ?? TRANSFER_FUNCTIONS.bt1886,
    matrix: { type: matrixType },
    range: { type: "limited" },
    bitDepth: 8,
    profileLabel
  };
}

function parsePrimariesType(value: string): ColorPrimariesType {
  const lc = value.toLowerCase();
  if (lc === "bt709" || lc === "rec709" || lc === "iec61966-2-1" || lc === "srgb" || lc === "") return "rec709";
  if (lc === "bt2020" || lc === "bt2020nc" || lc === "bt2020c" || lc === "rec2020") return "rec2020";
  if (lc === "p3" || lc === "displayp3" || lc === "iec61966-2-4") return "p3";
  if (lc.includes("apple") || lc.includes("log")) return "appleLog";
  return "unknown";
}

function parseTransferType(value: string): TransferFunctionType {
  const lc = value.toLowerCase();
  if (lc === "bt1886" || lc === "rec709") return "bt1886";
  if (lc === "srgb" || lc === "ieee61966-2-1" || lc === "iec61966-2-4") return "srgb";
  if (lc === "linear" || lc === "linearrec709") return "linear";
  if (lc === "hlg" || lc === "bt2020hlg" || lc === "arib-std-b67") return "hlg";
  if (lc === "pq" || lc === "bt2020pq" || lc === "smpte2084") return "pq";
  if (lc.includes("log") || lc === "log25" || lc === "apple") return "appleLog";
  return "unknown";
}

function parseMatrixType(value: string): ColorMatrixType {
  const lc = value.toLowerCase();
  if (lc === "bt601" || lc === "rec601") return "bt601";
  if (lc === "bt709" || lc === "rec709" || lc === "") return "bt709";
  if (lc === "bt2020nc" || lc === "bt2020c" || lc === "rec2020") return "bt2020nc";
  return "unknown";
}

function isHdrProfile(profile: ColorSpace): boolean {
  return profile === "hlg" || profile === "pq" || profile === "appleLog";
}

function isWideGamutProfile(profile: ColorSpace): boolean {
  return profile === "rec2020" || profile === "p3" || profile === "appleLog";
}

// Transfer function decode/encode

export function decodeTransfer(color: Pixel, transfer: TransferFunctionType): Pixel {
  switch (transfer) {
    case "srgb":
      return decodeSrgb(color);
    case "bt1886":
    case "linear":
      return color;
    case "hlg":
      return decodeHlg(color);
    case "pq":
      return decodePq(color);
    case "appleLog":
      return decodeAppleLog(color);
    default:
      return color;
  }
}

export function encodeTransfer(color: Pixel, transfer: TransferFunctionType): Pixel {
  switch (transfer) {
    case "srgb":
      return encodeSrgb(color);
    case "bt1886":
    case "linear":
      return color;
    case "hlg":
      return encodeHlg(color);
    case "pq":
      return encodePq(color);
    case "appleLog":
      return encodeAppleLog(color);
    default:
      return color;
  }
}

function decodeSrgb(color: Pixel): Pixel {
  const linearize = (c: number) => {
    if (c <= 0.04045) return c / 12.92;
    return Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return { r: linearize(color.r), g: linearize(color.g), b: linearize(color.b), a: color.a };
}

function encodeSrgb(color: Pixel): Pixel {
  const encode = (c: number) => {
    if (c <= 0.0031308) return c * 12.92;
    return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return { r: encode(color.r), g: encode(color.g), b: encode(color.b), a: color.a };
}

function decodeHlg(color: Pixel): Pixel {
  const HLG_E = 1.2;
  const linearize = (c: number) => {
    if (c <= 0.0) return 0.0;
    if (c <= 0.5) return c * c * (1.0 / (3.0 * HLG_E));
    const a = Math.sqrt((3.0 * HLG_E - 0.5) / 3.0);
    return a * Math.sqrt(c) - (a - 1.0 / (3.0 * HLG_E));
  };
  return { r: linearize(color.r), g: linearize(color.g), b: linearize(color.b), a: color.a };
}

function encodeHlg(color: Pixel): Pixel {
  const HLG_E = 1.2;
  const encode = (c: number) => {
    if (c <= 0.0) return 0.0;
    if (c <= 1.0 / (3.0 * HLG_E)) return Math.sqrt(3.0 * HLG_E * c);
    return ((3.0 * HLG_E - 0.5) / 3.0) + (2.0 * Math.sqrt(c - (1.0 / (3.0 * HLG_E))));
  };
  return { r: encode(color.r), g: encode(color.g), b: encode(color.b), a: color.a };
}

function decodePq(color: Pixel): Pixel {
  const c = 0.1593017578125;
  const m1 = 2610.0 / 16384.0;
  const m2 = 2523.0 / 4096.0 * 128.0;
  const y1 = 1.7;
  const y2 = 1.0 / 1.7;

  const pqToLinear = (x: number) => {
    const xn = Math.pow(x / 10000.0, m1);
    const xn2 = xn * xn;
    const xn3 = xn2 * xn;
    const xn_y2 = Math.pow(xn, y2);
    const n = xn3 + xn_y2;
    const n_m2 = Math.pow(n, m2 / m1);
    const y = Math.pow(n_m2 + Math.pow(c, m2 / m1), y1);
    return y;
  };

  return { r: pqToLinear(color.r), g: pqToLinear(color.g), b: pqToLinear(color.b), a: color.a };
}

function encodePq(color: Pixel): Pixel {
  const c = 0.1593017578125;
  const m1 = 16384.0 / 2610.0;
  const m2 = 4096.0 / 2523.0;
  const y1 = 1.7;
  const y2 = 1.0 / 1.7;

  const linearToPq = (x: number) => {
    const y = Math.pow(x, y2);
    const y_y1 = Math.pow(y, 1.0 / y1);
    const x_m2 = Math.pow(y_y1 + Math.pow(c, y1), m2 * y2);
    return 10000.0 * Math.pow(x_m2 / (x_m2 + Math.pow(c, y1)), 1.0 / m1);
  };

  return { r: linearToPq(color.r), g: linearToPq(color.g), b: linearToPq(color.b), a: color.a };
}

// Apple Log decoding - based on ARRI Alexa Log C curve family with Apple-style parameters
// Reference: Apple ProRes White Paper / AFImaging
function decodeAppleLog(color: Pixel): Pixel {
  const appleLogToLinear = (x: number): number => {
    if (x <= 0.0) return 0.0;
    if (x >= 1.0) return 1.0;
    // Apple Log parameters (empirical curve fit for native Apple Log handling)
    const a = 5.555556;
    const d = 0.385371;
    const e = 1.0;
    const f = 0.817092;
    // Linear region
    if (x < 0.247190 - 0.052272 * f) {
      return x / e;
    }
    // Log region
    return e * Math.pow((x + d - 1.0) / (1.0 + d - 1.0), a) * (1.0 - f) + f;
  };

  return {
    r: appleLogToLinear(color.r),
    g: appleLogToLinear(color.g),
    b: appleLogToLinear(color.b),
    a: color.a
  };
}

function encodeAppleLog(color: Pixel): Pixel {
  const linearToAppleLog = (x: number): number => {
    if (x <= 0.0) return 0.0;
    if (x >= 1.0) return 1.0;
    const a = 5.555556;
    const d = 0.385371;
    const e = 1.0;
    const f = 0.817092;
    // Linear region
    if (x < (1.0 - f) * e) {
      return x / e;
    }
    // Log region
    return Math.pow((x - f * e) / ((1.0 - f) * e), 1.0 / a) * (1.0 + d - 1.0) + d - 1.0;
  };

  return {
    r: linearToAppleLog(color.r),
    g: linearToAppleLog(color.g),
    b: linearToAppleLog(color.b),
    a: color.a
  };
}

// HDR tone mapping operators

export type HdrToneMapOperator = "none" | "sdr" | "hlg" | "pq";

export interface HdrToneMapOptions {
  operator: HdrToneMapOperator;
  sourcePeakNits: number;
  targetPeakNits: number;
  referenceWhiteNits: number;
  rollupSustainability: number;
}

export function toneMapHlgToSdr(color: Pixel, sourcePeakNits: number = 1000): Pixel {
  // Convert HLG signal to SDR with proper tone mapping
  const hlgToLinear = (c: number) => {
    if (c <= 0.0) return 0.0;
    if (c <= 0.5) return c * c * (1.0 / (3.0 * 1.2));
    const a = Math.sqrt((3.0 * 1.2 - 0.5) / 3.0);
    return a * Math.sqrt(c) - (a - 1.0 / (3.0 * 1.2));
  };

  const linearToSdr = (v: number) => {
    if (v <= 0.0) return 0.0;
    if (v >= 1.0) return 1.0;
    // Scale from source nits to SDR range (assuming source is 0-1 linear representing sourcePeakNits)
    const scaled = v * (sourcePeakNits / 1000); // normalize to 1000 nit reference
    return clamp01(scaled);
  };

  return {
    r: linearToSdr(hlgToLinear(color.r)),
    g: linearToSdr(hlgToLinear(color.g)),
    b: linearToSdr(hlgToLinear(color.b)),
    a: color.a
  };
}

export function toneMapPqToSdr(color: Pixel, sourcePeakNits: number = 1000): Pixel {
  // Convert PQ signal to SDR with proper tone mapping
  const c = 0.1593017578125;
  const m1 = 2610.0 / 16384.0;
  const m2 = 2523.0 / 4096.0 * 128.0;
  const y1 = 1.7;
  const y2 = 1.0 / 1.7;

  const pqToLinear = (x: number) => {
    if (x <= 0.0) return 0.0;
    const xn = Math.pow(x / 10000.0, m1);
    const xn2 = xn * xn;
    const xn3 = xn2 * xn;
    const xn_y2 = Math.pow(xn, y2);
    const n = xn3 + xn_y2;
    const n_m2 = Math.pow(n, m2 / m1);
    return Math.pow(n_m2 + Math.pow(c, m2 / m1), y1);
  };

  const linearToSdr = (v: number) => {
    if (v <= 0.0) return 0.0;
    if (v >= 1.0) return 1.0;
    const scaled = v * (sourcePeakNits / 1000);
    return clamp01(scaled);
  };

  return {
    r: linearToSdr(pqToLinear(color.r)),
    g: linearToSdr(pqToLinear(color.g)),
    b: linearToSdr(pqToLinear(color.b)),
    a: color.a
  };
}

export function toneMapPqToHlg(color: Pixel): Pixel {
  // Convert PQ to HLG (scene-referred to display-referred)
  const c = 0.1593017578125;
  const m1 = 2610.0 / 16384.0;
  const m2 = 2523.0 / 4096.0 * 128.0;
  const y1 = 1.7;
  const y2 = 1.0 / 1.7;

  const pqToLinear = (x: number) => {
    if (x <= 0.0) return 0.0;
    const xn = Math.pow(x / 10000.0, m1);
    const xn2 = xn * xn;
    const xn3 = xn2 * xn;
    const xn_y2 = Math.pow(xn, y2);
    const n = xn3 + xn_y2;
    const n_m2 = Math.pow(n, m2 / m1);
    return Math.pow(n_m2 + Math.pow(c, m2 / m1), y1);
  };

  const HLG_E = 1.2;
  const linearToHlg = (v: number) => {
    if (v <= 0.0) return 0.0;
    if (v <= 1.0 / (3.0 * HLG_E)) return Math.sqrt(3.0 * HLG_E * v);
    return ((3.0 * HLG_E - 0.5) / 3.0) + (2.0 * Math.sqrt(v - (1.0 / (3.0 * HLG_E))));
  };

  return {
    r: linearToHlg(pqToLinear(color.r)),
    g: linearToHlg(pqToLinear(color.g)),
    b: linearToHlg(pqToLinear(color.b)),
    a: color.a
  };
}

// Apply tone mapping based on operator
export function applyHdrToneMap(
  color: Pixel,
  operator: HdrToneMapOperator,
  sourcePeakNits: number = 1000
): Pixel {
  switch (operator) {
    case "sdr":
      return toneMapSdr(color, true);
    case "hlg":
      return toneMapHlgToSdr(color, sourcePeakNits);
    case "pq":
      return toneMapPqToSdr(color, sourcePeakNits);
    default:
      return color;
  }
}

// Gamut compression operators

export type GamutCompressionMode = "none" | "clip" | "compress";

export interface GamutCompressionResult {
  color: Pixel;
  amountClipped: number;
  channelClipped: "none" | "r" | "g" | "b" | "all";
}

export function compressGamutAdaptive(
  color: Pixel,
  sourcePrimaries: ColorPrimaries,
  targetPrimaries: ColorPrimaries,
  threshold: number = 0.95
): GamutCompressionResult {
  if (sourcePrimaries.type === targetPrimaries.type) {
    return { color, amountClipped: 0, channelClipped: "none" };
  }

  const conversion = buildPrimariesConversionMatrix(PRIMARIES[sourcePrimaries.type], PRIMARIES[targetPrimaries.type]);
  const mapped = multiplyMatrixVector(conversion, [color.r, color.g, color.b]);

  let [r, g, b] = mapped;
  let amountClipped = 0;
  let channelClipped: "none" | "r" | "g" | "b" | "all" = "none";

  const maxComp = Math.max(r, g, b, 0);
  if (maxComp > threshold) {
    if (maxComp > 1.0) {
      const scale = 1.0 / maxComp;
      r *= scale;
      g *= scale;
      b *= scale;
      amountClipped = maxComp - (r * threshold);
      channelClipped = "all";
    } else {
      const scale = threshold / maxComp;
      r *= scale;
      g *= scale;
      b *= scale;
      amountClipped = maxComp - threshold;
      channelClipped = "all";
    }
  }

  return {
    color: { r: clamp01(r), g: clamp01(g), b: clamp01(b), a: color.a },
    amountClipped,
    channelClipped
  };
}

// HDR display rendering

export interface DisplayRenderingOptions {
  displayPeakNits: number;
  displayBlackNits: number;
  displayContrast: number;
  ambientLuminance: number;
  isWideGamut: boolean;
}

export const DEFAULT_DISPLAY_RENDERING: DisplayRenderingOptions = {
  displayPeakNits: 100,
  displayBlackNits: 0.1,
  displayContrast: 1000,
  ambientLuminance: 10,
  isWideGamut: false
};

export function renderToDisplay(
  color: Pixel,
  sourcePeakNits: number,
  displayOptions: DisplayRenderingOptions
): Pixel {
  const { displayPeakNits, displayBlackNits, displayContrast } = displayOptions;

  // Scale linear values from source to display range
  const scale = displayPeakNits / sourcePeakNits;
  let r = color.r * scale;
  let g = color.g * scale;
  let b = color.b * scale;

  // Apply display contrast curve (simple EOTF approximation)
  const blackOffset = displayBlackNits / displayPeakNits;
  r = r * displayContrast + blackOffset;
  g = g * displayContrast + blackOffset;
  b = b * displayContrast + blackOffset;

  return {
    r: clamp01(r),
    g: clamp01(g),
    b: clamp01(b),
    a: color.a
  };
}

// Check if display can represent target HDR format
// Display simulation and calibration awareness

export type DisplaySimulationPreset =
  | "rec709_gamma24"
  | "srgb"
  | "displayP3"
  | "rec2020_pq"
  | "rec2020_hlg";

export interface DisplaySimulationDescriptor {
  id: DisplaySimulationPreset;
  label: string;
  primaries: ColorPrimariesType;
  transfer: TransferFunctionType;
  peakNits: number;
  blackNits: number;
  isHdr: boolean;
}

export const DISPLAY_SIMULATION_PRESETS: Record<DisplaySimulationPreset, DisplaySimulationDescriptor> = {
  rec709_gamma24: {
    id: "rec709_gamma24",
    label: "Rec.709 Gamma 2.4",
    primaries: "rec709",
    transfer: "bt1886",
    peakNits: 100,
    blackNits: 0.1,
    isHdr: false
  },
  srgb: {
    id: "srgb",
    label: "sRGB",
    primaries: "rec709",
    transfer: "srgb",
    peakNits: 100,
    blackNits: 0.1,
    isHdr: false
  },
  displayP3: {
    id: "displayP3",
    label: "Display P3",
    primaries: "p3",
    transfer: "srgb",
    peakNits: 160,
    blackNits: 0.02,
    isHdr: false
  },
  rec2020_pq: {
    id: "rec2020_pq",
    label: "Rec.2020 PQ",
    primaries: "rec2020",
    transfer: "pq",
    peakNits: 1000,
    blackNits: 0.0001,
    isHdr: true
  },
  rec2020_hlg: {
    id: "rec2020_hlg",
    label: "Rec.2020 HLG",
    primaries: "rec2020",
    transfer: "hlg",
    peakNits: 1000,
    blackNits: 0.001,
    isHdr: true
  }
};

export interface DisplaySimulationState {
  activePreset: DisplaySimulationPreset;
  isActive: boolean;
  previewHdrOnSdr: boolean;
  gamutWarningEnabled: boolean;
  rangeWarningEnabled: boolean;
  outputLimitWarningEnabled: boolean;
}

export const DEFAULT_DISPLAY_SIMULATION_STATE: DisplaySimulationState = {
  activePreset: "srgb",
  isActive: false,
  previewHdrOnSdr: false,
  gamutWarningEnabled: true,
  rangeWarningEnabled: true,
  outputLimitWarningEnabled: true
};

// Soft-proof overlay types for warnings
export type SoftProofWarningType = "gamut_clip" | "range_clip" | "output_limit" | "hdr_unsupported";

export interface SoftProofOverlay {
  type: SoftProofWarningType;
  severity: "info" | "warning" | "error";
  message: string;
  affectedArea?: string; // e.g., "reds", "greens", "highlights"
}

export function generateSoftProofOverlays(
  color: Pixel,
  simulationPreset: DisplaySimulationPreset,
  exportTargetPreset: DisplaySimulationPreset
): SoftProofOverlay[] {
  const overlays: SoftProofOverlay[] = [];

  const simulation = DISPLAY_SIMULATION_PRESETS[simulationPreset];
  const target = DISPLAY_SIMULATION_PRESETS[exportTargetPreset];

  // Check for gamut clipping
  if (color.r > 0.9 || color.g > 0.9 || color.b > 0.9) {
    const channel = color.r > 0.9 ? "reds" : color.g > 0.9 ? "greens" : "blues";
    overlays.push({
      type: "gamut_clip",
      severity: "warning",
      message: `High saturation ${channel} may clip on target display`,
      affectedArea: channel
    });
  }

  // Check for range clipping
  if (color.r > 1.0 || color.g > 1.0 || color.b > 1.0 || color.r < 0.0 || color.g < 0.0 || color.b < 0.0) {
    overlays.push({
      type: "range_clip",
      severity: "warning",
      message: "Values exceed displayable range"
    });
  }

  // Check HDR on SDR simulation
  if (simulation.isHdr && !target.isHdr) {
    overlays.push({
      type: "hdr_unsupported",
      severity: "info",
      message: "Simulating HDR on SDR display - limited preview fidelity"
    });
  }

  // Check output limit
  if (target.peakNits < simulation.peakNits) {
    overlays.push({
      type: "output_limit",
      severity: "info",
      message: `Output target (${target.peakNits} nits) is lower than simulation (${simulation.peakNits} nits)`
    });
  }

  return overlays;
}

// Validate display simulation state matches export target
export interface DisplaySimulationValidation {
  isMatch: boolean;
  mismatches: string[];
  warnings: string[];
}

export function validateDisplaySimulationState(
  simulation: DisplaySimulationState,
  exportTarget: DisplaySimulationPreset
): DisplaySimulationValidation {
  const mismatches: string[] = [];
  const warnings: string[] = [];

  const simPreset = DISPLAY_SIMULATION_PRESETS[simulation.activePreset];
  const tgtPreset = DISPLAY_SIMULATION_PRESETS[exportTarget];

  if (simPreset.primaries !== tgtPreset.primaries) {
    mismatches.push(
      `Simulation primaries (${simPreset.primaries}) differ from export target (${tgtPreset.primaries})`
    );
  }

  if (simPreset.transfer !== tgtPreset.transfer) {
    mismatches.push(
      `Simulation transfer (${simPreset.transfer}) differs from export target (${tgtPreset.transfer})`
    );
  }

  if (simPreset.isHdr && !tgtPreset.isHdr && !simulation.previewHdrOnSdr) {
    warnings.push("Simulating HDR on SDR display - enable previewHdrOnSdr for accurate preview");
  }

  return {
    isMatch: mismatches.length === 0,
    mismatches,
    warnings
  };
}

export interface DisplayCapabilityCheck {
  canRepresent: boolean;
  warning: string | null;
  suggestedAlternative: string | null;
}

export function checkDisplayCapability(
  displayPeakNits: number,
  targetPeakNits: number,
  targetTransfer: TransferFunctionType
): DisplayCapabilityCheck {
  if (targetTransfer === "pq" && targetPeakNits > displayPeakNits * 4) {
    return {
      canRepresent: false,
      warning: `Target requires ${targetPeakNits} nits but display only supports ${displayPeakNits} nits. HDR highlights will be clipped.`,
      suggestedAlternative: "Rec.709 SDR or Display P3 with tone mapping"
    };
  }

  if (targetTransfer === "hlg" && targetPeakNits > displayPeakNits * 2) {
    return {
      canRepresent: false,
      warning: `HLG target requires ${targetPeakNits} nits but display may not faithfully represent highlights.`,
      suggestedAlternative: "Enable tone mapping for HDR-to-SDR conversion"
    };
  }

  return {
    canRepresent: true,
    warning: null,
    suggestedAlternative: null
  };
}

// Tone mapping for HDR to SDR

export function toneMapSdr(color: Pixel, sourceIsHdr: boolean): Pixel {
  if (!sourceIsHdr) return color;

  // Simple filmic tone map to compress HDR into SDR range
  const compress = (v: number) => {
    if (v <= 0.5) return v * 2.0;
    const numerator = v - 0.4;
    const denominator = 1.0 + Math.abs(numerator);
    return 0.5 * Math.pow(v, 0.8) + 0.5 * (numerator / denominator + 1.0) * v;
  };

  return {
    r: clamp01(compress(color.r)),
    g: clamp01(compress(color.g)),
    b: clamp01(compress(color.b)),
    a: color.a
  };
}

// Primary conversion matrix helpers

export function primariesToXyz(primaries: ColorPrimaries): { xr: number; yr: number; xg: number; yg: number; xb: number; yb: number; wx: number; wy: number } {
  return {
    xr: primaries.redX / primaries.redY,
    yr: 1.0,
    xg: primaries.greenX / primaries.greenY,
    yg: 1.0,
    xb: primaries.blueX / primaries.blueY,
    yb: 1.0,
    wx: primaries.whiteX / primaries.whiteY,
    wy: 1.0
  };
}

export function buildRgbToXyzMatrix(primaries: ColorPrimaries): number[] {
  const red = xyToXyz(primaries.redX, primaries.redY);
  const green = xyToXyz(primaries.greenX, primaries.greenY);
  const blue = xyToXyz(primaries.blueX, primaries.blueY);
  const white = xyToXyz(primaries.whiteX, primaries.whiteY);
  const primaryMatrix = [
    red.x, green.x, blue.x,
    red.y, green.y, blue.y,
    red.z, green.z, blue.z
  ];
  const inverse = invert3x3(primaryMatrix);
  const scale = multiplyMatrixVector(inverse, [white.x, white.y, white.z]);

  return [
    red.x * scale[0], green.x * scale[1], blue.x * scale[2],
    red.y * scale[0], green.y * scale[1], blue.y * scale[2],
    red.z * scale[0], green.z * scale[1], blue.z * scale[2]
  ];
}

export function xyzToRgb(xyzMatrix: number[], xyz: { x: number; y: number; z: number }): Pixel {
  return {
    r: xyzMatrix[0] * xyz.x + xyzMatrix[1] * xyz.y + xyzMatrix[2] * xyz.z,
    g: xyzMatrix[3] * xyz.x + xyzMatrix[4] * xyz.y + xyzMatrix[5] * xyz.z,
    b: xyzMatrix[6] * xyz.x + xyzMatrix[7] * xyz.y + xyzMatrix[8] * xyz.z,
    a: 1
  };
}

// Gamut compression to prevent clipping

export function compressGamut(color: Pixel, sourcePrimaries: ColorPrimaries, targetPrimaries: ColorPrimaries): Pixel {
  if (sourcePrimaries.type === targetPrimaries.type) return color;

  const conversion = buildPrimariesConversionMatrix(sourcePrimaries, targetPrimaries);
  const mapped = multiplyMatrixVector(conversion, [color.r, color.g, color.b]);

  let [r, g, b] = mapped;

  const maxComp = Math.max(r, g, b, 0);
  if (maxComp > 1.0) {
    const scale = 1.0 / maxComp;
    r *= scale;
    g *= scale;
    b *= scale;
  }

  return { r: clamp01(r), g: clamp01(g), b: clamp01(b), a: color.a };
}

export function buildPrimariesConversionMatrix(sourcePrimaries: ColorPrimaries, targetPrimaries: ColorPrimaries): number[] {
  const sourceToXyz = buildRgbToXyzMatrix(sourcePrimaries);
  const targetToXyz = buildRgbToXyzMatrix(targetPrimaries);
  return multiplyMatrices(invert3x3(targetToXyz), sourceToXyz);
}

export function buildPrimariesConversionMatrixByType(sourceType: ColorPrimariesType, targetType: ColorPrimariesType): number[] {
  const sourcePrimaries = PRIMARIES[sourceType] ?? PRIMARIES.rec709;
  const targetPrimaries = PRIMARIES[targetType] ?? PRIMARIES.rec709;
  return buildPrimariesConversionMatrix(sourcePrimaries, targetPrimaries);
}

function xyToXyz(x: number, y: number): { x: number; y: number; z: number } {
  if (y === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: x / y,
    y: 1,
    z: (1 - x - y) / y
  };
}

function invert3x3(matrix: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  const invDet = 1 / determinant;
  return [
    (e * i - f * h) * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    (f * g - d * i) * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    (d * h - e * g) * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet
  ];
}

function multiplyMatrixVector(matrix: number[], vector: [number, number, number] | number[]): [number, number, number] {
  return [
    matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
    matrix[3] * vector[0] + matrix[4] * vector[1] + matrix[5] * vector[2],
    matrix[6] * vector[0] + matrix[7] * vector[1] + matrix[8] * vector[2]
  ];
}

function multiplyMatrices(left: number[], right: number[]): number[] {
  return [
    left[0] * right[0] + left[1] * right[3] + left[2] * right[6],
    left[0] * right[1] + left[1] * right[4] + left[2] * right[7],
    left[0] * right[2] + left[1] * right[5] + left[2] * right[8],
    left[3] * right[0] + left[4] * right[3] + left[5] * right[6],
    left[3] * right[1] + left[4] * right[4] + left[5] * right[7],
    left[3] * right[2] + left[4] * right[5] + left[5] * right[8],
    left[6] * right[0] + left[7] * right[3] + left[8] * right[6],
    left[6] * right[1] + left[7] * right[4] + left[8] * right[7],
    left[6] * right[2] + left[7] * right[5] + left[8] * right[8]
  ];
}

// Apply full managed color pipeline to a pixel

export interface ManagedPipelineOptions {
  sourceTransfer: TransferFunctionType;
  sourcePrimaries: ColorPrimariesType;
  targetTransfer: TransferFunctionType;
  targetPrimaries: ColorPrimariesType;
  workingPrimaries: ColorPrimariesType;
  toneMapping: ToneMappingMode;
  gamutMapping: GamutMappingMode;
  isHdr: boolean;
}

export function applyManagedPipeline(pixel: Pixel, options: ManagedPipelineOptions): Pixel {
  let result = pixel;

  // 1. Decode input transfer to linear
  result = decodeTransfer(result, options.sourceTransfer);

  // 2. Convert source primaries to working primaries (if different)
  if (options.sourcePrimaries !== options.workingPrimaries) {
    const srcP = PRIMARIES[options.sourcePrimaries] ?? PRIMARIES.rec709;
    const wkP = PRIMARIES[options.workingPrimaries] ?? PRIMARIES.rec709;
    result = compressGamut(result, srcP, wkP);
  }

  // 3. Apply creative grade (done by caller via evaluateNodeGraph)

  // 4. Convert working primaries to target primaries
  if (options.workingPrimaries !== options.targetPrimaries) {
    const wkP = PRIMARIES[options.workingPrimaries] ?? PRIMARIES.rec709;
    const tgtP = PRIMARIES[options.targetPrimaries] ?? PRIMARIES.rec709;
    result = compressGamut(result, wkP, tgtP);
  }

  // 5. Apply tone mapping
  if (options.isHdr && options.toneMapping === "sdr") {
    result = toneMapSdr(result, true);
  }

  // 6. Encode output transfer
  result = encodeTransfer(result, options.targetTransfer);

  return result;
}

// Resolve effective color space from settings and source info

export function resolveEffectiveInputTransform(settings: ColorManagementSettings, sourceInfo: SourceColorInfo): { transfer: TransferFunctionType; primaries: ColorPrimariesType } {
  const inputTransform = settings.inputTransform;
  const sourceProfile = settings.inputColorSpace === "auto"
    ? sourceInfo.detectedProfile
    : settings.inputColorSpace;

  const transfer = inputTransform === "auto"
    ? COLORSPACES[sourceProfile]?.transfer ?? "bt1886"
    : (COLORSPACES[inputTransform as ColorSpace]?.transfer ?? "bt1886");

  const primaries = COLORSPACES[sourceProfile]?.primaries ?? "rec709";

  return { transfer, primaries };
}

export function resolveEffectiveOutputTransform(settings: ColorManagementSettings): TransferFunctionType {
  const outputTransform = settings.outputTransform;
  if (outputTransform === "none") return "bt1886";
  return COLORSPACES[outputTransform as ColorSpace]?.transfer ?? "bt1886";
}

// Delivery conformance and metadata validation

export type DeliveryProfile =
  | "rec709_sdr"
  | "websrgb"
  | "rec2020_hlg"
  | "rec2020_pq"
  | "mezzanine";

export interface DeliveryConformanceCheck {
  profile: DeliveryProfile;
  label: string;
  primaries: ColorPrimariesType;
  transfer: TransferFunctionType;
  range: ColorRange;
  peakLuminance?: number;
  isHdr: boolean;
  codecRequirements: string[];
  containerRequirements: string[];
}

export const DELIVERY_PROFILES: Record<DeliveryProfile, DeliveryConformanceCheck> = {
  rec709_sdr: {
    profile: "rec709_sdr",
    label: "Rec.709 SDR",
    primaries: "rec709",
    transfer: "bt1886",
    range: { type: "limited" },
    isHdr: false,
    codecRequirements: ["h264", "hevc", "prores"],
    containerRequirements: ["mp4", "mov"]
  },
  websrgb: {
    profile: "websrgb",
    label: "Web sRGB",
    primaries: "rec709",
    transfer: "srgb",
    range: { type: "full" },
    isHdr: false,
    codecRequirements: ["h264", "vp9"],
    containerRequirements: ["mp4", "webm"]
  },
  rec2020_hlg: {
    profile: "rec2020_hlg",
    label: "Rec.2020 HLG",
    primaries: "rec2020",
    transfer: "hlg",
    range: { type: "limited" },
    peakLuminance: 1000,
    isHdr: true,
    codecRequirements: ["h264", "hevc"],
    containerRequirements: ["mp4", "mov"]
  },
  rec2020_pq: {
    profile: "rec2020_pq",
    label: "Rec.2020 PQ",
    primaries: "rec2020",
    transfer: "pq",
    range: { type: "limited" },
    peakLuminance: 1000,
    isHdr: true,
    codecRequirements: ["hevc"],
    containerRequirements: ["mp4", "mov"]
  },
  mezzanine: {
    profile: "mezzanine",
    label: "Archival Mezzanine",
    primaries: "rec2020",
    transfer: "linear",
    range: { type: "full" },
    isHdr: false,
    codecRequirements: ["prores"],
    containerRequirements: ["mov"]
  }
};

export interface ExportedFileMetadata {
  width: number;
  height: number;
  codec: string;
  container: string;
  colorPrimaries: string;
  colorTransfer: string;
  colorSpace: string;
  range: ColorRange;
  bitDepth: number;
  hasAudio: boolean;
  frameCount?: number;
  fps: number;
  durationSeconds: number;
}

export interface ConformanceValidationResult {
  isCompliant: boolean;
  matchedFields: string[];
  mismatchedFields: { field: string; expected: string; actual: string }[];
  warnings: string[];
  errors: string[];
}

export function validateDeliveryConformance(
  exportedMetadata: ExportedFileMetadata,
  deliveryProfile: DeliveryProfile
): ConformanceValidationResult {
  const profile = DELIVERY_PROFILES[deliveryProfile];
  const mismatchedFields: { field: string; expected: string; actual: string }[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check codec compatibility
  if (!profile.codecRequirements.includes(exportedMetadata.codec)) {
    errors.push(
      `Codec '${exportedMetadata.codec}' is not supported for ${profile.label}. ` +
      `Supported: ${profile.codecRequirements.join(", ")}`
    );
  }

  // Check container compatibility
  if (!profile.containerRequirements.includes(exportedMetadata.container)) {
    warnings.push(
      `Container '${exportedMetadata.container}' may not fully support ${profile.label} metadata. ` +
      `Recommended: ${profile.containerRequirements.join(", ")}`
    );
  }

  // Check primaries
  if (exportedMetadata.colorPrimaries !== profile.primaries) {
    if (exportedMetadata.colorPrimaries === "unknown" || exportedMetadata.colorPrimaries === "") {
      warnings.push(`Color primaries not detected in export - expected ${profile.primaries}`);
    } else {
      mismatchedFields.push({
        field: "color_primaries",
        expected: profile.primaries,
        actual: exportedMetadata.colorPrimaries
      });
    }
  }

  // Check transfer function
  if (exportedMetadata.colorTransfer !== profile.transfer) {
    if (exportedMetadata.colorTransfer === "unknown" || exportedMetadata.colorTransfer === "") {
      warnings.push(`Color transfer not detected in export - expected ${profile.transfer}`);
    } else {
      mismatchedFields.push({
        field: "color_transfer",
        expected: profile.transfer,
        actual: exportedMetadata.colorTransfer
      });
    }
  }

  // Check range
  if (exportedMetadata.range.type !== profile.range.type) {
    warnings.push(
      `Color range '${exportedMetadata.range.type}' differs from expected '${profile.range.type}' for ${profile.label}`
    );
  }

  return {
    isCompliant: errors.length === 0 && mismatchedFields.length === 0,
    matchedFields: ["codec", "container", "primaries", "transfer", "range"].filter(f => {
      if (f === "codec") return profile.codecRequirements.includes(exportedMetadata.codec);
      if (f === "container") return profile.containerRequirements.includes(exportedMetadata.container);
      return true;
    }),
    mismatchedFields,
    warnings,
    errors
  };
}

// Build export summary describing color management decisions
export interface ExportColorSummary {
  sourceProfile: string;
  workingSpace: string;
  displayRendering: string;
  outputTransform: string;
  deliveryProfile: string;
  activeTechnicalLuts: string[];
  activeCreativeLuts: string[];
  toneMappingApplied: boolean;
  gamutMappingApplied: boolean;
  pipelineWarnings: string[];
}

export function buildExportColorSummary(
  sourceProfile: string,
  workingProfile: string,
  displayProfile: string,
  deliveryProfile: string,
  technicalLuts: string[],
  creativeLuts: string[],
  toneMappingMode: ToneMappingMode,
  gamutMappingMode: GamutMappingMode,
  pipelineWarnings: string[]
): ExportColorSummary {
  return {
    sourceProfile,
    workingSpace: workingProfile,
    displayRendering: displayProfile,
    outputTransform: deliveryProfile,
    deliveryProfile,
    activeTechnicalLuts: technicalLuts,
    activeCreativeLuts: creativeLuts,
    toneMappingApplied: toneMappingMode !== "none",
    gamutMappingApplied: gamutMappingMode !== "none",
    pipelineWarnings
  };
}

// FFmpeg color metadata tag mapping
export const FFMPEG_COLOR_TAGS: Record<string, string> = {
  "bt709": "color_primaries=bt709",
  "rec709": "color_primaries=bt709",
  "bt2020": "color_primaries=bt2020nc",
  "rec2020": "color_primaries=bt2020nc",
  "p3": "color_primaries=displayp3",
  "bt1886": "color_transfer=bt1886",
  "srgb": "color_transfer=ieee61966-2-1",
  "hlg": "color_transfer=bt2020hlg",
  "pq": "color_transfer=bt2020pq",
  "linear": "color_transfer=linear",
  "limited": "color_range=limited",
  "full": "color_range=full"
};

export function buildFFmpegColorArgs(
  deliveryProfile: DeliveryProfile
): string[] {
  const profile = DELIVERY_PROFILES[deliveryProfile];
  const args: string[] = [];

  if (profile.primaries !== "rec709") {
    args.push("-colorspace", FFMPEG_COLOR_TAGS[profile.primaries] ?? `primaries=${profile.primaries}`);
  }
  if (profile.transfer !== "bt1886") {
    args.push("-color_trc", FFMPEG_COLOR_TAGS[profile.transfer] ?? `transfer=${profile.transfer}`);
  }
  if (profile.primaries !== "rec709") {
    args.push("-color_primaries", FFMPEG_COLOR_TAGS[profile.primaries] ?? `primaries=${profile.primaries}`);
  }
  args.push("-color_range", profile.range.type);

  return args;
}
