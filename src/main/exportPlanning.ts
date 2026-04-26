import crypto from "node:crypto";
import path from "node:path";
import type { ExportQuality, MediaRef } from "../shared/ipc.js";
import type { ChromaProject, ExportPreset, ExportResizePolicy, ExportSizeMode, ProjectExportSettings } from "../shared/project.js";
import { clampDisplayWidth, clampDisplayHeight } from "../shared/mediaGeometry.js";
import { sanitizeProject } from "../shared/project.js";
import { appError } from "./errors.js";

export interface ExportJobSnapshot {
  id: string;
  project: ChromaProject;
  media: MediaRef;
  outputPath: string;
  tempOutputPath: string;
  quality: ExportQuality;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  startedAt: number;
}

export interface ExportPlanningResult {
  snapshot: ExportJobSnapshot;
  validationIssues: string[];
}

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

export function validateExportRequest(request: {
  project: ChromaProject;
  outputPath?: string;
  overwriteConfirmed?: boolean;
  quality?: ExportQuality;
}): string[] {
  const issues: string[] = [];
  const project = request.project;
  const media = project.media;

  if (!media) {
    issues.push("Export cannot start without imported media.");
    return issues;
  }

  const outputPath = normalizeOutputPath(request.outputPath ?? project.exportSettings.outputPath);
  if (!outputPath) {
    issues.push("Export output path is required.");
    return issues;
  }

  const codec = project.exportSettings.codec;
  const ext = codecContainerExt(codec);
  if (!outputPath.toLowerCase().endsWith(ext)) {
    issues.push(`${codec.toUpperCase()} export must use a${ext.startsWith(".m") ? "n" : ""} ${ext} output path.`);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    issues.push("Export output cannot overwrite the source media.");
  }

  const geometryIssues = validateExportGeometry(project.exportSettings, media);
  issues.push(...geometryIssues);

  return issues;
}

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
  const width = clampDisplayWidth(media.displayWidth);
  const height = clampDisplayHeight(media.displayHeight);
  return { width, height };
}

export function computeExportGeometry(settings: ProjectExportSettings, media: MediaRef): { width: number; height: number } {
  const sourceWidth = media.displayWidth;
  const sourceHeight = media.displayHeight;

  if (settings.sizeMode === "source") {
    return { width: clampDisplayWidth(sourceWidth), height: clampDisplayHeight(sourceHeight) };
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

  return { width: clampDisplayWidth(sourceWidth), height: clampDisplayHeight(sourceHeight) };
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
    const fitsInTarget = sourceAspect <= targetAspect
      ? targetAspect > sourceAspect
      : sourceAspect < targetAspect;
    if (fitsInTarget) {
      return { width: targetWidth, height: targetHeight };
    }
    if (sourceAspect > targetAspect) {
      return { width: targetWidth, height: Math.round(targetWidth / sourceAspect) };
    }
    return { width: Math.round(targetHeight * sourceAspect), height: targetHeight };
  }

  if (policy === "crop") {
    if (sourceAspect > targetAspect) {
      const scaledWidth = Math.round(targetHeight * sourceAspect);
      return { width: scaledWidth, height: targetHeight };
    }
    const scaledHeight = Math.round(targetWidth / sourceAspect);
    return { width: targetWidth, height: scaledHeight };
  }

  return { width: targetWidth, height: targetHeight };
}

export function computeExportFps(media: MediaRef): { fps: number; totalFrames: number } {
  const fps = clampNumber(media.frameRate, 1, 240);
  const totalFrames = Math.max(1, media.totalFrames ?? (Math.round(media.durationSeconds * fps) || 1));
  return { fps, totalFrames };
}

export function createExportJobSnapshot(request: {
  project: ChromaProject;
  outputPath?: string;
  overwriteConfirmed?: boolean;
  quality?: ExportQuality;
}): ExportJobSnapshot {
  const project = sanitizeProject(cloneJson(request.project));
  const media = project.media;
  if (!media) {
    throw appError("EXPORT_FAILED", "Export cannot start without imported media.");
  }

  const outputPath = normalizeOutputPath(request.outputPath ?? project.exportSettings.outputPath);
  if (!outputPath) {
    throw appError("EXPORT_FAILED", "Export output path is required.");
  }

  const codec = project.exportSettings.codec;
  const ext = codecContainerExt(codec);
  if (!outputPath.toLowerCase().endsWith(ext)) {
    throw appError("EXPORT_FAILED", `${codec.toUpperCase()} export must use a${ext.startsWith(".m") ? "n" : ""} ${ext} output path.`, outputPath);
  }

  if (path.resolve(outputPath) === path.resolve(media.sourcePath)) {
    throw appError("EXPORT_FAILED", "Export output cannot overwrite the source media.", outputPath);
  }

  const geometryIssues = validateExportGeometry(project.exportSettings, media);
  if (geometryIssues.length > 0) {
    throw appError("EXPORT_FAILED", `Export geometry validation failed: ${geometryIssues.join("; ")}`);
  }

  const quality = request.quality ?? project.exportSettings.quality ?? "standard";
  const { width, height } = computeExportGeometry(project.exportSettings, media);
  const { fps, totalFrames } = computeExportFps(media);
  const id = `export-${crypto.randomUUID()}`;

  return {
    id,
    project,
    media,
    outputPath,
    tempOutputPath: `${outputPath}.part-${id}${ext}`,
    quality,
    width,
    height,
    fps,
    totalFrames,
    startedAt: Date.now()
  };
}

function codecContainerExt(codec: string): string {
  switch (codec) {
    case "h264":
    case "hevc":
      return ".mp4";
    case "prores":
      return ".mov";
    case "vp9":
      return ".webm";
    default:
      return ".mp4";
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOutputPath(outputPath: string | undefined): string | undefined {
  const trimmed = outputPath?.trim();
  return trimmed ? path.resolve(trimmed) : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
