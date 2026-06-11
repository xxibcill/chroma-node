import type { GradeVersion, ReviewStatus } from "../shared/project.js";
import type { VersionCreateRequest, VersionUpdateRequest } from "../shared/ipc.js";
import { getCurrentProject, updateProject } from "./projectFile.js";
import { createColorNode } from "../shared/colorEngine.js";

function createVersionId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `version-${Date.now().toString(36)}`;
}

export async function createVersion(request: VersionCreateRequest): Promise<GradeVersion> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const now = Date.now();
  const nodes = request.duplicateFromCurrent ? cloneJson(project.nodes) : [createColorNode(1)];

  const version: GradeVersion = {
    id: createVersionId(),
    name: request.name,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    authorLabel: request.authorLabel,
    notes: request.notes,
    sourceRecipe: request.duplicateFromCurrent ?? false,
    nodes,
    stillRefs: [],
    approvalChain: []
  };

  const versions = project.gradeVersions ?? [];
  versions.push(version);

  project.gradeVersions = versions;
  if (!project.activeVersionId) {
    project.activeVersionId = version.id;
  }

  await updateProject(project);

  return version;
}

export async function listVersions(): Promise<{ versions: GradeVersion[]; activeVersionId?: string }> {
  const project = getCurrentProject();
  if (!project) {
    return { versions: [], activeVersionId: undefined };
  }

  return {
    versions: project.gradeVersions ?? [],
    activeVersionId: project.activeVersionId
  };
}

export async function switchVersion(versionId: string): Promise<GradeVersion> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const versions = project.gradeVersions ?? [];
  const targetVersion = versions.find(v => v.id === versionId);
  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found`);
  }

  project.activeVersionId = versionId;
  project.nodes = cloneJson(targetVersion.nodes);
  project.updatedAt = Date.now();

  await updateProject(project);

  return targetVersion;
}

export async function deleteVersion(versionId: string): Promise<void> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const versions = project.gradeVersions ?? [];
  const index = versions.findIndex(v => v.id === versionId);
  if (index === -1) {
    throw new Error(`Version ${versionId} not found`);
  }

  versions.splice(index, 1);

  if (project.activeVersionId === versionId) {
    project.activeVersionId = versions.length > 0 ? versions[0].id : undefined;
    if (versions.length > 0) {
      project.nodes = cloneJson(versions[0].nodes);
    }
  }

  project.gradeVersions = versions;
  await updateProject(project);
}

export async function updateVersion(request: VersionUpdateRequest): Promise<GradeVersion> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const versions = project.gradeVersions ?? [];
  const targetVersion = versions.find(v => v.id === request.versionId);
  if (!targetVersion) {
    throw new Error(`Version ${request.versionId} not found`);
  }

  if (request.updates.name !== undefined) {
    targetVersion.name = request.updates.name;
  }
  if (request.updates.status !== undefined) {
    targetVersion.status = request.updates.status;
  }
  if (request.updates.notes !== undefined) {
    targetVersion.notes = request.updates.notes;
  }
  if (request.updates.authorLabel !== undefined) {
    targetVersion.authorLabel = request.updates.authorLabel;
  }
  if (request.updates.exportPath !== undefined) {
    targetVersion.exportPath = request.updates.exportPath;
  }

  if (request.approvalEntry) {
    targetVersion.approvalChain.push(request.approvalEntry);
  }

  targetVersion.updatedAt = Date.now();

  project.gradeVersions = versions;
  await updateProject(project);

  return targetVersion;
}

export async function getActiveVersion(): Promise<GradeVersion | undefined> {
  const project = getCurrentProject();
  if (!project) {
    return undefined;
  }

  if (!project.activeVersionId) {
    return undefined;
  }

  const versions = project.gradeVersions ?? [];
  return versions.find(v => v.id === project.activeVersionId);
}

export async function snapshotCurrentToVersion(versionId: string): Promise<void> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const versions = project.gradeVersions ?? [];
  const targetVersion = versions.find(v => v.id === versionId);
  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found`);
  }

  targetVersion.nodes = cloneJson(project.nodes);
  targetVersion.updatedAt = Date.now();

  project.gradeVersions = versions;
  await updateProject(project);
}

export async function setVersionStatus(versionId: string, status: ReviewStatus, reviewerLabel?: string, comment?: string): Promise<GradeVersion> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const versions = project.gradeVersions ?? [];
  const targetVersion = versions.find(v => v.id === versionId);
  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found`);
  }

  targetVersion.status = status;
  targetVersion.updatedAt = Date.now();

  targetVersion.approvalChain.push({
    status,
    reviewerLabel,
    timestamp: Date.now(),
    comment
  });

  project.gradeVersions = versions;
  await updateProject(project);

  return targetVersion;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
