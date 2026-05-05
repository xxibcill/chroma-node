import { useCallback, useRef, useState } from "react";
import type { AppError, DecodedFrame, MediaRef } from "../../shared/ipc";
import type { ChromaProject } from "../../shared/project";
import { clampFrameIndex } from "../playback";
import { getPreviewPolicy } from "../../shared/previewPolicy";

interface UseMediaWorkflowOptions {
  project: ChromaProject;
  initialMessage?: string;
  onProjectChange: (updater: (current: ChromaProject) => ChromaProject) => void;
  onMediaChange: (media: MediaRef | undefined) => void;
  onStatusChange: (status: "idle" | "busy" | "ready" | "error", message: string, error?: AppError) => void;
  onFrameChange: (frame: DecodedFrame | undefined) => void;
}

interface UseMediaWorkflowResult {
  media: MediaRef | undefined;
  frame: DecodedFrame | undefined;
  projectPath: string | undefined;
  relinkState: {
    isRelinking: boolean;
    originalPath?: string;
    projectPath?: string;
    error?: AppError;
  };
  importMedia: () => Promise<void>;
  openProject: () => Promise<void>;
  saveProject: () => Promise<void>;
  relinkMedia: () => Promise<void>;
  cancelRelink: () => void;
  extractPreviewFrame: (media: MediaRef, frameIndex: number) => Promise<void>;
}

const api = window.chromaNode;

export function useMediaWorkflow({
  project,
  initialMessage = "Import an MP4 or MOV clip to start playback inspection.",
  onProjectChange,
  onMediaChange,
  onStatusChange,
  onFrameChange
}: UseMediaWorkflowOptions): UseMediaWorkflowResult {
  const [media, setMedia] = useState<MediaRef | undefined>(project.media);
  const [frame, setFrame] = useState<DecodedFrame | undefined>();
  const [projectPath, setProjectPath] = useState<string | undefined>();
  const [relinkState, setRelinkState] = useState<{
    isRelinking: boolean;
    originalPath?: string;
    projectPath?: string;
    error?: AppError;
  }>({ isRelinking: false });

  const frameRequestId = useRef(0);

  const extractPreviewFrame = useCallback(async (mediaRef: MediaRef, frameIndex: number) => {
    if (!api) return;

    const requestId = ++frameRequestId.current;
    const policy = getPreviewPolicy(mediaRef.displayWidth, mediaRef.displayHeight);
    const response = await api.extractFrame({
      sourcePath: mediaRef.sourcePath,
      frameIndex: clampFrameIndex(frameIndex, mediaRef),
      maxWidth: policy.maxWidth
    });

    if (requestId !== frameRequestId.current) return;

    const result = response.result;
    if (!result.ok) {
      onStatusChange("error", result.error.message, result.error);
      return;
    }

    setFrame(result.value);
    onFrameChange(result.value);
    onStatusChange("ready", `Decoded frame ${clampFrameIndex(frameIndex, mediaRef) + 1} (${policy.sourceDescription}).`);
  }, [onStatusChange, onFrameChange]);

  const importMedia = useCallback(async () => {
    if (!api) return;

    if (media && !window.confirm("Replace the current clip?")) return;

    frameRequestId.current += 1;
    onStatusChange("busy", "Selecting media...");
    const selection = await api.selectMedia();
    const selectionResult = selection.result;
    if (!selectionResult.ok) {
      onStatusChange(media ? "ready" : "idle", selectionResult.error.code === "USER_CANCELLED" ? (media ? "Import cancelled." : initialMessage) : selectionResult.error.message, selectionResult.error.code === "USER_CANCELLED" ? undefined : selectionResult.error);
      return;
    }

    onStatusChange("busy", "Probing media metadata...");
    const probe = await api.probeMedia({ sourcePath: selectionResult.value.sourcePath });
    const probeResult = probe.result;
    if (!probeResult.ok) {
      onStatusChange("error", probeResult.error.message, probeResult.error);
      return;
    }

    const probedMedia = probeResult.value;
    setMedia(probedMedia);
    onMediaChange(probedMedia);
    onProjectChange((current) => ({
      ...current,
      name: probedMedia.fileName,
      media: probedMedia,
      playback: { ...current.playback, currentFrame: 0 }
    }));

    onStatusChange("busy", "Extracting first frame...");
    const policy = getPreviewPolicy(probedMedia.displayWidth, probedMedia.displayHeight);
    const frameResponse = await api.extractFrame({ sourcePath: probedMedia.sourcePath, frameIndex: 0, maxWidth: policy.maxWidth });
    const frameResult = frameResponse.result;
    if (!frameResult.ok) {
      onStatusChange("error", frameResult.error.message, frameResult.error);
      return;
    }

    setFrame(frameResult.value);
    onFrameChange(frameResult.value);
    onStatusChange("ready", `Clip imported${policy.isProxy ? " (proxy preview)" : ""}. Viewer is ready for playback.`);
  }, [initialMessage, media, onMediaChange, onProjectChange, onStatusChange, onFrameChange]);

  const saveProject = useCallback(async () => {
    if (!api) return;

    onStatusChange("busy", "Saving project...");
    const snapshot = {
      ...project,
      media: media ?? project.media
    };
    const response = await api.saveProject({ project: snapshot, projectPath });
    const result = response.result;
    if (!result.ok) {
      onStatusChange(media ? "ready" : "idle", result.error.code === "USER_CANCELLED" ? "Save cancelled." : result.error.message, result.error.code === "USER_CANCELLED" ? undefined : result.error);
      return;
    }

    setProjectPath(result.value.projectPath);
    onStatusChange(media ? "ready" : "idle", "Project saved.");
  }, [media, project, projectPath, onStatusChange]);

  const openProject = useCallback(async () => {
    if (!api) return;

    onStatusChange("busy", "Opening project...");
    const response = await api.openProject();
    const result = response.result;
    if (!result.ok) {
      onStatusChange(media ? "ready" : "idle", result.error.code === "USER_CANCELLED" ? "Open cancelled." : result.error.message, result.error.code === "USER_CANCELLED" ? undefined : result.error);
      return;
    }

    const openedProject = result.value.project;
    const openedPath = result.value.projectPath;
    const currentFrame = openedProject.media ? clampFrameIndex(openedProject.playback.currentFrame, openedProject.media) : 0;

    onProjectChange(() => openedProject);
    if (openedProject.media) {
      setMedia(openedProject.media);
      onMediaChange(openedProject.media);
    } else {
      setMedia(undefined);
      onMediaChange(undefined);
    }
    setFrame(undefined);
    onFrameChange(undefined);
    setProjectPath(openedPath);

    if (!openedProject.media) {
      onStatusChange("ready", "Project loaded.");
      return;
    }

    if (result.value.missingMedia) {
      setRelinkState({
        isRelinking: true,
        originalPath: result.value.missingMediaPath,
        projectPath: openedPath
      });
      onStatusChange("error", "Project loaded, but media is missing.", {
        code: "FILE_NOT_FOUND",
        message: "Project media is missing.",
        detail: result.value.missingMediaPath
      });
      return;
    }

    onStatusChange("ready", "Project loaded.");
    void extractPreviewFrame(openedProject.media, currentFrame);
  }, [media, onMediaChange, onProjectChange, onStatusChange, onFrameChange, extractPreviewFrame]);

  const relinkMedia = useCallback(async () => {
    if (!api || !relinkState.originalPath) return;

    onStatusChange("busy", "Selecting replacement media...");
    const selection = await api.selectMedia();
    const selectionResult = selection.result;
    if (!selectionResult.ok) {
      onStatusChange("error", selectionResult.error.code === "USER_CANCELLED" ? "Relink cancelled." : selectionResult.error.message, selectionResult.error.code === "USER_CANCELLED" ? undefined : selectionResult.error);
      return;
    }

    onStatusChange("busy", "Validating replacement media...");
    const relinkResult = await api.relinkMedia({
      originalPath: relinkState.originalPath,
      replacementPath: selectionResult.value.sourcePath
    });

    if (!relinkResult.ok) {
      setRelinkState((current) => ({ ...current, error: relinkResult.error }));
      onStatusChange("error", relinkResult.error.message, relinkResult.error);
      return;
    }

    const relinkedMedia = relinkResult.media;
    const currentFrame = clampFrameIndex(project.playback.currentFrame, relinkedMedia);
    onProjectChange((current) => ({
      ...current,
      media: relinkedMedia,
      playback: { ...current.playback, currentFrame }
    }));
    setMedia(relinkedMedia);
    onMediaChange(relinkedMedia);
    setRelinkState({ isRelinking: false });
    onStatusChange("ready", "Media relinked. Project restored.");
    void extractPreviewFrame(relinkedMedia, currentFrame);
  }, [onProjectChange, onMediaChange, onStatusChange, project.playback.currentFrame, relinkState.originalPath, extractPreviewFrame]);

  const cancelRelink = useCallback(() => {
    setRelinkState({ isRelinking: false });
    onStatusChange(media ? "ready" : "idle", media ? "Ready." : initialMessage);
  }, [media, initialMessage, onStatusChange]);

  return {
    media,
    frame,
    projectPath,
    relinkState,
    importMedia,
    openProject,
    saveProject,
    relinkMedia,
    cancelRelink,
    extractPreviewFrame
  };
}