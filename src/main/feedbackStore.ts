import { readFile } from "fs/promises";
import { validateFeedbackFile, createFeedbackFile, type FeedbackFile, type FeedbackNote } from "../shared/feedbackFile.js";
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

export async function importFeedbackToAnnotations(feedbackFile: FeedbackFile): Promise<number> {
  const project = getCurrentProject();
  if (!project) {
    throw new Error("No project is currently open");
  }

  const annotations = project.annotations ?? [];
  let imported = 0;

  for (const note of feedbackFile.notes) {
    const annotation = {
      id: `fb-${note.id}`,
      frameIndex: note.frameIndex ?? 0,
      timecode: note.timecode ?? "",
      text: `[${feedbackFile.reviewerLabel ?? "Reviewer"}] ${note.text}`,
      status: note.status as import("../shared/project.js").AnnotationStatus,
      versionId: feedbackFile.versionId,
      createdAt: feedbackFile.createdAt,
      updatedAt: Date.now(),
      authorLabel: feedbackFile.reviewerLabel
    };

    const existingIndex = annotations.findIndex(a => a.id === annotation.id);
    if (existingIndex === -1) {
      annotations.push(annotation as import("../shared/project.js").Annotation);
      imported++;
    }
  }

  project.annotations = annotations;
  await updateProject(project);

  return imported;
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