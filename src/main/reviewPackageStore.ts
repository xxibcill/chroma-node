import { app, dialog } from "electron";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type {
  ReviewPackageManifest,
  ReviewPackageType,
  ReviewVersionRef,
  ReviewStillRef,
  ReviewApprovalSummary,
  Annotation
} from "../shared/project.js";
import { REVIEW_PACKAGE_SCHEMA_VERSION } from "../shared/project.js";
import { getCurrentProject, updateProject } from "./projectFile.js";
import { getAnnotationsByFrame } from "./annotationStore.js";

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

  const annotations: Annotation[] = [];
  for (const versionId of request.versionIds) {
    const versionAnnotations = await getAnnotationsByFrame(0, versionId);
    annotations.push(...versionAnnotations);
  }

  const stills: ReviewStillRef[] = [];

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
    scopeSnapshots: [],
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

  await writeFile(packagePath, JSON.stringify(content, null, 2), "utf8");

  return { path: packagePath, manifest };
}

export async function importReviewPackage(request: { packagePath: string }): Promise<ReviewPackageManifest> {
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
          nodes: versionRef.nodes,
          stillRefs: [],
          approvalChain: []
        });
      }
    }

    const annotations = project.annotations ?? [];
    for (const annotation of manifest.annotations) {
      if (!annotations.find(a => a.id === annotation.id)) {
        annotations.push(annotation);
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