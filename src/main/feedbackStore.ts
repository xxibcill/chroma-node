import { readFile } from "fs/promises";
import { validateFeedbackFile, createFeedbackFile, type FeedbackFile, type FeedbackNote } from "../shared/feedbackFile.js";
import type { FeedbackImportRequest, FeedbackImportResult } from "../shared/ipc.js";
import type { Annotation, AnnotationStatus } from "../shared/project.js";
import { getCurrentProject, updateProject } from "./projectFile.js";

export async function importFeedback(request: { feedbackPath: string }): Promise<FeedbackFile> {
  let data: string;
  try {
    data = await readFile(request.feedbackPath, "utf8");
  } catch {
    throw new Error(`Could not read feedback file: ${request.feedbackPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Feedback file is not valid JSON");
  }

  const validation = validateFeedbackFile(parsed);
  if (!validation.ok) {
    throw new Error(`Invalid feedback file: ${validation.errors.map(e => e.message).join("; ")}`);
  }

  return validation.feedbackFile;
}

export async function importFeedbackToAnnotations(
  feedbackFile: FeedbackFile,
  duplicateStrategy: NonNullable<FeedbackImportRequest["duplicateStrategy"]> = "skip"
): Promise<FeedbackImportResult> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  let imported = 0;
  let skipped = 0;
  let replaced = 0;
  let renamed = 0;
  const conflicts: FeedbackImportResult["conflicts"] = [];

  for (const note of feedbackFile.notes) {
    const annotation = createAnnotationFromFeedback(feedbackFile, note);

    const existingIndex = annotations.findIndex(a => a.id === annotation.id);
    if (existingIndex === -1) {
      annotations.push(annotation);
      imported++;
      continue;
    }

    if (duplicateStrategy === "replace") {
      annotations[existingIndex] = {
        ...annotation,
        createdAt: annotations[existingIndex].createdAt,
        updatedAt: Date.now()
      };
      replaced++;
      conflicts.push({ feedbackNoteId: note.id, annotationId: annotation.id, action: "replaced" });
      continue;
    }

    if (duplicateStrategy === "rename") {
      const renamedAnnotation = {
        ...annotation,
        id: createRenamedAnnotationId(annotation.id, annotations)
      };
      annotations.push(renamedAnnotation);
      imported++;
      renamed++;
      conflicts.push({ feedbackNoteId: note.id, annotationId: renamedAnnotation.id, action: "renamed" });
      continue;
    }

    skipped++;
    conflicts.push({ feedbackNoteId: note.id, annotationId: annotation.id, action: "skipped" });
  }

  project.annotations = annotations;
  await updateProject(project);

  return {
    feedbackFile,
    imported,
    skipped,
    replaced,
    renamed,
    conflicts
  };
}

export async function resolveFeedback(request: { feedbackNoteId: string; resolved: boolean; resolvedBy?: string }): Promise<void> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotationId = `fb-${request.feedbackNoteId}`;
  const annotations = project.annotations ?? [];
  const targetAnnotation = annotations.find(a => a.id === annotationId);

  if (targetAnnotation) {
    targetAnnotation.status = request.resolved ? "resolved" : "open";
    targetAnnotation.updatedAt = Date.now();
    project.annotations = annotations;
    await updateProject(project);
  }
}

export async function exportAnnotationsToFeedback(reviewerLabel?: string): Promise<FeedbackFile> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  const notes: FeedbackNote[] = annotations
    .filter(a => a.authorLabel === reviewerLabel || reviewerLabel === undefined)
    .map(a => ({
      id: a.id.replace(/^fb-/, ""),
      frameIndex: a.frameIndex,
      timecode: a.timecode,
      text: a.text.replace(/^\[[^\]]+\]\s*/, ""),
      status: a.status as import("../shared/project.js").FeedbackNoteStatus,
      resolvedAt: a.status === "resolved" ? a.updatedAt : undefined,
      resolvedBy: a.status === "resolved" ? a.authorLabel : undefined
    }));

  return createFeedbackFile({
    projectId: project.projectId,
    reviewerLabel,
    notes
  });
}

function createAnnotationFromFeedback(feedbackFile: FeedbackFile, note: FeedbackNote): Annotation {
  return {
    id: `fb-${note.id}`,
    frameIndex: note.frameIndex ?? 0,
    timecode: note.timecode ?? "",
    text: `[${feedbackFile.reviewerLabel ?? "Reviewer"}] ${note.text}`,
    status: note.status as AnnotationStatus,
    versionId: feedbackFile.versionId,
    createdAt: feedbackFile.createdAt,
    updatedAt: Date.now(),
    authorLabel: feedbackFile.reviewerLabel
  };
}

function createRenamedAnnotationId(baseId: string, annotations: Annotation[]): string {
  const existingIds = new Set(annotations.map((annotation) => annotation.id));
  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
}
