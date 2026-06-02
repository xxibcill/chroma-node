import {
  COLORSPACES,
  PRIMARIES,
  compressGamut,
  decodeTransfer,
  encodeTransfer,
  evaluateNodeGraph,
  normalizeNodeGraph,
  resolveTrackedNode,
  toneMapSdr,
  type ColorManagementSettings,
  type ColorNode,
  type ColorPrimariesType,
  type TransferFunctionType
} from "../shared/colorEngine.js";

export interface RenderRgbaFrameOptions {
  colorManagement?: ColorManagementSettings;
  sourceTransfer?: TransferFunctionType;
  sourcePrimaries?: ColorPrimariesType;
  isHdr?: boolean;
}

export function renderRgbaFrame(
  source: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  nodes: readonly ColorNode[],
  frameIndex: number,
  options?: RenderRgbaFrameOptions
): Buffer {
  const resolvedNodes = normalizeNodeGraph(nodes).map((node) => resolveTrackedNode(node, frameIndex));
  const colorManagement = options?.colorManagement;
  const sourceTransfer = options?.sourceTransfer ?? "bt1886";
  const sourcePrimaries = options?.sourcePrimaries ?? "rec709";
  const isHdr = options?.isHdr ?? false;

  const output = Buffer.allocUnsafe(source.length);

  const targetTransfer: TransferFunctionType = colorManagement?.outputTransform && colorManagement.outputTransform !== "none"
    ? (COLORSPACES[colorManagement.outputTransform as keyof typeof COLORSPACES]?.transfer ?? "bt1886")
    : "bt1886";

  const workingPrimaries: ColorPrimariesType = colorManagement?.workingColorSpace
    ? (COLORSPACES[colorManagement.workingColorSpace as keyof typeof COLORSPACES]?.primaries ?? "rec709")
    : "rec709";

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const offset = (y * sourceWidth + x) * 4;
      let pixel: { r: number; g: number; b: number; a: number } = {
        r: source[offset] / 255,
        g: source[offset + 1] / 255,
        b: source[offset + 2] / 255,
        a: source[offset + 3] / 255
      };

      if (sourceTransfer !== "linear") {
        pixel = { ...decodeTransfer(pixel, sourceTransfer), a: pixel.a };
      }

      const graded = evaluateNodeGraph(pixel, resolvedNodes, {
        x: (x + 0.5) / sourceWidth,
        y: (y + 0.5) / sourceHeight
      });

      if (sourcePrimaries !== workingPrimaries) {
        const srcP = PRIMARIES[sourcePrimaries] ?? PRIMARIES.rec709;
        const wkP = PRIMARIES[workingPrimaries] ?? PRIMARIES.rec709;
        pixel = { ...compressGamut(graded, srcP, wkP), a: graded.a ?? pixel.a };
      } else {
        pixel = { ...graded, a: graded.a ?? pixel.a };
      }

      if (isHdr && colorManagement?.toneMapping === "sdr") {
        pixel = { ...toneMapSdr(pixel, true), a: pixel.a };
      }

      pixel = { ...encodeTransfer(pixel, targetTransfer), a: pixel.a };

      output[offset] = floatToByte(pixel.r);
      output[offset + 1] = floatToByte(pixel.g);
      output[offset + 2] = floatToByte(pixel.b);
      output[offset + 3] = floatToByte(pixel.a);
    }
  }

  return output;
}

function floatToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}
