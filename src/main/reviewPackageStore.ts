import { app, dialog } from "electron";
import { existsSync } from "fs";
import { copyFile, readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type {
  ReviewPackageManifest,
  ReviewPackageType,
  ReviewVersionRef,
  ReviewStillRef,
  ScopeSnapshotRef,
  ReviewApprovalSummary,
  Annotation
} from "../shared/project.js";
import { REVIEW_PACKAGE_SCHEMA_VERSION } from "../shared/project.js";
import { getCurrentProject, updateProject } from "./projectFile.js";

function getReviewPackageDir(): string {
  return path.join(app.getPath("userData"), "review-packages");
}

async function ensureReviewPackageDir(): Promise<void> {
  const dir = getReviewPackageDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function createPackageId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `review-pkg-${Date.now().toString(36)}`;
}

function computeManifestChecksum(manifest: Omit<ReviewPackageManifest, "manifestChecksum">): string {
  const data = JSON.stringify({ ...manifest, manifestChecksum: "" });
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export async function exportReviewPackage(request: {
  versionIds: string[];
  stillIds: string[];
  scopeSnapshotIds: string[];
  stills?: ReviewStillRef[];
  scopeSnapshots?: ScopeSnapshotRef[];
  packageType: ReviewPackageType;
  packageName: string;
  includeMedia: boolean;
  redactPaths: boolean;
}): Promise<{ path: string; manifest: ReviewPackageManifest }> {
  await ensureReviewPackageDir();

  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const packageId = createPackageId();
  const now = Date.now();

  const versions: ReviewVersionRef[] = [];
  const approvalSummary: ReviewApprovalSummary = {
    totalVersions: 0,
    byStatus: { draft: 0, "in-review": 0, approved: 0, rejected: 0, archived: 0 }
  };

  const gradeVersions = project.gradeVersions ?? [];
  for (const versionId of request.versionIds) {
    const version = gradeVersions.find(v => v.id === versionId);
    if (version) {
      versions.push({
        versionId: version.id,
        versionName: version.name,
        status: version.status,
        nodes: version.nodes
      });
      approvalSummary.totalVersions++;
      approvalSummary.byStatus[version.status]++;
      if (version.approvalChain.length > 0) {
        approvalSummary.latestApproval = version.approvalChain[version.approvalChain.length - 1];
      }
    }
  }

  const requestedVersionIds = new Set(request.versionIds);
  const annotations: Annotation[] = (project.annotations ?? [])
    .filter((annotation) => !annotation.versionId || requestedVersionIds.has(annotation.versionId))
    .sort((a, b) => a.frameIndex - b.frameIndex || a.createdAt - b.createdAt);

  const requestedStillIds = new Set(request.stillIds);
  const stills: ReviewStillRef[] = (request.stills ?? [])
    .filter((still) => requestedStillIds.size === 0 || requestedStillIds.has(still.stillId));

  const requestedScopeSnapshotIds = new Set(request.scopeSnapshotIds);
  const scopeSnapshots: ScopeSnapshotRef[] = (request.scopeSnapshots ?? [])
    .filter((snapshot) => requestedScopeSnapshotIds.size === 0 || requestedScopeSnapshotIds.has(snapshot.id));

  const baseManifest: Omit<ReviewPackageManifest, "manifestChecksum"> = {
    schemaVersion: REVIEW_PACKAGE_SCHEMA_VERSION,
    packageId,
    name: request.packageName,
    createdAt: now,
    packageType: request.packageType,
    projectName: project.name,
    projectId: project.projectId,
    versions,
    annotations,
    stills,
    scopeSnapshots,
    approvalSummary,
    includesMedia: request.includeMedia,
    redacted: request.redactPaths
  };

  const manifestChecksum = computeManifestChecksum(baseManifest);
  const manifest: ReviewPackageManifest = {
    ...baseManifest,
    manifestChecksum
  };

  const selection = await dialog.showSaveDialog({
    title: "Export Review Package",
    defaultPath: path.join(app.getPath("documents"), `${request.packageName}.chromareview`),
    filters: [{ name: "Chroma Review Package", extensions: ["chromareview"] }]
  });

  if (selection.canceled || !selection.filePath) {
    throw new Error("Export cancelled");
  }

  const packagePath = selection.filePath.toLowerCase().endsWith(".chromareview")
    ? selection.filePath
    : `${selection.filePath}.chromareview`;

  const content: Record<string, unknown> = { manifest };
  if (request.redactPaths) {
    content._redacted = true;
  }

  if (request.includeMedia && project.media) {
    content.media = {
      fileName: project.media.fileName,
      codec: project.media.codec,
      width: project.media.width,
      height: project.media.height,
      durationSeconds: project.media.durationSeconds,
      sourcePath: request.redactPaths ? "[REDACTED]" : project.media.sourcePath
    };

    if (existsSync(project.media.sourcePath)) {
      const mediaFileName = path.basename(project.media.sourcePath);
      const mediaPath = path.join(path.dirname(packagePath), `review_media_${mediaFileName}`);
      await copyFile(project.media.sourcePath, mediaPath);
      content.mediaPath = request.redactPaths ? path.basename(mediaPath) : mediaPath;
    }
  }

  await writeFile(packagePath, JSON.stringify(content, null, 2), "utf8");

  return { path: packagePath, manifest };
}

export async function importReviewPackage(request: { packagePath: string; duplicateStrategy?: "skip" | "replace" }): Promise<ReviewPackageManifest> {
  let data: string;
  try {
    data = await readFile(request.packagePath, "utf8");
  } catch {
    throw new Error(`Could not read review package: ${request.packagePath}`);
  }

  let parsed: { manifest: ReviewPackageManifest; _redacted?: boolean };
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Review package is not valid JSON");
  }

  const manifest = parsed.manifest;
  if (!manifest || manifest.schemaVersion !== REVIEW_PACKAGE_SCHEMA_VERSION) {
    throw new Error("Invalid review package schema version");
  }

  const { manifestChecksum: storedChecksum, ...manifestWithoutChecksum } = manifest;
  const computedChecksum = computeManifestChecksum(manifestWithoutChecksum);
  if (computedChecksum !== storedChecksum) {
    throw new Error("Review package checksum mismatch - file may be corrupted");
  }

  const project = getCurrentProject();
  if (project) {
    const duplicateStrategy = request.duplicateStrategy ?? "skip";
    const gradeVersions = project.gradeVersions ?? [];
    for (const versionRef of manifest.versions) {
      const existingVersion = gradeVersions.find(v => v.id === versionRef.versionId);
      if (!existingVersion) {
        gradeVersions.push({
          id: versionRef.versionId,
          name: versionRef.versionName,
          status: versionRef.status,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sourceRecipe: false,
          nodes: cloneJson(versionRef.nodes),
          stillRefs: [],
          approvalChain: []
        });
      } else if (duplicateStrategy === "replace") {
        existingVersion.name = versionRef.versionName;
        existingVersion.status = versionRef.status;
        existingVersion.nodes = cloneJson(versionRef.nodes);
        existingVersion.sourceRecipe = false;
        existingVersion.updatedAt = Date.now();
      }
    }

    const annotations = project.annotations ?? [];
    for (const annotation of manifest.annotations) {
      const existingIndex = annotations.findIndex(a => a.id === annotation.id);
      if (existingIndex === -1) {
        annotations.push(annotation);
      } else if (duplicateStrategy === "replace") {
        annotations[existingIndex] = cloneJson(annotation);
      }
    }

    project.gradeVersions = gradeVersions;
    project.annotations = annotations;
    await updateProject(project);
  }

  return manifest;
}

export async function validateReviewPackage(packagePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const data = await readFile(packagePath, "utf8");
    const parsed = JSON.parse(data);
    const manifest = parsed.manifest as ReviewPackageManifest;

    if (!manifest || manifest.schemaVersion !== REVIEW_PACKAGE_SCHEMA_VERSION) {
      return { valid: false, error: "Invalid schema version" };
    }

    const { manifestChecksum: storedChecksum, ...manifestWithoutChecksum } = manifest;
    const computedChecksum = computeManifestChecksum(manifestWithoutChecksum);
    if (computedChecksum !== storedChecksum) {
      return { valid: false, error: "Checksum mismatch" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: String(error) };
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
