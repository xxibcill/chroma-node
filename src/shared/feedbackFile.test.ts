import { describe, expect, it } from "vitest";
import { createFeedbackFile, serializeFeedbackFile, validateFeedbackFile } from "./feedbackFile";

describe("feedbackFile schema", () => {
  it("creates a valid feedback file with notes", () => {
    const feedback = createFeedbackFile({
      projectId: "proj-1",
      reviewerLabel: "Director",
      notes: [
        { text: "Boost the reds in this shot", status: "open", frameIndex: 24, timecode: "00:00:01:00" },
        { text: "Looks good now", status: "resolved", frameIndex: 48, timecode: "00:00:02:00", resolvedAt: Date.now(), resolvedBy: "Colorist" }
      ]
    });

    expect(feedback.schemaVersion).toBe("1.0.0");
    expect(feedback.projectId).toBe("proj-1");
    expect(feedback.reviewerLabel).toBe("Director");
    expect(feedback.notes).toHaveLength(2);
    expect(feedback.notes[0].status).toBe("open");
    expect(feedback.notes[1].status).toBe("resolved");
  });

  it("validates a well-formed feedback file", () => {
    const feedback = {
      schemaVersion: "1.0.0",
      projectId: "proj-1",
      reviewerLabel: "Client",
      createdAt: Date.now(),
      notes: [
        { id: "note-1", text: "Great work", status: "open" },
        { id: "note-2", text: "Needs adjustment", status: "resolved", resolvedAt: Date.now(), resolvedBy: "Colorist" }
      ]
    };

    const result = validateFeedbackFile(feedback);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.feedbackFile.notes).toHaveLength(2);
      expect(result.feedbackFile.notes[0].id).toBe("note-1");
    }
  });

  it("rejects non-object feedback files", () => {
    const result = validateFeedbackFile("not an object");
    expect(result.ok).toBe(false);
  });

  it("defaults missing optional fields", () => {
    const feedback = {
      notes: [
        { id: "note-1", text: "Test", status: "open" }
      ]
    };

    const result = validateFeedbackFile(feedback);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.feedbackFile.projectId).toBeUndefined();
      expect(result.feedbackFile.reviewerLabel).toBeUndefined();
      expect(result.feedbackFile.createdAt).toBeGreaterThan(0);
    }
  });

  it("serializes and deserializes feedback file", () => {
    const original = createFeedbackFile({
      reviewerLabel: "Editor",
      notes: [
        { text: "First note", status: "open", frameIndex: 10 },
        { text: "Second note", status: "deferred", frameIndex: 20 }
      ]
    });

    const json = serializeFeedbackFile(original);
    const parsed = validateFeedbackFile(JSON.parse(json));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.feedbackFile.notes).toHaveLength(2);
      expect(parsed.feedbackFile.reviewerLabel).toBe("Editor");
    }
  });
});