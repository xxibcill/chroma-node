import { existsSync } from "node:fs";
import { MAX_SUPPORTED_DISPLAY_EDGE, MAX_SUPPORTED_DISPLAY_PIXELS, isSupportedDisplayRaster } from "../shared/mediaGeometry.js";
import type { MediaRef, RelinkMediaResult } from "../shared/ipc.js";
import { appError } from "./errors.js";
import { probeMedia } from "./mediaProbe.js";
const SUPPORTED_CODECS = ["h264", "avc1", "mp4v", "mov"];
const SUPPORTED_CONTAINERS = ["mp4", "mov"];

export async function relinkMedia(originalPath: string, replacementPath: string): Promise<RelinkMediaResult> {
  if (!existsSync(replacementPath)) {
    return {
      ok: false,
      error: appError("FILE_NOT_FOUND", "Replacement media file does not exist.", replacementPath)
    };
  }

  let replacementMedia: MediaRef;
  try {
    replacementMedia = await probeMedia(replacementPath);
  } catch (probeError) {
    const message = probeError instanceof Error ? probeError.message : String(probeError);
    return {
      ok: false,
      error: appError("PROBE_FAILED", "Replacement media could not be probed.", message)
    };
  }

  const validationError = validateMediaCompatibility(replacementMedia, originalPath);
  if (validationError) {
    return {
      ok: false,
      error: validationError
    };
  }

  return {
    ok: true,
    media: replacementMedia
  };
}

function validateMediaCompatibility(media: MediaRef, _originalPath: string): ReturnType<typeof appError> | undefined {
  if (!isSupportedDisplayRaster(media.displayWidth, media.displayHeight)) {
    return appError(
      "UNSUPPORTED_MEDIA",
      `Replacement media exceeds the supported 4K-equivalent display raster (${MAX_SUPPORTED_DISPLAY_EDGE}px max edge, ${MAX_SUPPORTED_DISPLAY_PIXELS} pixels total).`,
      `Got ${media.displayWidth}x${media.displayHeight}.`
    );
  }

  const codecLower = media.codec.toLowerCase();
  const containerLower = media.container.toLowerCase();

  const isSupportedCodec = SUPPORTED_CODECS.some((codec) => codecLower.includes(codec));
  const isSupportedContainer = SUPPORTED_CONTAINERS.some((cont) => containerLower.includes(cont));

  if (!isSupportedCodec && !isSupportedContainer) {
    return appError(
      "UNSUPPORTED_MEDIA",
      "Replacement media codec is not supported by the MVP.",
      `Codec: ${media.codec}, Container: ${media.container}. Supported: H.264 in MP4 or MOV.`
    );
  }

  return undefined;
}
