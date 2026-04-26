import type { ExportQuality, MediaRef } from "./ipc.js";
import { isRotated } from "./mediaGeometry.js";
import {
  MAX_SERIAL_NODES,
  createColorNode,
  normalizeNodeGraph,
  sanitizeColorNode,
  type ColorNode
} from "./colorEngine.js";

export const PROJECT_SCHEMA_VERSION = "1.0.0";

export type ViewerMode = "original" | "graded" | "split";

export interface ProjectPlaybackState {
  currentFrame: number;
  viewerMode: ViewerMode;
  splitPosition: number;
}

export type ExportSizeMode = "source" | "preset" | "custom";
export type ExportPreset = "1080p" | "720p" | "480p" | "square-1:1" | "square-4:5" | "portrait-9:16" | "portrait-4:5" | "portrait-3:4";
export type ExportResizePolicy = "fit" | "crop" | "pad";

export interface ProjectExportSettings {
  codec: "h264";
  outputPath?: string;
  quality: ExportQuality;
  sizeMode: ExportSizeMode;
  preset?: ExportPreset;
  customWidth?: number;
  customHeight?: number;
  resizePolicy: ExportResizePolicy;
}

export interface ChromaProject {
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  projectId: string;
  name: string;
  media?: MediaRef;
  playback: ProjectPlaybackState;
  nodes: ColorNode[];
  exportSettings: ProjectExportSettings;
}

export interface ProjectValidationIssue {
  path: string;
  code: "INVALID_TYPE" | "UNSUPPORTED_VERSION" | "CLAMPED" | "DEFAULTED" | "TRUNCATED";
  message: string;
  received?: unknown;
}

export type ProjectValidationResult =
  | { ok: true; project: ChromaProject; warnings: ProjectValidationIssue[] }
  | { ok: false; errors: ProjectValidationIssue[] };

const DEFAULT_PROJECT_NAME = "Untitled Grade";

export function createDefaultProject(): ChromaProject {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    projectId: createProjectId(),
    name: DEFAULT_PROJECT_NAME,
    playback: {
      currentFrame: 0,
      viewerMode: "graded",
      splitPosition: 0.5
    },
    nodes: [createColorNode(1)],
    exportSettings: {
      codec: "h264",
      quality: "standard",
      sizeMode: "source",
      resizePolicy: "fit"
    }
  };
}

export function validateProject(input: unknown): ProjectValidationResult {
  const migrated = migrateProject(input);
  if (!migrated.ok) {
    return migrated;
  }

  const errors: ProjectValidationIssue[] = [];
  const warnings: ProjectValidationIssue[] = [];
  const source = migrated.value;

  if (!isRecord(source)) {
    return {
      ok: false,
      errors: [issue("", "INVALID_TYPE", "Project file must contain a JSON object.", source)]
    };
  }

  const projectId = readString(source.projectId, "projectId", createProjectId(), warnings);
  const name = readString(source.name, "name", DEFAULT_PROJECT_NAME, warnings).slice(0, 80);
  const playback = readPlayback(source.playback, warnings);
  const exportSettings = readExportSettings(source.exportSettings, warnings);
  const media = readMedia(source.media, errors, warnings);
  const nodes = readNodes(source.nodes, warnings, media?.totalFrames);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    warnings,
    project: {
      schemaVersion: PROJECT_SCHEMA_VERSION,
      projectId,
      name,
      media,
      playback,
      nodes,
      exportSettings
    }
  };
}

export function sanitizeProject(input: unknown): ChromaProject {
  const validation = validateProject(input);

  if (!validation.ok) {
    return createDefaultProject();
  }

  return validation.project;
}

export function serializeProject(project: ChromaProject): string {
  const validation = validateProject(project);

  if (!validation.ok) {
    throw new Error(validation.errors.map((error) => error.message).join("\n"));
  }

  return `${JSON.stringify(validation.project, null, 2)}\n`;
}

function migrateProject(input: unknown): { ok: true; value: unknown } | { ok: false; errors: ProjectValidationIssue[] } {
  if (!isRecord(input)) {
    return { ok: true, value: input };
  }

  const version = input.schemaVersion;
  if (version === PROJECT_SCHEMA_VERSION) {
    return { ok: true, value: input };
  }

  if (version === undefined) {
    return {
      ok: false,
      errors: [issue("schemaVersion", "INVALID_TYPE", "Project schemaVersion is required.", version)]
    };
  }

  return {
    ok: false,
    errors: [issue("schemaVersion", "UNSUPPORTED_VERSION", `Unsupported project schema version: ${String(version)}.`, version)]
  };
}

function readPlayback(input: unknown, warnings: ProjectValidationIssue[]): ProjectPlaybackState {
  const source = isRecord(input) ? input : {};
  if (!isRecord(input)) {
    warnings.push(issue("playback", "DEFAULTED", "Playback state was missing or invalid; defaults were used.", input));
  }

  const viewerMode = source.viewerMode === "original" || source.viewerMode === "graded" || source.viewerMode === "split"
    ? source.viewerMode
    : "graded";

  if (source.viewerMode !== undefined && viewerMode !== source.viewerMode) {
    warnings.push(issue("playback.viewerMode", "DEFAULTED", "Invalid viewer mode; graded mode was used.", source.viewerMode));
  }

  return {
    currentFrame: clampInteger(readNumber(source.currentFrame, "playback.currentFrame", 0, warnings), 0, Number.MAX_SAFE_INTEGER),
    viewerMode,
    splitPosition: clampNumber(readNumber(source.splitPosition, "playback.splitPosition", 0.5, warnings), 0, 1, "playback.splitPosition", warnings)
  };
}

function readNodes(input: unknown, warnings: ProjectValidationIssue[], frameCount?: number): ColorNode[] {
  if (!Array.isArray(input) || input.length === 0) {
    warnings.push(issue("nodes", "DEFAULTED", "Project must contain at least one node; a neutral node was added.", input));
    return [createColorNode(1)];
  }

  if (input.length > MAX_SERIAL_NODES) {
    warnings.push(issue("nodes", "TRUNCATED", `Node graph was limited to ${MAX_SERIAL_NODES} serial nodes.`, input.length));
  }

  return normalizeNodeGraph(input.slice(0, MAX_SERIAL_NODES).map((node, index) => {
    if (!isRecord(node)) {
      warnings.push(issue(`nodes.${index}`, "DEFAULTED", "Invalid node was replaced with a neutral node.", node));
      return createColorNode(index + 1);
    }

    const sanitized = sanitizeColorNode(node, index + 1, frameCount);
    collectNodeClampWarnings(node, sanitized, index, warnings);
    return sanitized;
  }));
}

function readExportSettings(input: unknown, warnings: ProjectValidationIssue[]): ProjectExportSettings {
  const source = isRecord(input) ? input : {};
  if (!isRecord(input)) {
    warnings.push(issue("exportSettings", "DEFAULTED", "Export settings were missing or invalid; defaults were used.", input));
  }

  return {
    codec: "h264",
    outputPath: typeof source.outputPath === "string" && source.outputPath.trim() ? source.outputPath : undefined,
    quality: readExportQuality(source.quality, warnings),
    sizeMode: readExportSizeMode(source.sizeMode, warnings),
    preset: readExportPreset(source.preset, warnings),
    customWidth: readExportCustomDimension(source.customWidth, "customWidth", warnings),
    customHeight: readExportCustomDimension(source.customHeight, "customHeight", warnings),
    resizePolicy: readExportResizePolicy(source.resizePolicy, warnings)
  };
}

function readExportSizeMode(input: unknown, warnings: ProjectValidationIssue[]): ExportSizeMode {
  if (input === "source" || input === "preset" || input === "custom") {
    return input;
  }

  if (input !== undefined) {
    warnings.push(issue("exportSettings.sizeMode", "DEFAULTED", "Invalid export size mode; source size was used.", input));
  }

  return "source";
}

function readExportPreset(input: unknown, warnings: ProjectValidationIssue[]): ExportPreset | undefined {
  const validPresets: ExportPreset[] = ["1080p", "720p", "480p", "square-1:1", "square-4:5", "portrait-9:16", "portrait-4:5", "portrait-3:4"];
  if (typeof input === "string" && validPresets.includes(input as ExportPreset)) {
    return input as ExportPreset;
  }

  if (input !== undefined) {
    warnings.push(issue("exportSettings.preset", "DEFAULTED", "Invalid export preset; no preset was used.", input));
  }

  return undefined;
}

function readExportCustomDimension(input: unknown, path: string, warnings: ProjectValidationIssue[]): number | undefined {
  if (typeof input === "number" && Number.isFinite(input) && input > 0 && input <= 7680) {
    return Math.round(input);
  }

  if (input !== undefined) {
    warnings.push(issue(`exportSettings.${path}`, "DEFAULTED", `Invalid ${path}; no value was used.`, input));
  }

  return undefined;
}

function readExportResizePolicy(input: unknown, warnings: ProjectValidationIssue[]): ExportResizePolicy {
  if (input === "fit" || input === "crop" || input === "pad") {
    return input;
  }

  if (input !== undefined) {
    warnings.push(issue("exportSettings.resizePolicy", "DEFAULTED", "Invalid export resize policy; fit was used.", input));
  }

  return "fit";
}

function readExportQuality(input: unknown, warnings: ProjectValidationIssue[]): ExportQuality {
  if (input === "draft" || input === "standard" || input === "high") {
    return input;
  }

  if (input !== undefined) {
    warnings.push(issue("exportSettings.quality", "DEFAULTED", "Invalid export quality; standard quality was used.", input));
  }

  return "standard";
}

function readMedia(
  input: unknown,
  errors: ProjectValidationIssue[],
  warnings: ProjectValidationIssue[]
): MediaRef | undefined {
  if (input === undefined) {
    return undefined;
  }

  if (!isRecord(input)) {
    errors.push(issue("media", "INVALID_TYPE", "Media reference must be an object.", input));
    return undefined;
  }

  const sourcePath = readString(input.sourcePath, "media.sourcePath", "", warnings);
  if (!sourcePath) {
    errors.push(issue("media.sourcePath", "INVALID_TYPE", "Media sourcePath is required when media is present.", input.sourcePath));
  }

  const rawWidth = clampInteger(readNumber(input.width, "media.width", 0, warnings), 0, 7680);
  const rawHeight = clampInteger(readNumber(input.height, "media.height", 0, warnings), 0, 4320);
  const rawDisplayWidth = clampInteger(readNumber(input.displayWidth, "media.displayWidth", 0, warnings), 0, 7680);
  const rawDisplayHeight = clampInteger(readNumber(input.displayHeight, "media.displayHeight", 0, warnings), 0, 4320);
  const rotation = clampInteger(readNumber(input.rotation, "media.rotation", 0, warnings), -360, 360);

  // Legacy project migration: compute display dimensions from rotation
  const displayWidth = rawDisplayWidth > 0 ? rawDisplayWidth : isRotated(rotation) ? rawHeight : rawWidth;
  const displayHeight = rawDisplayHeight > 0 ? rawDisplayHeight : isRotated(rotation) ? rawWidth : rawHeight;

  return {
    id: readString(input.id, "media.id", sourcePath || "missing-media", warnings),
    sourcePath,
    fileName: readString(input.fileName, "media.fileName", sourcePath.split(/[\\/]/).pop() || "Unknown", warnings),
    container: readString(input.container, "media.container", "unknown", warnings),
    codec: readString(input.codec, "media.codec", "unknown", warnings),
    width: rawWidth,
    height: rawHeight,
    displayWidth,
    displayHeight,
    durationSeconds: clampNumber(readNumber(input.durationSeconds, "media.durationSeconds", 0, warnings), 0, Number.MAX_SAFE_INTEGER, "media.durationSeconds", warnings),
    frameRate: clampNumber(readNumber(input.frameRate, "media.frameRate", 24, warnings), 1, 240, "media.frameRate", warnings),
    totalFrames: input.totalFrames === undefined ? undefined : clampInteger(readNumber(input.totalFrames, "media.totalFrames", 0, warnings), 0, Number.MAX_SAFE_INTEGER),
    hasAudio: typeof input.hasAudio === "boolean" ? input.hasAudio : false,
    rotation,
    videoStreamIndex: clampInteger(readNumber(input.videoStreamIndex, "media.videoStreamIndex", 0, warnings), 0, Number.MAX_SAFE_INTEGER)
  };
}

function collectNodeClampWarnings(
  original: Record<string, unknown>,
  sanitized: ColorNode,
  index: number,
  warnings: ProjectValidationIssue[]
): void {
  if (!isRecord(original.primaries)) {
    warnings.push(issue(`nodes.${index}.primaries`, "DEFAULTED", "Missing primaries were reset to neutral values.", original.primaries));
    return;
  }

  const paths = [
    "lift.r", "lift.g", "lift.b",
    "gamma.r", "gamma.g", "gamma.b",
    "gain.r", "gain.g", "gain.b",
    "offset.r", "offset.g", "offset.b",
    "contrast", "pivot", "saturation", "temperature", "tint"
  ];

  for (const path of paths) {
    const originalValue = readPath(original.primaries, path);
    const sanitizedValue = readPath(sanitized.primaries as unknown as Record<string, unknown>, path);
    if (typeof originalValue === "number" && originalValue !== sanitizedValue) {
      warnings.push(issue(`nodes.${index}.primaries.${path}`, "CLAMPED", "Primary value was clamped to the supported MVP range.", originalValue));
    }
  }

  if (isRecord(original.tracking)) {
    collectTrackingWarnings(original.tracking, sanitized, index, warnings);
  }
}

function collectTrackingWarnings(
  original: Record<string, unknown>,
  sanitized: ColorNode,
  index: number,
  warnings: ProjectValidationIssue[]
): void {
  if (original.targetShape !== undefined && original.targetShape !== sanitized.tracking.targetShape) {
    warnings.push(issue(`nodes.${index}.tracking.targetShape`, "DEFAULTED", "Invalid tracking target was reset.", original.targetShape));
  }

  if (Array.isArray(original.keyframes) && original.keyframes.length !== sanitized.tracking.keyframes.length) {
    warnings.push(issue(
      `nodes.${index}.tracking.keyframes`,
      "CLAMPED",
      "Invalid tracking keyframes were removed.",
      original.keyframes.length
    ));
  }

  sanitized.tracking.keyframes.forEach((keyframe, keyframeIndex) => {
    const originalKeyframe = Array.isArray(original.keyframes)
      ? original.keyframes.find((item) => isRecord(item) && item.frame === keyframe.frame)
      : undefined;

    if (!isRecord(originalKeyframe)) {
      return;
    }

    if (originalKeyframe.dx !== keyframe.dx) {
      warnings.push(issue(`nodes.${index}.tracking.keyframes.${keyframeIndex}.dx`, "CLAMPED", "Tracking dx was clamped.", originalKeyframe.dx));
    }
    if (originalKeyframe.dy !== keyframe.dy) {
      warnings.push(issue(`nodes.${index}.tracking.keyframes.${keyframeIndex}.dy`, "CLAMPED", "Tracking dy was clamped.", originalKeyframe.dy));
    }
    if (originalKeyframe.confidence !== keyframe.confidence) {
      warnings.push(issue(
        `nodes.${index}.tracking.keyframes.${keyframeIndex}.confidence`,
        "CLAMPED",
        "Tracking confidence was clamped.",
        originalKeyframe.confidence
      ));
    }
  });
}

function readPath(source: Record<string, unknown>, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, source);
}

function readString(
  value: unknown,
  path: string,
  fallback: string,
  warnings: ProjectValidationIssue[]
): string {
  if (typeof value === "string") {
    return value;
  }

  warnings.push(issue(path, "DEFAULTED", "String value was missing or invalid; a default was used.", value));
  return fallback;
}

function readNumber(
  value: unknown,
  path: string,
  fallback: number,
  warnings: ProjectValidationIssue[]
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  warnings.push(issue(path, "DEFAULTED", "Numeric value was missing or invalid; a default was used.", value));
  return fallback;
}

function clampNumber(
  value: number,
  min: number,
  max: number,
  path: string,
  warnings: ProjectValidationIssue[]
): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (clamped !== value) {
    warnings.push(issue(path, "CLAMPED", "Numeric value was clamped to the supported range.", value));
  }

  return clamped;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function issue(
  path: string,
  code: ProjectValidationIssue["code"],
  message: string,
  received?: unknown
): ProjectValidationIssue {
  return { path, code, message, received };
}

function createProjectId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }

  return `project-${Date.now().toString(36)}`;
}
