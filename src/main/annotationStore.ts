import type { Annotation } from "../shared/project.js";
import type { AnnotationCreateRequest, AnnotationUpdateRequest, AnnotationListRequest } from "../shared/ipc.js";
import { getCurrentProject, updateProject } from "./projectFile.js";

function createAnnotationId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && "randomUUID" in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `annotation-${Date.now().toString(36)}`;
}

export async function createAnnotation(request: AnnotationCreateRequest): Promise<Annotation> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const now = Date.now();
  const annotation: Annotation = {
    id: createAnnotationId(),
    frameIndex: request.frameIndex,
    timecode: request.timecode,
    text: request.text,
    status: "open",
    geometry: request.geometry,
    versionId: request.versionId,
    createdAt: now,
    updatedAt: now,
    authorLabel: request.authorLabel
  };

  const annotations = project.annotations ?? [];
  annotations.push(annotation);

  project.annotations = annotations;
  await updateProject(project);

  return annotation;
}

export async function updateAnnotation(request: AnnotationUpdateRequest): Promise<Annotation> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  const targetAnnotation = annotations.find(a => a.id === request.annotationId);
  if (!targetAnnotation) {
    throw new Error(`Annotation ${request.annotationId} not found`);
  }

  if (request.updates.text !== undefined) {
    targetAnnotation.text = request.updates.text;
  }
  if (request.updates.status !== undefined) {
    targetAnnotation.status = request.updates.status;
  }
  if (request.updates.geometry !== undefined) {
    targetAnnotation.geometry = request.updates.geometry;
  }

  targetAnnotation.updatedAt = Date.now();

  project.annotations = annotations;
  await updateProject(project);

  return targetAnnotation;
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  const index = annotations.findIndex(a => a.id === annotationId);
  if (index === -1) {
    throw new Error(`Annotation ${annotationId} not found`);
  }

  annotations.splice(index, 1);
  project.annotations = annotations;
  await updateProject(project);
}

export async function listAnnotations(request: AnnotationListRequest): Promise<Annotation[]> {
  const project = getCurrentProject();
  if (!project) {
    return [];
  }

  let annotations = project.annotations ?? [];

  if (request.versionId) {
    annotations = annotations.filter(a => a.versionId === request.versionId);
  }

  if (request.frameStart !== undefined) {
    annotations = annotations.filter(a => a.frameIndex >= request.frameStart!);
  }

  if (request.frameEnd !== undefined) {
    annotations = annotations.filter(a => a.frameIndex <= request.frameEnd!);
  }

  if (request.status) {
    annotations = annotations.filter(a => a.status === request.status);
  }

  return annotations.sort((a, b) => a.frameIndex - b.frameIndex);
}

export async function getAnnotationsByFrame(frameIndex: number, versionId?: string): Promise<Annotation[]> {
  const project = getCurrentProject();
  if (!project) {
    return [];
  }

  let annotations = project.annotations ?? [];
  annotations = annotations.filter(a => a.frameIndex === frameIndex);

  if (versionId) {
    annotations = annotations.filter(a => a.versionId === versionId || a.versionId === undefined);
  }

  return annotations;
}

export async function resolveAnnotation(annotationId: string, resolved: boolean): Promise<Annotation> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  const targetAnnotation = annotations.find(a => a.id === annotationId);
  if (!targetAnnotation) {
    throw new Error(`Annotation ${annotationId} not found`);
  }

  targetAnnotation.status = resolved ? "resolved" : "open";
  targetAnnotation.updatedAt = Date.now();

  project.annotations = annotations;
  await updateProject(project);

  return targetAnnotation;
}

export async function resolveAllAnnotations(versionId?: string): Promise<void> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  const now = Date.now();

  for (const annotation of annotations) {
    if (versionId && annotation.versionId && annotation.versionId !== versionId) {
      continue;
    }
    if (annotation.status === "open") {
      annotation.status = "resolved";
      annotation.updatedAt = now;
    }
  }

  project.annotations = annotations;
  await updateProject(project);
}

export async function getAnnotationStats(): Promise<{ total: number; open: number; resolved: number; deferred: number; rejected: number }> {
  const project = getCurrentProject();
  if (!project) {
    return { total: 0, open: 0, resolved: 0, deferred: 0, rejected: 0 };
  }

  const annotations = project.annotations ?? [];
  return {
    total: annotations.length,
    open: annotations.filter(a => a.status === "open").length,
    resolved: annotations.filter(a => a.status === "resolved").length,
    deferred: annotations.filter(a => a.status === "deferred").length,
    rejected: annotations.filter(a => a.status === "rejected").length
  };
}