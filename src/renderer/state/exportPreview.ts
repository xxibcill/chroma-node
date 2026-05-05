import type { ExportPreset, ExportResizePolicy, ExportSizeMode } from "../../shared/project";
import type { MediaRef } from "../../shared/ipc";

export const PRESET_DIMENSIONS: Record<ExportPreset, { width: number; height: number }> = {
  "1080p": { width: 1920, height: 1080 },
  "720p": { width: 1280, height: 720 },
  "480p": { width: 854, height: 480 },
  "square-1:1": { width: 1080, height: 1080 },
  "square-4:5": { width: 1080, height: 1350 },
  "portrait-9:16": { width: 1080, height: 1920 },
  "portrait-4:5": { width: 1080, height: 1350 },
  "portrait-3:4": { width: 1080, height: 1440 }
} as const;

export const EXPORT_PRESET_LABELS: Record<ExportPreset, string> = {
  "1080p": "1080p (1920x1080)",
  "720p": "720p (1280x720)",
  "480p": "480p (854x480)",
  "square-1:1": "Square 1:1 (1080x1080)",
  "square-4:5": "Square 4:5 (1080x1350)",
  "portrait-9:16": "Portrait 9:16 (1080x1920)",
  "portrait-4:5": "Portrait 4:5 (1080x1350)",
  "portrait-3:4": "Portrait 3:4 (1080x1440)"
} as const;

export function computeExportPreview(
  sizeMode: ExportSizeMode,
  preset: ExportPreset | undefined,
  customWidth: number | undefined,
  customHeight: number | undefined,
  resizePolicy: ExportResizePolicy,
  media: MediaRef
): { width: number; height: number; aspectChanged: boolean } {
  const sourceWidth = media.displayWidth;
  const sourceHeight = media.displayHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let targetWidth: number;
  let targetHeight: number;

  if (sizeMode === "source") {
    return { width: sourceWidth, height: sourceHeight, aspectChanged: false };
  }

  if (sizeMode === "preset" && preset) {
    const dims = PRESET_DIMENSIONS[preset];
    targetWidth = dims.width;
    targetHeight = dims.height;
  } else if (sizeMode === "custom" && customWidth && customHeight) {
    targetWidth = customWidth;
    targetHeight = customHeight;
  } else {
    return { width: sourceWidth, height: sourceHeight, aspectChanged: false };
  }

  const targetAspect = targetWidth / targetHeight;
  const aspectChanged = Math.abs(targetAspect - sourceAspect) > 0.01;

  if (resizePolicy === "fit") {
    if (sourceAspect > targetAspect) {
      targetHeight = Math.round(targetWidth / sourceAspect);
    } else {
      targetWidth = Math.round(targetHeight * sourceAspect);
    }
  } else if (resizePolicy === "crop") {
    if (sourceAspect > targetAspect) {
      targetWidth = Math.round(targetHeight * sourceAspect);
    } else {
      targetHeight = Math.round(targetWidth / sourceAspect);
    }
  }

  return { width: targetWidth, height: targetHeight, aspectChanged };
}
