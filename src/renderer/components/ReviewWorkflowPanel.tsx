import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Annotation, AnnotationStatus, ChromaProject, GradeVersion, ReviewStatus, ReviewStillRef } from "../../shared/project";
import type { FeedbackImportResult, HandoffPackageEstimateResult } from "../../shared/ipc";

interface GalleryStill {
  id: string;
  thumbnail: string;
  frameIndex: number;
  gradeName: string;
}

interface ReviewWorkflowPanelProps {
  currentFrame: number;
  galleryStills: GalleryStill[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onProjectChange?: (project: ChromaProject) => void;
  project: ChromaProject;
  projectPath?: string;
  timecode: string;
}

type ReviewSelection = "current" | "all" | `version:${string}`;

const api = window.chromaNode;

export function ReviewWorkflowPanel({
  currentFrame,
  galleryStills,
  onAnnotationsChange,
  onProjectChange,
  project,
  projectPath,
  timecode
}: ReviewWorkflowPanelProps) {
  const [versions, setVersions] = useState<GradeVersion[]>([]);
  const [reviewSelection, setReviewSelection] = useState<ReviewSelection>("current");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationText, setAnnotationText] = useState("");
  const [feedbackPath, setFeedbackPath] = useState("");
  const [annotationFilter, setAnnotationFilter] = useState<AnnotationStatus | "active" | "all">("active");
  const [handoffEstimate, setHandoffEstimate] = useState<HandoffPackageEstimateResult | undefined>();
  const [feedbackResult, setFeedbackResult] = useState<FeedbackImportResult | undefined>();
  const [message, setMessage] = useState("Review store ready.");
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const selectedVersionId = reviewSelection.startsWith("version:")
    ? reviewSelection.slice("version:".length)
    : undefined;
  const packageVersionIds = reviewSelection === "all"
    ? versions.map((version) => version.id)
    : selectedVersionId ? [selectedVersionId] : [];

  const applyProjectSnapshot = useCallback((nextProject: ChromaProject) => {
    projectRef.current = nextProject;
    onProjectChange?.(nextProject);
    onAnnotationsChange?.(nextProject.annotations ?? []);
  }, [onAnnotationsChange, onProjectChange]);

  const syncProjectSnapshot = useCallback(async (): Promise<boolean> => {
    if (!api) {
      return false;
    }

    const response = await api.syncCurrentProject({
      project: projectRef.current,
      projectPath
    });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return false;
    }

    applyProjectSnapshot(response.result.value);
    return true;
  }, [applyProjectSnapshot, projectPath]);

  const hydrateProjectSnapshot = useCallback(async () => {
    if (!api) {
      return;
    }

    const response = await api.getCurrentProject();
    if (response.result.ok && response.result.value) {
      applyProjectSnapshot(response.result.value);
    }
  }, [applyProjectSnapshot]);

  const refresh = useCallback(async () => {
    if (!api) {
      return;
    }

    const versionResponse = await api.listVersions();
    if (versionResponse.result.ok) {
      setVersions(versionResponse.result.value.versions);
    }

    const annotationResponse = await api.listAnnotations({});
    if (annotationResponse.result.ok) {
      setAnnotations(annotationResponse.result.value);
      onAnnotationsChange?.(annotationResponse.result.value);
    }
  }, [onAnnotationsChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentAnnotations = useMemo(
    () => annotations.filter((annotation) => {
      if (annotation.frameIndex !== currentFrame) return false;
      if (reviewSelection === "current" && annotation.versionId) return false;
      if (selectedVersionId && annotation.versionId && annotation.versionId !== selectedVersionId) return false;
      if (annotationFilter === "all") return true;
      if (annotationFilter === "active") return annotation.status === "open" || annotation.status === "deferred";
      return annotation.status === annotationFilter;
    }),
    [annotationFilter, annotations, currentFrame, reviewSelection, selectedVersionId]
  );

  const annotationCounts = useMemo(() => ({
    open: annotations.filter((annotation) => annotation.status === "open").length,
    deferred: annotations.filter((annotation) => annotation.status === "deferred").length,
    resolved: annotations.filter((annotation) => annotation.status === "resolved").length
  }), [annotations]);

  const createVersion = async () => {
    if (!api) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.createVersion({
      name: `Review ${versions.length + 1}`,
      duplicateFromCurrent: true,
      authorLabel: "Local"
    });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setReviewSelection(`version:${response.result.value.id}`);
    setMessage(`Created ${response.result.value.name}.`);
    await refresh();
    await hydrateProjectSnapshot();
  };

  const snapshotVersion = async () => {
    if (!api || !selectedVersionId) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.snapshotCurrentVersion({ versionId: selectedVersionId });
    setMessage(response.result.ok ? "Snapshot saved to selected version." : response.result.error.message);
    await refresh();
    await hydrateProjectSnapshot();
  };

  const setStatus = async (status: ReviewStatus) => {
    if (!api || !selectedVersionId) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.setVersionStatus({
      versionId: selectedVersionId,
      status,
      reviewerLabel: "Local",
      comment: `Set ${status} from review panel.`
    });
    setMessage(response.result.ok ? `Version marked ${status}.` : response.result.error.message);
    await refresh();
    await hydrateProjectSnapshot();
  };

  const addAnnotation = async () => {
    if (!api || !annotationText.trim()) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.createAnnotation({
      frameIndex: currentFrame,
      timecode,
      text: annotationText.trim(),
      versionId: selectedVersionId,
      authorLabel: "Local",
      geometry: {
        type: "point",
        x: 0.5,
        y: 0.5,
        color: "#efcf95"
      }
    });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setAnnotationText("");
    setMessage("Annotation added.");
    await refresh();
    await hydrateProjectSnapshot();
  };

  const updateAnnotationStatus = async (annotationId: string, status: Annotation["status"]) => {
    if (!api) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.updateAnnotation({ annotationId, updates: { status } });
    setMessage(response.result.ok ? `Annotation ${status}.` : response.result.error.message);
    await refresh();
    await hydrateProjectSnapshot();
  };

  const exportReviewPackage = async () => {
    if (!api) return;
    if (!await syncProjectSnapshot()) return;
    const currentProject = projectRef.current;
    const stills: ReviewStillRef[] = galleryStills.map((still) => ({
      stillId: still.id,
      frameIndex: still.frameIndex,
      gradeVersionId: selectedVersionId,
      gradeVersionName: still.gradeName,
      dataUrl: still.thumbnail,
      width: currentProject.media?.displayWidth ?? 0,
      height: currentProject.media?.displayHeight ?? 0
    }));
    const response = await api.exportReviewPackage({
      versionIds: packageVersionIds,
      stillIds: stills.map((still) => still.stillId),
      scopeSnapshotIds: [],
      stills,
      scopeSnapshots: [],
      packageType: "client-review",
      packageName: `${currentProject.name}-review`,
      includeMedia: Boolean(currentProject.media),
      redactPaths: true
    });
    setMessage(response.result.ok ? `Review package exported: ${response.result.value.path}` : response.result.error.message);
  };

  const importFeedback = async () => {
    if (!api || !feedbackPath.trim()) return;
    if (!await syncProjectSnapshot()) return;
    const response = await api.importFeedback({ feedbackPath: feedbackPath.trim(), duplicateStrategy: "rename" });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setFeedbackResult(response.result.value);
    setMessage(`Imported ${response.result.value.imported} feedback notes.`);
    await refresh();
    await hydrateProjectSnapshot();
  };

  const estimateHandoff = async () => {
    if (!api) return;
    if (!await syncProjectSnapshot()) return;
    const currentProject = projectRef.current;
    const response = await api.estimateHandoffPackage({
      packageMode: "archive-with-media",
      includeMedia: Boolean(currentProject.media),
      includeCache: true,
      includeExports: true,
      includeLogs: true
    });
    if (!response.result.ok) {
      setMessage(response.result.error.message);
      return;
    }
    setHandoffEstimate(response.result.value);
  };

  const exportHandoff = async () => {
    if (!api) return;
    if (!await syncProjectSnapshot()) return;
    const currentProject = projectRef.current;
    const response = await api.exportHandoffPackage({
      packageMode: "archive-with-media",
      packageName: `${currentProject.name}-handoff`,
      includeMedia: Boolean(currentProject.media),
      includeCache: true,
      includeExports: true,
      includeLogs: true,
      redactPaths: true
    });
    setMessage(response.result.ok ? `Handoff exported: ${response.result.value.path}` : response.result.error.message);
  };

  return (
    <section className="review-workflow" aria-label="Review collaboration">
      <div className="review-workflow__row">
        <button type="button" onClick={createVersion}>New</button>
        <select value={reviewSelection} onChange={(event) => setReviewSelection(event.currentTarget.value as ReviewSelection)}>
          <option value="current">Current grade</option>
          <option value="all">All versions</option>
          {versions.map((version) => (
            <option key={version.id} value={`version:${version.id}`}>{version.name} - {version.status}</option>
          ))}
        </select>
      </div>
      <div className="review-workflow__row">
        <button type="button" onClick={snapshotVersion} disabled={!selectedVersionId}>Snapshot</button>
        <button type="button" onClick={() => setStatus("in-review")} disabled={!selectedVersionId}>Review</button>
        <button type="button" onClick={() => setStatus("approved")} disabled={!selectedVersionId}>Approve</button>
        <button type="button" onClick={() => setStatus("rejected")} disabled={!selectedVersionId}>Reject</button>
      </div>
      <div className="review-workflow__annotation">
        <input
          type="text"
          value={annotationText}
          onChange={(event) => setAnnotationText(event.currentTarget.value)}
          placeholder="Frame note"
          aria-label="Annotation text"
        />
        <button type="button" onClick={addAnnotation} disabled={!annotationText.trim()}>Add</button>
      </div>
      <div className="review-workflow__row">
        <select
          value={annotationFilter}
          onChange={(event) => setAnnotationFilter(event.currentTarget.value as AnnotationStatus | "active" | "all")}
          aria-label="Annotation filter"
        >
          <option value="active">Active</option>
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="deferred">Deferred</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="review-workflow__counts">{annotationCounts.open} open / {annotationCounts.deferred} deferred / {annotationCounts.resolved} resolved</span>
      </div>
      <div className="review-workflow__notes" role="list">
        {currentAnnotations.length === 0 ? (
          <p className="muted">No notes on this frame.</p>
        ) : currentAnnotations.slice(0, 3).map((annotation) => (
          <div className="review-note" key={annotation.id} role="listitem">
            <span>{annotation.text}</span>
            <div className="review-note__actions">
              <button type="button" onClick={() => updateAnnotationStatus(annotation.id, annotation.status === "resolved" ? "open" : "resolved")}>
                {annotation.status === "resolved" ? "Open" : "Resolve"}
              </button>
              <button type="button" onClick={() => updateAnnotationStatus(annotation.id, "deferred")}>Defer</button>
              <button type="button" onClick={() => updateAnnotationStatus(annotation.id, "rejected")}>Reject</button>
            </div>
          </div>
        ))}
      </div>
      <div className="review-workflow__row">
        <button type="button" onClick={exportReviewPackage} disabled={versions.length === 0}>Package</button>
        <button type="button" onClick={estimateHandoff}>Estimate</button>
        <button type="button" onClick={exportHandoff}>Handoff</button>
      </div>
      <div className="review-workflow__annotation">
        <input
          type="text"
          value={feedbackPath}
          onChange={(event) => setFeedbackPath(event.currentTarget.value)}
          placeholder="Feedback JSON path"
          aria-label="Feedback JSON path"
        />
        <button type="button" onClick={importFeedback} disabled={!feedbackPath.trim()}>Import</button>
      </div>
      {handoffEstimate ? <p className="muted">Estimate {formatBytes(handoffEstimate.estimatedBytes)}; missing {handoffEstimate.missingMedia.length}.</p> : null}
      {feedbackResult ? <p className="muted">Feedback: {feedbackResult.imported} imported, {feedbackResult.renamed} renamed, {feedbackResult.skipped} skipped.</p> : null}
      <p className="muted">{message}</p>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
