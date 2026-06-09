import type { MediaRef } from "./ipc.js";
import { clampDisplaySize } from "./mediaGeometry.js";
import type { ExportPreset, ExportResizePolicy, ProjectExportSettings } from "./project.js";

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

export function validateExportGeometry(settings: ProjectExportSettings, media: MediaRef): string[] {
  const issues: string[] = [];

  if (settings.sizeMode === "custom") {
    const w = settings.customWidth;
    const h = settings.customHeight;
    if (w === undefined || w < 1 || w > 7680) {
      issues.push("Custom width must be between 1 and 7680.");
    }
    if (h === undefined || h < 1 || h > 4320) {
      issues.push("Custom height must be between 1 and 4320.");
    }
    if (issues.length === 0 && settings.resizePolicy === "pad") {
      const aspectDiff = Math.abs((w! / h!) - (media.displayWidth / media.displayHeight));
      if (aspectDiff > 0.1) {
        issues.push("Pad resize policy requires custom dimensions with a similar aspect ratio to the source.");
      }
    }
  }

  return issues;
}

export function planExportGeometry(media: MediaRef): { width: number; height: number } {
  const { width: displayWidth, height: displayHeight } = clampDisplaySize(media.displayWidth, media.displayHeight);
  return { width: displayWidth, height: displayHeight };
}

export function computeExportGeometry(settings: ProjectExportSettings, media: MediaRef): { width: number; height: number } {
  const sourceWidth = media.displayWidth;
  const sourceHeight = media.displayHeight;

  if (settings.sizeMode === "source") {
    return planExportGeometry(media);
  }

  if (settings.sizeMode === "preset" && settings.preset) {
    const preset = PRESET_DIMENSIONS[settings.preset];
    if (preset) {
      return applyResizePolicy(settings.resizePolicy, preset.width, preset.height, sourceWidth, sourceHeight);
    }
  }

  if (settings.sizeMode === "custom" && settings.customWidth && settings.customHeight) {
    return applyResizePolicy(settings.resizePolicy, settings.customWidth, settings.customHeight, sourceWidth, sourceHeight);
  }

  return planExportGeometry(media);
}

function applyResizePolicy(
  policy: ExportResizePolicy,
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number
): { width: number; height: number } {
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  if (policy === "fit") {
    if (sourceAspect > targetAspect) {
      return { width: targetWidth, height: Math.round(targetWidth / sourceAspect) };
    }
    return { width: Math.round(targetHeight * sourceAspect), height: targetHeight };
  }

  if (policy === "crop") {
    return { width: targetWidth, height: targetHeight };
  }

  return { width: targetWidth, height: targetHeight };
}
