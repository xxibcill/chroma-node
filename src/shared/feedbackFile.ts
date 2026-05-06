import type { FeedbackNoteStatus } from "./project.js";

export const FEEDBACK_FILE_SCHEMA_VERSION = "1.0.0";

export interface FeedbackFile {
  schemaVersion: typeof FEEDBACK_FILE_SCHEMA_VERSION;
  projectId?: string;
  versionId?: string;
  reviewerLabel?: string;
  createdAt: number;
  notes: FeedbackNote[];
}

export interface FeedbackNote {
  id: string;
  frameIndex?: number;
  timecode?: string;
  text: string;
  status: FeedbackNoteStatus;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface FeedbackValidationIssue {
  path: string;
  code: "INVALID_TYPE" | "MISSING_REQUIRED" | "INVALID_FEEDBACK";
  message: string;
}

export type FeedbackValidationResult =
  | { ok: true; feedbackFile: FeedbackFile; warnings: FeedbackValidationIssue[] }
  | { ok: false; errors: FeedbackValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readFeedbackNoteStatus(value: unknown): FeedbackNoteStatus {
  if (value === "open" || value === "resolved" || value === "deferred") {
    return value;
  }
  return "open";
}

export function validateFeedbackFile(input: unknown): FeedbackValidationResult {
  const warnings: FeedbackValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ path: "", code: "INVALID_TYPE", message: "Feedback file must be a JSON object" }]
    };
  }

  const notes = Array.isArray(input.notes) ? input.notes : [];
  const validNotes: FeedbackNote[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (!isRecord(note)) {
      warnings.push({ path: `notes.${i}`, code: "INVALID_FEEDBACK", message: "Invalid note was skipped" });
      continue;
    }

    validNotes.push({
      id: readString(note.id, `note-${i}`),
      frameIndex: typeof note.frameIndex === "number" ? note.frameIndex : undefined,
      timecode: typeof note.timecode === "string" ? note.timecode : undefined,
      text: readString(note.text, ""),
      status: readFeedbackNoteStatus(note.status),
      resolvedAt: typeof note.resolvedAt === "number" ? note.resolvedAt : undefined,
      resolvedBy: typeof note.resolvedBy === "string" ? note.resolvedBy : undefined
    });
  }

  const feedbackFile: FeedbackFile = {
    schemaVersion: FEEDBACK_FILE_SCHEMA_VERSION,
    projectId: typeof input.projectId === "string" ? input.projectId : undefined,
    versionId: typeof input.versionId === "string" ? input.versionId : undefined,
    reviewerLabel: typeof input.reviewerLabel === "string" ? input.reviewerLabel : undefined,
    createdAt: readNumber(input.createdAt, Date.now()),
    notes: validNotes
  };

  return { ok: true, feedbackFile, warnings };
}

export function createFeedbackFile(data: {
  projectId?: string;
  versionId?: string;
  reviewerLabel?: string;
  notes: Omit<FeedbackNote, "id">[];
}): FeedbackFile {
  return {
    schemaVersion: FEEDBACK_FILE_SCHEMA_VERSION,
    projectId: data.projectId,
    versionId: data.versionId,
    reviewerLabel: data.reviewerLabel,
    createdAt: Date.now(),
    notes: data.notes.map((note, i) => ({
      id: `note-${Date.now().toString(36)}-${i}`,
      ...note
    }))
  };
}

export function serializeFeedbackFile(feedbackFile: FeedbackFile): string {
  return JSON.stringify(feedbackFile, null, 2);
}