import { app, dialog } from "electron";
import { existsSync } from "fs";
import { copyFile, readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import type {
  HandoffPackageManifest,
  HandoffPackageMode,
  HandoffMediaRef
} from "../shared/project.js";
import { HANDOFF_PACKAGE_SCHEMA_VERSION } from "../shared/project.js";
import { getCurrentProject, updateProject } from "./projectFile.js";

function getHandoffPackageDir(): string {
  return path.join(app.getPath("userData"), "handoff-packages");
}

async function ensureHandoffPackageDir(): Promise<void> {
  const dir = getHandoffPackageDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function createPackageId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `handoff-pkg-${Date.now().toString(36)}`;
}

function computeManifestChecksum(manifest: Omit<HandoffPackageManifest, "manifestChecksum">): string {
  const data = JSON.stringify({ ...manifest, manifestChecksum: "" });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function redactPaths(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && (value.includes("/Users/") || value.includes("\\Users\\") || value.includes("C:\\"))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactPaths(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function getFileSize(filePath: string): Promise<number | undefined> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return undefined;
  }
}

async function validateMediaRefs(mediaRefs: HandoffMediaRef[]): Promise<{ missingMedia: string[]; missingDeps: string[] }> {
  const missingMedia: string[] = [];
  const missingDeps: string[] = [];

  for (const ref of mediaRefs) {
    if (ref.included && ref.originalPath && !existsSync(ref.originalPath)) {
      missingMedia.push(ref.originalPath);
    }
  }

  return { missingMedia, missingDeps };
}

export async function exportHandoffPackage(request: {
  packageMode: HandoffPackageMode;
  packageName: string;
  includeMedia: boolean;
  includeCache: boolean;
  includeExports: boolean;
  includeLogs: boolean;
  redactPaths: boolean;
}): Promise<{ path: string; manifest: HandoffPackageManifest }> {
  await ensureHandoffPackageDir();

  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const packageId = createPackageId();
  const now = Date.now();

  const mediaRefs: HandoffMediaRef[] = [];
  if (project.media && request.includeMedia) {
    const size = await getFileSize(project.media.sourcePath);
    mediaRefs.push({
      originalPath: project.media.sourcePath,
      included: true,
      size,
      checksum: undefined
    });
  }

  const { missingMedia, missingDeps } = await validateMediaRefs(mediaRefs);

  const baseManifest: Omit<HandoffPackageManifest, "manifestChecksum"> = {
    schemaVersion: HANDOFF_PACKAGE_SCHEMA_VERSION,
    packageId,
    name: request.packageName,
    packageMode: request.packageMode,
    createdAt: now,
    projectName: project.name,
    projectId: project.projectId,
    includesMedia: request.includeMedia,
    includesCache: request.includeCache,
    includesExports: request.includeExports,
    includesLogs: request.includeLogs,
    redacted: request.redactPaths,
    mediaRefs,
    libraryDeps: [],
    missingMedia,
    missingDeps
  };

  const manifestChecksum = computeManifestChecksum(baseManifest);
  const manifest: HandoffPackageManifest = {
    ...baseManifest,
    manifestChecksum
  };

  const selection = await dialog.showSaveDialog({
    title: "Export Project Handoff Package",
    defaultPath: path.join(app.getPath("documents"), `${request.packageName}.chromahandoff`),
    filters: [{ name: "Chroma Handoff Package", extensions: ["chromahandoff"] }]
  });

  if (selection.canceled || !selection.filePath) {
    throw new Error("Export cancelled");
  }

  const packagePath = selection.filePath.toLowerCase().endsWith(".chromahandoff")
    ? selection.filePath
    : `${selection.filePath}.chromahandoff`;

  const content: Record<string, unknown> = {
    manifest,
    project: request.redactPaths ? redactPaths(project as unknown as Record<string, unknown>) : project
  };

  if (request.includeMedia && project.media) {
    const mediaSourcePath = project.media.sourcePath;
    if (existsSync(mediaSourcePath)) {
      const mediaDir = path.dirname(packagePath);
      const mediaFileName = path.basename(mediaSourcePath);
      const destPath = path.join(mediaDir, `media_${mediaFileName}`);
      try {
        await copyFile(mediaSourcePath, destPath);
        content.mediaPath = destPath;
      } catch {
        content.mediaPath = "[COPY_FAILED]";
      }
    }
  }

  await writeFile(packagePath, JSON.stringify(content, null, 2), "utf8");

  return { path: packagePath, manifest };
}

export async function importHandoffPackage(request: { packagePath: string }): Promise<void> {
  let data: string;
  try {
    data = await readFile(request.packagePath, "utf8");
  } catch {
    throw new Error(`Could not read handoff package: ${request.packagePath}`);
  }

  let parsed: { manifest: HandoffPackageManifest; project?: unknown; mediaPath?: string };
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Handoff package is not valid JSON");
  }

  const manifest = parsed.manifest;
  if (!manifest || manifest.schemaVersion !== HANDOFF_PACKAGE_SCHEMA_VERSION) {
    throw new Error("Invalid handoff package schema version");
  }

  const { manifestChecksum: storedChecksum, ...manifestWithoutChecksum } = manifest;
  const computedChecksum = computeManifestChecksum(manifestWithoutChecksum);
  if (computedChecksum !== storedChecksum) {
    throw new Error("Handoff package checksum mismatch - file may be corrupted");
  }

  if (parsed.project) {
    await updateProject(parsed.project as Parameters<typeof updateProject>[0]);
  }
}

export async function validateHandoffPackage(request: { packagePath: string }): Promise<HandoffPackageManifest> {
  let data: string;
  try {
    data = await readFile(request.packagePath, "utf8");
  } catch {
    throw new Error(`Could not read handoff package: ${request.packagePath}`);
  }

  let parsed: { manifest: HandoffPackageManifest };
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Handoff package is not valid JSON");
  }

  const manifest = parsed.manifest;
  if (!manifest || manifest.schemaVersion !== HANDOFF_PACKAGE_SCHEMA_VERSION) {
    throw new Error("Invalid handoff package schema version");
  }

  const { manifestChecksum: storedChecksum, ...manifestWithoutChecksum } = manifest;
  const computedChecksum = computeManifestChecksum(manifestWithoutChecksum);
  if (computedChecksum !== storedChecksum) {
    throw new Error("Handoff package checksum mismatch - file may be corrupted");
  }

  return manifest;
}

export async function estimatePackageSize(request: {
  packageMode: HandoffPackageMode;
  includeMedia: boolean;
  includeCache: boolean;
  includeExports: boolean;
  includeLogs: boolean;
}): Promise<{ estimatedBytes: number; missingMedia: string[] }> {
  const project = getCurrentProject();
  if (!project) {
    return { estimatedBytes: 0, missingMedia: [] };
  }

  let estimatedBytes = 1000;

  if (project.media && request.includeMedia) {
    const size = await getFileSize(project.media.sourcePath);
    if (size) {
      estimatedBytes += size;
    }
  }

  const missingMedia: string[] = [];
  if (project.media && request.includeMedia && !existsSync(project.media.sourcePath)) {
    missingMedia.push(project.media.sourcePath);
  }

  return { estimatedBytes, missingMedia };
}