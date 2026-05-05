/**
 * Color Pipeline - Public Contract
 *
 * This module defines the shared color rendering pipeline that both
 * WebGL preview (FrameRenderer) and CPU export (exportProject) use.
 *
 * It centralizes color management decisions so that:
 * - FrameRenderer no longer reconstructs pipeline decisions locally
 * - exportProject no longer owns low-level color management
 * - Both preview and export produce consistent results
 */

import type {
  ColorManagementSettings,
  ColorMetadata,
  ColorNode,
  ColorPrimariesType,
  GamutMappingMode,
  Pixel,
  ToneMappingMode,
  TransferFunctionType
} from "./colorEngine.js";

import {
  COLORSPACES,
  PRIMARIES,
  decodeTransfer,
  encodeTransfer,
  toneMapSdr,
  compressGamut,
  evaluateNodeGraph,
  normalizeNodeGraph,
  resolveTrackedNode,
  buildPrimariesConversionMatrixByType,
  generateColorFragmentShader
} from "./colorEngine.js";

// Re-export for convenience
export {
  normalizeNodeGraph,
  resolveTrackedNode,
  generateColorFragmentShader
} from "./colorEngine.js";

/**
 * Resolved pipeline settings computed from color management and source metadata.
 * This is the single source of truth for color pipeline configuration.
 */
export interface ResolvedPipeline {
  /** Source transfer function for decoding */
  sourceTransfer: TransferFunctionType;
  /** Target transfer function for encoding */
  targetTransfer: TransferFunctionType;
  /** Whether source is HDR (HLG, PQ, or Apple Log) */
  sourceIsHdr: boolean;
  /** Source color primaries */
  sourcePrimaries: ColorPrimariesType;
  /** Working color primaries (typically same as target for SDR) */
  workingPrimaries: ColorPrimariesType;
  /** Target color primaries for output */
  targetPrimaries: ColorPrimariesType;
  /** Tone mapping mode */
  toneMapping: ToneMappingMode;
  /** Gamut mapping mode */
  gamutMapping: GamutMappingMode;
  /** Source to working primaries conversion matrix rows for GLSL */
  sourceToWorkingMatrix: number[];
  /** Whether gamut conversion is needed */
  needsGamutConversion: boolean;
}

/**
 * Input for resolving pipeline settings.
 */
export interface PipelineInput {
  colorManagement: ColorManagementSettings | undefined;
  metadata: ColorMetadata | undefined;
}

/**
 * Resolve all pipeline settings from color management and source metadata.
 * This is the central place where color pipeline decisions are made.
 */
export function resolvePipeline(input: PipelineInput): ResolvedPipeline {
  const { colorManagement, metadata } = input;

  const sourceTransfer = metadata?.transfer.type ?? "bt1886";
  const sourcePrimaries = metadata?.primaries.type ?? "rec709";
  const sourceIsHdr = sourceTransfer === "hlg" || sourceTransfer === "pq" || sourceTransfer === "appleLog";

  const targetTransfer = colorManagement?.outputTransform && colorManagement.outputTransform !== "none"
    ? (COLORSPACES[colorManagement.outputTransform as keyof typeof COLORSPACES]?.transfer ?? "bt1886")
    : "bt1886";

  const workingPrimaries = colorManagement?.workingColorSpace
    ? (COLORSPACES[colorManagement.workingColorSpace as keyof typeof COLORSPACES]?.primaries ?? "rec709")
    : "rec709";

  // For SDR output, target primaries typically match working primaries
  // For HDR output (PQ/HLG), target primaries match the output color space primaries
  const targetPrimaries = colorManagement?.outputTransform && colorManagement.outputTransform !== "none"
    ? (COLORSPACES[colorManagement.outputTransform as keyof typeof COLORSPACES]?.primaries ?? workingPrimaries)
    : workingPrimaries;

  const toneMapping = colorManagement?.toneMapping ?? "sdr";
  const gamutMapping = colorManagement?.gamutMapping ?? "clip";

  const sourceToWorkingMatrix = buildPrimariesConversionMatrixByType(sourcePrimaries, workingPrimaries);
  const needsGamutConversion = sourcePrimaries !== workingPrimaries;

  return {
    sourceTransfer,
    targetTransfer,
    sourceIsHdr,
    sourcePrimaries,
    workingPrimaries,
    targetPrimaries,
    toneMapping,
    gamutMapping,
    sourceToWorkingMatrix,
    needsGamutConversion
  };
}

/**
 * Resolve pipeline and apply to a single pixel (CPU path).
 * This is used by exportProject.renderRgbaFrame.
 */
export function applyPipelinePixel(
  pixel: Pixel,
  nodes: readonly ColorNode[],
  pipeline: ResolvedPipeline,
  normalizedPoint: { x: number; y: number },
  frameIndex: number = 0
): Pixel {
  let result = pixel;

  // 1. Decode input transfer to linear
  if (pipeline.sourceTransfer !== "linear") {
    result = { ...decodeTransfer(result, pipeline.sourceTransfer), a: result.a };
  }

  // 2. Convert source primaries to working primaries
  if (pipeline.needsGamutConversion) {
    const srcP = PRIMARIES[pipeline.sourcePrimaries] ?? PRIMARIES.rec709;
    const wkP = PRIMARIES[pipeline.workingPrimaries] ?? PRIMARIES.rec709;
    result = { ...compressGamut(result, srcP, wkP), a: result.a };
  }

  // 3. Apply creative grade
  const resolvedNodes = normalizeNodeGraph(nodes).map((node) => resolveTrackedNode(node, frameIndex));
  const graded = evaluateNodeGraph(result, resolvedNodes, normalizedPoint);
  result = { ...graded, a: result.a };

  // 4. Convert working primaries to target primaries
  if (pipeline.workingPrimaries !== pipeline.targetPrimaries) {
    const wkP = PRIMARIES[pipeline.workingPrimaries] ?? PRIMARIES.rec709;
    const tgtP = PRIMARIES[pipeline.targetPrimaries] ?? PRIMARIES.rec709;
    result = { ...compressGamut(result, wkP, tgtP), a: result.a };
  }

  // 5. Apply tone mapping
  if (pipeline.sourceIsHdr && pipeline.toneMapping === "sdr") {
    result = { ...toneMapSdr(result, true), a: result.a };
  }

  // 6. Encode output transfer
  if (pipeline.targetTransfer !== "linear") {
    result = { ...encodeTransfer(result, pipeline.targetTransfer), a: result.a };
  }

  return result;
}

/**
 * Apply full color pipeline to a buffer of RGBA pixels (CPU path for export).
 * Returns a new buffer with graded pixels.
 */
export function applyPipelineBuffer(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  nodes: readonly ColorNode[],
  pipeline: ResolvedPipeline,
  frameIndex: number = 0
): Buffer {
  const output = Buffer.allocUnsafe(source.length);

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const offset = (y * sourceWidth + x) * 4;
      const pixel: Pixel = {
        r: source[offset] / 255,
        g: source[offset + 1] / 255,
        b: source[offset + 2] / 255,
        a: source[offset + 3] / 255
      };

      const graded = applyPipelinePixel(pixel, nodes, pipeline, {
        x: (x + 0.5) / sourceWidth,
        y: (y + 0.5) / sourceHeight
      }, frameIndex);

      output[offset] = floatToByte(graded.r);
      output[offset + 1] = floatToByte(graded.g);
      output[offset + 2] = floatToByte(graded.b);
      output[offset + 3] = floatToByte(graded.a ?? pixel.a ?? 255);
    }
  }

  return output;
}

/**
 * Get the transfer function enum value for GLSL shader uniforms.
 */
export function getTransferUniformValue(transfer: TransferFunctionType): number {
  const map: Record<TransferFunctionType, number> = {
    bt1886: 0,
    srgb: 1,
    linear: 2,
    hlg: 3,
    pq: 4,
    appleLog: 5,
    log25: 0,
    unknown: 0
  };
  return map[transfer] ?? 0;
}

/**
 * Get the tone mapping uniform value for GLSL shader uniforms.
 */
export function getToneMappingUniformValue(mode: ToneMappingMode): number {
  const map: Record<ToneMappingMode, number> = {
    none: 0,
    sdr: 1,
    hlg: 2,
    pq: 3
  };
  return map[mode] ?? 0;
}

/**
 * Generate shader source with explicit pipeline settings.
 * FrameRenderer calls this instead of generating its own shader decisions.
 */
export function generatePipelineFragmentShader(
  nodeCount: number,
  _pipeline: ResolvedPipeline
): string {
  void _pipeline;
  // The base shader generation includes all the necessary uniforms
  // The pipeline settings are uploaded as uniforms separately
  return generateColorFragmentShader(nodeCount);
}

function floatToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}