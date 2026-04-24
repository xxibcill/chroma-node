import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUndoRedo } from "./state/useUndoRedo";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AppError, DecodedFrame, ExportJobResult, ExportProgress, ExportQuality, FfmpegDiagnostics, MediaRef } from "../shared/ipc";
import type { ColorNode, HslQualifier, PowerWindow, PowerWindowShape, RgbVector, TrackingKeyframe } from "../shared/colorEngine";
import {
  MAX_SERIAL_NODES,
  PRIMARY_RANGES,
  QUALIFIER_RANGES,
  WINDOW_RANGES,
  clampNumber,
  createColorNode,
  createDefaultPowerWindows,
  createNeutralPrimaries,
  invalidateTrackingForWindow,
  resolveTrackedNode
} from "../shared/colorEngine";
import type { ChromaProject, ViewerMode } from "../shared/project";
import { createDefaultProject, sanitizeProject } from "../shared/project";
import {
  createGradedScopeFrame,
  createVectorscopeGuides,
  createVectorscopeHistogram,
  createWaveformHistogram
} from "./scopes/scopeAnalysis";
import type { RgbaFrame } from "./scopes/scopeAnalysis";
import { clearScopeCanvas, drawVectorscope, drawWaveformScope } from "./scopes/scopeRender";
import {
  clampFrameIndex,
  formatTimecode,
  frameToTimeSeconds,
  getLastFrameIndex,
  getTotalFrameCount,
  timeToFrameIndex
} from "./playback";
import type { LumaFrame } from "./tracking/templateTracker";
import { TrackingFailure, getScaledSearchRadius, matchTranslation } from "./tracking/templateTracker";
import { FrameRenderer } from "./webgl/FrameRenderer";

type Status = "idle" | "busy" | "ready" | "error";
type RgbPrimaryKey = "lift" | "gamma" | "gain" | "offset";
type ScalarPrimaryKey = "contrast" | "pivot" | "saturation" | "temperature" | "tint";
type QualifierScalarKey = keyof Omit<HslQualifier, "enabled" | "invert">;
type WindowScalarKey = keyof Omit<PowerWindow, "enabled" | "invert">;
type RgbChannel = keyof RgbVector;

interface UiState {
  status: Status;
  message: string;
  media?: MediaRef;
  frame?: DecodedFrame;
  exportResult?: ExportJobResult;
  error?: AppError;
  projectPath?: string;
}

interface RelinkState {
  isRelinking: boolean;
  originalPath?: string;
  projectPath?: string;
  error?: AppError;
}

interface PlaybackState {
  isPlaying: boolean;
  isScrubbing: boolean;
  currentFrame: number;
  viewerMode: ViewerMode;
  splitPosition: number;
}

type TrackingDirection = "forward" | "backward";

interface TrackingOperation {
  id: number;
  direction: TrackingDirection;
  targetShape: PowerWindowShape;
  currentFrame: number;
  completedFrames: number;
  totalFrames: number;
  message: string;
}

const api = window.chromaNode;
const initialProject = createDefaultProject();
const initialMessage = "Import an MP4 or MOV clip to start playback inspection.";
const scopeDebounceMs = 50;
const playbackScopeIntervalMs = 1000 / 15;
const pausedScopeMaxWidth = 1280;
const playbackScopeMaxWidth = 640;
const waveformHistogramSize = { width: 320, height: 160 };
const vectorscopeHistogramSize = 220;

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vectorscopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<FrameRenderer | null>(null);
  const frameRequestId = useRef(0);
  const scopeRequestId = useRef(0);
  const trackingRequestId = useRef(0);
  const cancelledTrackingIds = useRef(new Set<number>());
  const scopeDebounceTimer = useRef<number | undefined>(undefined);
  const scopeImageCache = useRef<{ dataUrl: string; image: HTMLImageElement } | undefined>(undefined);
  const [diagnostics, setDiagnostics] = useState<FfmpegDiagnostics | undefined>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [showMatte, setShowMatte] = useState(false);
  const [scopeInfo, setScopeInfo] = useState("Scopes waiting for a graded frame.");
  const [trackingOperation, setTrackingOperation] = useState<TrackingOperation | undefined>();
  const [exportOperation, setExportOperation] = useState<ExportProgress | undefined>();
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const [project, setProject] = useState<ChromaProject>(initialProject);
  const [selectedNodeId, setSelectedNodeId] = useState(initialProject.nodes[0].id);
  const { canUndo, canRedo, pushHistory, undo, redo } = useUndoRedo();
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    isScrubbing: false,
    currentFrame: initialProject.playback.currentFrame,
    viewerMode: initialProject.playback.viewerMode,
    splitPosition: initialProject.playback.splitPosition
  });
  const [state, setState] = useState<UiState>({
    status: "idle",
    message: initialMessage
  });
  const [relinkState, setRelinkState] = useState<RelinkState>({ isRelinking: false });

  const mediaUrl = useMemo(() => (state.media ? filePathToUrl(state.media.sourcePath) : undefined), [state.media]);
  const totalFrames = useMemo(() => getTotalFrameCount(state.media), [state.media]);
  const lastFrameIndex = useMemo(() => getLastFrameIndex(state.media), [state.media]);
  const timecode = useMemo(() => formatTimecode(playback.currentFrame, state.media), [playback.currentFrame, state.media]);
  const canUseMedia = Boolean(state.media);
  const isExporting = exportOperation?.state === "pending" || exportOperation?.state === "running";
  const activeNode = useMemo(
    () => project.nodes.find((node) => node.id === selectedNodeId) ?? project.nodes[0],
    [project.nodes, selectedNodeId]
  );
  const activeNodeIndex = useMemo(
    () => project.nodes.findIndex((node) => node.id === activeNode?.id),
    [activeNode?.id, project.nodes]
  );
  const resolvedActiveNode = useMemo(
    () => resolveTrackedNode(activeNode, playback.currentFrame),
    [activeNode, playback.currentFrame]
  );
  const viewerSourceRect = useMemo(
    () => getContainedRect(
      viewerSize.width,
      viewerSize.height,
      state.media?.width ?? state.frame?.width ?? 1,
      state.media?.height ?? state.frame?.height ?? 1
    ),
    [state.frame?.height, state.frame?.width, state.media?.height, state.media?.width, viewerSize.height, viewerSize.width]
  );

  const diagnosticsLabel = useMemo(() => {
    if (!diagnostics) {
      return "Checking FFmpeg";
    }

    return diagnostics.available ? "FFmpeg ready" : "FFmpeg unavailable";
  }, [diagnostics]);

  const buildProjectSnapshot = useCallback((): ChromaProject => {
    return sanitizeProject({
      ...project,
      media: state.media ?? project.media,
      playback: {
        currentFrame: playback.currentFrame,
        viewerMode: playback.viewerMode,
        splitPosition: playback.splitPosition
      }
    });
  }, [playback.currentFrame, playback.splitPosition, playback.viewerMode, project, state.media]);

  const commitProject = useCallback((updater: (current: ChromaProject) => ChromaProject) => {
    const snapshot = buildProjectSnapshot();
    pushHistory(snapshot);
    setProject((current) => sanitizeProject(updater(current)));
  }, [buildProjectSnapshot, pushHistory]);

  const seekVideoToFrame = useCallback((frameIndex: number, media = state.media) => {
    const video = videoRef.current;
    if (!video || !media) {
      return;
    }

    video.currentTime = frameToTimeSeconds(frameIndex, media);
  }, [state.media]);

  const loadScopeImage = useCallback(async (dataUrl: string): Promise<HTMLImageElement> => {
    if (scopeImageCache.current?.dataUrl === dataUrl) {
      return scopeImageCache.current.image;
    }

    const image = await loadImage(dataUrl);
    scopeImageCache.current = { dataUrl, image };
    return image;
  }, []);

  const runScopeAnalysis = useCallback(async (isPlaybackSample: boolean) => {
    const waveformCanvas = waveformCanvasRef.current;
    const vectorscopeCanvas = vectorscopeCanvasRef.current;
    if (!waveformCanvas || !vectorscopeCanvas) {
      return;
    }

    const requestId = ++scopeRequestId.current;
    const maxWidth = isPlaybackSample ? playbackScopeMaxWidth : pausedScopeMaxWidth;

    try {
      let sourceFrame: RgbaFrame | undefined;

      if (isPlaybackSample) {
        const video = videoRef.current;
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          sourceFrame = captureScopeFrame(video, video.videoWidth, video.videoHeight, maxWidth);
        }
      }

      if (!sourceFrame && state.frame) {
        const image = await loadScopeImage(state.frame.dataUrl);
        if (requestId !== scopeRequestId.current) {
          return;
        }
        sourceFrame = captureScopeFrame(image, state.frame.width || image.naturalWidth, state.frame.height || image.naturalHeight, maxWidth);
      }

      if (!sourceFrame) {
        clearScopeCanvas(waveformCanvas, "No frame");
        clearScopeCanvas(vectorscopeCanvas, "No frame");
        setScopeInfo("Scopes waiting for a graded frame.");
        return;
      }

      const startedAt = performance.now();
      const gradedFrame = createGradedScopeFrame(sourceFrame, project.nodes);
      const waveform = createWaveformHistogram(gradedFrame, waveformHistogramSize.width, waveformHistogramSize.height);
      const vectorscope = createVectorscopeHistogram(gradedFrame, vectorscopeHistogramSize);
      const guides = createVectorscopeGuides(vectorscopeHistogramSize);

      if (requestId !== scopeRequestId.current) {
        return;
      }

      drawWaveformScope(waveformCanvas, waveform);
      drawVectorscope(vectorscopeCanvas, vectorscope, guides);
      setScopeInfo(`${gradedFrame.width} x ${gradedFrame.height} sample, ${Math.round(performance.now() - startedAt)} ms`);
    } catch (error) {
      if (requestId !== scopeRequestId.current) {
        return;
      }

      clearScopeCanvas(waveformCanvas, "Scope error");
      clearScopeCanvas(vectorscopeCanvas, "Scope error");
      setScopeInfo(error instanceof Error ? error.message : "Scope analysis failed.");
    }
  }, [loadScopeImage, project.nodes, state.frame]);

  const scheduleScopeAnalysis = useCallback((isPlaybackSample: boolean) => {
    if (scopeDebounceTimer.current !== undefined) {
      window.clearTimeout(scopeDebounceTimer.current);
      scopeDebounceTimer.current = undefined;
    }

    if (isPlaybackSample) {
      void runScopeAnalysis(true);
      return;
    }

    scopeDebounceTimer.current = window.setTimeout(() => {
      scopeDebounceTimer.current = undefined;
      void runScopeAnalysis(false);
    }, scopeDebounceMs);
  }, [runScopeAnalysis]);

  const extractPreviewFrame = useCallback(async (media: MediaRef, frameIndex: number) => {
    if (!api) {
      return;
    }

    const requestId = ++frameRequestId.current;
    setPreviewBusy(true);
    const response = await api.extractFrame({
      sourcePath: media.sourcePath,
      frameIndex: clampFrameIndex(frameIndex, media),
      maxWidth: 1920
    });

    if (requestId !== frameRequestId.current) {
      return;
    }

    const result = response.result;
    setPreviewBusy(false);

    if (!result.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: result.error.message,
        error: result.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "ready",
      frame: result.value,
      message: `Decoded frame ${clampFrameIndex(frameIndex, media) + 1}.`,
      error: undefined
    }));
  }, []);

  const fetchTrackingFrame = useCallback(async (media: MediaRef, frameIndex: number): Promise<LumaFrame> => {
    if (!api) {
      throw new Error("Electron preload API is unavailable.");
    }

    const targetFrame = clampFrameIndex(frameIndex, media);
    const response = await api.extractFrame({
      sourcePath: media.sourcePath,
      frameIndex: targetFrame,
      maxWidth: 640
    });
    const result = response.result;

    if (!result.ok) {
      throw new Error(`Frame access failed for ${media.sourcePath} at frame ${targetFrame + 1}: ${result.error.message}`);
    }

    return decodedFrameToLumaFrame(result.value);
  }, []);

  const commitTrackingKeyframes = useCallback((
    nodeId: string,
    targetShape: PowerWindowShape,
    keyframes: TrackingKeyframe[],
    trackingState: "ready" | "failed",
    failure?: { frame: number; reason: string }
  ) => {
    commitProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        return {
          ...node,
          tracking: {
            targetShape,
            keyframes,
            state: trackingState,
            failureFrame: failure?.frame,
            failureReason: failure?.reason
          }
        };
      })
    }));
  }, [commitProject]);

  const runWindowTracking = useCallback(async (direction: TrackingDirection) => {
    if (!state.media || !activeNode || trackingOperation) {
      return;
    }

    const media = state.media;
    const nodeId = activeNode.id;
    const targetShape = activeNode.tracking.targetShape;
    const baseWindow = activeNode.windows[targetShape];
    const startFrame = clampFrameIndex(playback.currentFrame, media);
    const step = direction === "forward" ? 1 : -1;
    const finalFrame = direction === "forward" ? lastFrameIndex : 0;
    const totalSteps = Math.abs(finalFrame - startFrame);

    if (!baseWindow.enabled) {
      setState((current) => ({
        ...current,
        status: "error",
        message: `Enable the ${targetShape} window before tracking.`,
        error: {
          code: "TRACKING_FAILED",
          message: `Enable the ${targetShape} window before tracking.`
        }
      }));
      return;
    }

    if (totalSteps === 0) {
      setState((current) => ({
        ...current,
        status: "ready",
        message: "Tracking needs at least one adjacent frame.",
        error: undefined
      }));
      return;
    }

    const requestId = ++trackingRequestId.current;
    cancelledTrackingIds.current.delete(requestId);
    videoRef.current?.pause();
    rendererRef.current?.setPlaybackActive(false);
    setPlayback((current) => ({ ...current, isPlaying: false, isScrubbing: false }));
    setTrackingOperation({
      id: requestId,
      direction,
      targetShape,
      currentFrame: startFrame,
      completedFrames: 0,
      totalFrames: totalSteps,
      message: `Tracking ${targetShape} ${direction} from frame ${startFrame + 1}.`
    });
    setState((current) => ({ ...current, status: "ready", message: "Tracking started.", error: undefined }));

    const keyframes: TrackingKeyframe[] = [{ frame: startFrame, dx: 0, dy: 0, confidence: 1 }];
    let accumulatedDx = 0;
    let accumulatedDy = 0;

    try {
      let sourceFrame = await fetchTrackingFrame(media, startFrame);

      for (
        let frameIndex = startFrame + step, completed = 1;
        direction === "forward" ? frameIndex <= finalFrame : frameIndex >= finalFrame;
        frameIndex += step, completed += 1
      ) {
        if (cancelledTrackingIds.current.has(requestId) || requestId !== trackingRequestId.current) {
          setTrackingOperation(undefined);
          setState((current) => ({ ...current, status: "ready", message: "Tracking cancelled.", error: undefined }));
          return;
        }

        setTrackingOperation({
          id: requestId,
          direction,
          targetShape,
          currentFrame: frameIndex,
          completedFrames: completed - 1,
          totalFrames: totalSteps,
          message: `Tracking frame ${frameIndex + 1}.`
        });

        const targetFrame = await fetchTrackingFrame(media, frameIndex);
        const translatedWindow = {
          ...baseWindow,
          centerX: baseWindow.centerX + accumulatedDx / sourceFrame.width,
          centerY: baseWindow.centerY + accumulatedDy / sourceFrame.height
        };
        const match = matchTranslation(sourceFrame, targetFrame, translatedWindow, frameIndex, {
          searchRadiusPx: getScaledSearchRadius(sourceFrame.width, sourceFrame.height),
          minTemplateSizePx: 12,
          minTextureStandardDeviation: 2
        });

        if (match.confidence < 0.55) {
          throw new TrackingFailure(
            frameIndex,
            "low-confidence",
            `Tracking confidence dropped to ${match.confidence.toFixed(2)} at frame ${frameIndex + 1}.`
          );
        }

        accumulatedDx += match.dxPx;
        accumulatedDy += match.dyPx;
        keyframes.push({
          frame: frameIndex,
          dx: accumulatedDx / targetFrame.width,
          dy: accumulatedDy / targetFrame.height,
          confidence: match.confidence
        });
        sourceFrame = targetFrame;

        setTrackingOperation({
          id: requestId,
          direction,
          targetShape,
          currentFrame: frameIndex,
          completedFrames: completed,
          totalFrames: totalSteps,
          message: `Tracked ${completed} / ${totalSteps} frames.`
        });
      }

      commitTrackingKeyframes(nodeId, targetShape, keyframes, "ready");
      setTrackingOperation(undefined);
      setState((current) => ({
        ...current,
        status: "ready",
        message: `Tracking complete: ${keyframes.length} keyframes written.`,
        error: undefined
      }));
    } catch (error) {
      const failureFrame = error instanceof TrackingFailure ? error.frame : playback.currentFrame;
      const failureReason = error instanceof Error ? error.message : "Tracking failed.";

      if (keyframes.length > 1) {
        commitTrackingKeyframes(nodeId, targetShape, keyframes, "failed", {
          frame: failureFrame,
          reason: failureReason
        });
      }

      setTrackingOperation(undefined);
      setState((current) => ({
        ...current,
        status: "error",
        message: failureReason,
        error: {
          code: "TRACKING_FAILED",
          message: failureReason,
          detail: `Frame ${failureFrame + 1}`
        }
      }));
    } finally {
      cancelledTrackingIds.current.delete(requestId);
    }
  }, [
    activeNode,
    commitTrackingKeyframes,
    fetchTrackingFrame,
    lastFrameIndex,
    playback.currentFrame,
    state.media,
    trackingOperation
  ]);

  const cancelTracking = useCallback(() => {
    if (!trackingOperation) {
      return;
    }

    cancelledTrackingIds.current.add(trackingOperation.id);
    setTrackingOperation((current) => current ? { ...current, message: "Cancelling tracking..." } : current);
  }, [trackingOperation]);

  const commitFrame = useCallback(
    (frameIndex: number) => {
      if (!state.media) {
        return;
      }

      const targetFrame = clampFrameIndex(frameIndex, state.media);
      videoRef.current?.pause();
      rendererRef.current?.setPlaybackActive(false);
      seekVideoToFrame(targetFrame, state.media);
      setPlayback((current) => ({
        ...current,
        isPlaying: false,
        isScrubbing: false,
        currentFrame: targetFrame
      }));
      void extractPreviewFrame(state.media, targetFrame);
    },
    [extractPreviewFrame, seekVideoToFrame, state.media]
  );

  const importMedia = useCallback(async () => {
    if (!api) {
      return;
    }

    if (state.media && !window.confirm("Replace the current clip?")) {
      return;
    }

    frameRequestId.current += 1;
    videoRef.current?.pause();
    rendererRef.current?.setPlaybackActive(false);
    setPreviewBusy(false);
    setPlayback((current) => ({ ...current, isPlaying: false, isScrubbing: false, currentFrame: 0 }));
    setState((current) => ({ ...current, status: "busy", message: "Selecting media...", error: undefined }));
    const selection = await api.selectMedia();
    const selectionResult = selection.result;
    if (!selectionResult.ok) {
      setState((current) => ({
        ...current,
        status: current.media ? "ready" : "idle",
        message: selectionResult.error.code === "USER_CANCELLED" ? (current.media ? "Import cancelled." : initialMessage) : selectionResult.error.message,
        error: selectionResult.error.code === "USER_CANCELLED" ? undefined : selectionResult.error
      }));
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Probing media metadata..." }));
    const probe = await api.probeMedia({ sourcePath: selectionResult.value.sourcePath });
    const probeResult = probe.result;
    if (!probeResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: probeResult.error.message,
        error: probeResult.error
      }));
      return;
    }

    const media = probeResult.value;
    setPlayback((current) => ({
      ...current,
      isPlaying: false,
      isScrubbing: false,
      currentFrame: 0
    }));
    commitProject((current) => ({
      ...current,
      name: media.fileName,
      media,
      playback: {
        ...current.playback,
        currentFrame: 0
      }
    }));
    setState((current) => ({
      ...current,
      status: "busy",
      media,
      frame: undefined,
      message: "Extracting first frame...",
      error: undefined
    }));

    const frame = await api.extractFrame({ sourcePath: media.sourcePath, frameIndex: 0, maxWidth: 1920 });
    const frameResult = frame.result;
    if (!frameResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        media,
        message: frameResult.error.message,
        error: frameResult.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "ready",
      message: "Clip imported. Viewer is ready for playback.",
      media,
      frame: frameResult.value,
      error: undefined
    }));
  }, [commitProject, state.media]);

  const saveProject = useCallback(async () => {
    if (!api) {
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Saving project...", error: undefined }));
    const response = await api.saveProject({
      project: buildProjectSnapshot(),
      projectPath: state.projectPath
    });
    const result = response.result;
    if (!result.ok) {
      setState((current) => ({
        ...current,
        status: current.media ? "ready" : "idle",
        message: result.error.code === "USER_CANCELLED" ? current.message : result.error.message,
        error: result.error.code === "USER_CANCELLED" ? undefined : result.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: current.media ? "ready" : "idle",
      projectPath: result.value.projectPath,
      message: "Project saved.",
      error: undefined
    }));
  }, [buildProjectSnapshot, state.projectPath]);

  const openProject = useCallback(async () => {
    if (!api) {
      return;
    }

    videoRef.current?.pause();
    rendererRef.current?.setPlaybackActive(false);
    setState((current) => ({ ...current, status: "busy", message: "Opening project...", error: undefined }));
    const response = await api.openProject();
    const result = response.result;
    if (!result.ok) {
      setState((current) => ({
        ...current,
        status: current.media ? "ready" : "idle",
        message: result.error.code === "USER_CANCELLED" ? current.message : result.error.message,
        error: result.error.code === "USER_CANCELLED" ? undefined : result.error
      }));
      return;
    }

    const openedProject = result.value.project;
    const currentFrame = openedProject.media ? clampFrameIndex(openedProject.playback.currentFrame, openedProject.media) : 0;
    setProject(openedProject);
    setSelectedNodeId(openedProject.nodes[0].id);
    setShowMatte(false);
    setPlayback({
      isPlaying: false,
      isScrubbing: false,
      currentFrame,
      viewerMode: openedProject.playback.viewerMode,
      splitPosition: openedProject.playback.splitPosition
    });

    if (!openedProject.media) {
      setState({
        status: "ready",
        message: "Project loaded.",
        projectPath: result.value.projectPath
      });
      return;
    }

    if (result.value.missingMedia) {
      setState({
        status: "error",
        message: "Project loaded, but media is missing.",
        projectPath: result.value.projectPath,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Project media is missing.",
          detail: result.value.missingMediaPath
        }
      });
      setRelinkState({
        isRelinking: true,
        originalPath: result.value.missingMediaPath,
        projectPath: result.value.projectPath
      });
      return;
    }

    setState({
      status: "ready",
      message: "Project loaded.",
      media: openedProject.media,
      projectPath: result.value.projectPath
    });
    void extractPreviewFrame(openedProject.media, currentFrame);
  }, [extractPreviewFrame]);

  const relinkMedia = useCallback(async () => {
    if (!api || !relinkState.originalPath) {
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Selecting replacement media...", error: undefined }));
    const selection = await api.selectMedia();
    const selectionResult = selection.result;
    if (!selectionResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: selectionResult.error.code === "USER_CANCELLED" ? "Relink cancelled." : selectionResult.error.message,
        error: selectionResult.error.code === "USER_CANCELLED" ? undefined : selectionResult.error
      }));
      return;
    }

    setState((current) => ({ ...current, status: "busy", message: "Validating replacement media...", error: undefined }));
    const relinkResult = await api.relinkMedia({
      originalPath: relinkState.originalPath,
      replacementPath: selectionResult.value.sourcePath
    });

    if (!relinkResult.ok) {
      setRelinkState((current) => ({
        ...current,
        error: relinkResult.error
      }));
      setState((current) => ({
        ...current,
        status: "error",
        message: relinkResult.error.message,
        error: relinkResult.error
      }));
      return;
    }

    const currentFrame = clampFrameIndex(project.playback.currentFrame, relinkResult.media);
    commitProject((current) => ({
      ...current,
      media: relinkResult.media,
      playback: {
        ...current.playback,
        currentFrame
      }
    }));
    setState((current) => ({
      ...current,
      status: "ready",
      message: "Media relinked. Project restored.",
      media: relinkResult.media,
      error: undefined
    }));
    setRelinkState({ isRelinking: false });
    void extractPreviewFrame(relinkResult.media, currentFrame);
  }, [api, commitProject, project.playback.currentFrame, relinkState.originalPath, extractPreviewFrame]);

  const cancelRelink = useCallback(() => {
    setRelinkState({ isRelinking: false });
    setState((current) => ({
      ...current,
      status: current.media ? "ready" : "idle",
      message: current.media ? "Ready." : initialMessage,
      error: undefined
    }));
  }, []);

  const runProjectExport = useCallback(async () => {
    if (!api || !state.media || isExporting) {
      return;
    }

    videoRef.current?.pause();
    rendererRef.current?.setPlaybackActive(false);
    setPlayback((current) => ({ ...current, isPlaying: false }));
    setExportOperation(undefined);
    setState((current) => ({ ...current, status: "busy", message: "Exporting graded H.264 MP4...", error: undefined }));
    const snapshot = buildProjectSnapshot();
    const exportResponse = await api.startExport({
      project: snapshot,
      quality: snapshot.exportSettings.quality
    });
    const exportResult = exportResponse.result;
    if (!exportResult.ok) {
      const wasCancelled = exportResult.error.code === "EXPORT_CANCELLED" || exportResult.error.code === "USER_CANCELLED";
      setState((current) => ({
        ...current,
        status: current.media ? "ready" : "idle",
        message: wasCancelled ? "Export cancelled." : exportResult.error.message,
        error: wasCancelled ? undefined : exportResult.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "ready",
      message: "H.264 export completed.",
      exportResult: exportResult.value,
      error: undefined
    }));
  }, [buildProjectSnapshot, isExporting, state.media]);

  const cancelProjectExport = useCallback(async () => {
    if (!api || !exportOperation) {
      return;
    }

    setExportOperation((current) => current ? { ...current, message: "Cancelling export..." } : current);
    const response = await api.cancelExport({ jobId: exportOperation.jobId });
    const result = response.result;
    if (!result.ok) {
      setState((current) => ({
        ...current,
        status: current.media ? "ready" : "idle",
        message: result.error.message,
        error: result.error
      }));
      return;
    }

    setExportOperation(result.value);
  }, [exportOperation]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || !state.media) {
      return;
    }

    if (video.paused) {
      void video.play().catch((error: unknown) => {
        setState((current) => ({
          ...current,
          status: "error",
          message: "Video playback could not start.",
          error: {
            code: "UNKNOWN",
            message: "Video playback could not start.",
            detail: String(error)
          }
        }));
      });
    } else {
      video.pause();
    }
  }, [state.media]);

  const handleScrubChange = useCallback(
    (value: string) => {
      if (!state.media) {
        return;
      }

      const frameIndex = clampFrameIndex(Number(value), state.media);
      setPlayback((current) => ({
        ...current,
        isScrubbing: true,
        currentFrame: frameIndex
      }));
      seekVideoToFrame(frameIndex, state.media);
    },
    [seekVideoToFrame, state.media]
  );

  const commitScrub = useCallback(() => {
    if (playback.isScrubbing) {
      commitFrame(playback.currentFrame);
    }
  }, [commitFrame, playback.currentFrame, playback.isScrubbing]);

  const addNode = useCallback(() => {
    if (project.nodes.length >= MAX_SERIAL_NODES) {
      return;
    }

    const nextNode = createUniqueNode(project.nodes);
    commitProject((current) => ({
      ...current,
      nodes: [...current.nodes, nextNode]
    }));
    setSelectedNodeId(nextNode.id);
  }, [commitProject, project.nodes]);

  const deleteActiveNode = useCallback(() => {
    if (!activeNode || project.nodes.length <= 1) {
      return;
    }

    const index = project.nodes.findIndex((node) => node.id === activeNode.id);
    const nextNodes = project.nodes.filter((node) => node.id !== activeNode.id);
    const nextSelection = nextNodes[Math.min(index, nextNodes.length - 1)]?.id ?? nextNodes[0]?.id;
    commitProject((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== activeNode.id)
    }));
    if (nextSelection) {
      setSelectedNodeId(nextSelection);
    }
  }, [activeNode, commitProject, project.nodes]);

  const updateActiveNode = useCallback((updater: (node: ColorNode) => ColorNode) => {
    if (!activeNode) {
      return;
    }

    commitProject((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === activeNode.id ? updater(node) : node))
    }));
  }, [activeNode, commitProject]);

  const updateRgbPrimary = useCallback((key: RgbPrimaryKey, channel: RgbChannel, value: number) => {
    updateActiveNode((node) => ({
      ...node,
      primaries: {
        ...node.primaries,
        [key]: {
          ...node.primaries[key],
          [channel]: clampNumber(value, PRIMARY_RANGES[key])
        }
      }
    }));
  }, [updateActiveNode]);

  const updateScalarPrimary = useCallback((key: ScalarPrimaryKey, value: number) => {
    updateActiveNode((node) => ({
      ...node,
      primaries: {
        ...node.primaries,
        [key]: clampNumber(value, PRIMARY_RANGES[key])
      }
    }));
  }, [updateActiveNode]);

  const updateQualifierScalar = useCallback((key: QualifierScalarKey, value: number) => {
    updateActiveNode((node) => ({
      ...node,
      qualifier: {
        ...node.qualifier,
        [key]: clampNumber(value, QUALIFIER_RANGES[key])
      }
    }));
  }, [updateActiveNode]);

  const updatePowerWindow = useCallback((shape: PowerWindowShape, updater: (window: PowerWindow) => PowerWindow) => {
    if (trackingOperation) {
      return;
    }

    updateActiveNode((node) => ({
      ...invalidateTrackingForWindow(node, shape),
      windows: {
        ...node.windows,
        [shape]: updater(node.windows[shape])
      }
    }));
  }, [trackingOperation, updateActiveNode]);

  const updatePowerWindowScalar = useCallback((shape: PowerWindowShape, key: WindowScalarKey, value: number) => {
    updatePowerWindow(shape, (window) => ({
      ...window,
      [key]: clampNumber(value, WINDOW_RANGES[key])
    }));
  }, [updatePowerWindow]);

  const resetPrimary = useCallback((key: RgbPrimaryKey | ScalarPrimaryKey) => {
    const neutral = createNeutralPrimaries();
    updateActiveNode((node) => ({
      ...node,
      primaries: {
        ...node.primaries,
        [key]: neutral[key]
      }
    }));
  }, [updateActiveNode]);

  const resetWindows = useCallback(() => {
    if (trackingOperation) {
      return;
    }

    updateActiveNode((node) => ({
      ...invalidateTrackingForWindow(invalidateTrackingForWindow(node, "ellipse"), "rectangle"),
      windows: createDefaultPowerWindows()
    }));
  }, [trackingOperation, updateActiveNode]);

  const setTrackingTarget = useCallback((targetShape: PowerWindowShape) => {
    if (trackingOperation) {
      return;
    }

    updateActiveNode((node) => {
      if (node.tracking.targetShape === targetShape) {
        return node;
      }

      return {
        ...node,
        tracking: {
          targetShape,
          keyframes: [],
          state: "empty"
        }
      };
    });
  }, [trackingOperation, updateActiveNode]);

  useEffect(() => {
    if (!project.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(project.nodes[0].id);
    }
  }, [project.nodes, selectedNodeId]);

  useEffect(() => {
    const frame = viewerFrameRef.current;
    if (!frame) {
      return;
    }

    const updateSize = () => {
      setViewerSize({
        width: frame.clientWidth,
        height: frame.clientHeight
      });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    updateSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!api) {
      setState({
        status: "error",
        message: "Electron preload API is unavailable.",
        error: {
          code: "UNKNOWN",
          message: "Renderer could not access the Chroma Node preload bridge."
        }
      });
      return;
    }

    void api.getDiagnostics().then((response) => {
      const result = response.result;
      if (result.ok) {
        setDiagnostics(result.value);
      } else {
        setState((current) => ({
          ...current,
          status: "error",
          error: result.error,
          message: result.error.message
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }

    return api.onExportProgress((progress) => {
      setExportOperation(progress);
      if (progress.state === "running" || progress.state === "pending") {
        setState((current) => ({
          ...current,
          status: "busy",
          message: `${progress.message} ${progress.percent.toFixed(1)}%.`,
          error: undefined
        }));
      }
      if (progress.state === "canceled") {
        setState((current) => ({
          ...current,
          status: current.media ? "ready" : "idle",
          message: "Export cancelled.",
          error: undefined
        }));
      }
      if (progress.state === "failed") {
        setState((current) => ({
          ...current,
          status: "error",
          message: progress.error?.message ?? progress.message,
          error: progress.error
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rendererRef.current) {
      return;
    }

    try {
      rendererRef.current = new FrameRenderer(canvasRef.current);
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "WebGL2 renderer failed to initialize."
      }));
    }

    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setNodeGraph(project.nodes);
  }, [project.nodes]);

  useEffect(() => {
    rendererRef.current?.setMatteNode(showMatte ? selectedNodeId : undefined);
  }, [project.nodes, selectedNodeId, showMatte]);

  useEffect(() => {
    rendererRef.current?.setViewerMode(playback.viewerMode, playback.splitPosition);
  }, [playback.splitPosition, playback.viewerMode]);

  useEffect(() => {
    rendererRef.current?.setPlaybackActive(playback.isPlaying);
  }, [playback.isPlaying]);

  useEffect(() => {
    rendererRef.current?.setCurrentFrame(playback.currentFrame);
  }, [playback.currentFrame]);

  useEffect(() => {
    if (!state.frame || !rendererRef.current || playback.isPlaying) {
      return;
    }

    void rendererRef.current.setFrame(state.frame);
  }, [playback.isPlaying, state.frame]);

  useEffect(() => {
    if (!state.frame) {
      if (!state.media) {
        if (waveformCanvasRef.current) {
          clearScopeCanvas(waveformCanvasRef.current, "No frame");
        }
        if (vectorscopeCanvasRef.current) {
          clearScopeCanvas(vectorscopeCanvasRef.current, "No frame");
        }
        setScopeInfo("Scopes waiting for a graded frame.");
      }
      return;
    }

    if (playback.isPlaying || playback.isScrubbing) {
      return;
    }

    scheduleScopeAnalysis(false);
  }, [playback.isPlaying, playback.isScrubbing, scheduleScopeAnalysis, state.frame, state.media]);

  useEffect(() => {
    if (!playback.isPlaying) {
      return;
    }

    scheduleScopeAnalysis(true);
    const intervalId = window.setInterval(() => {
      scheduleScopeAnalysis(true);
    }, playbackScopeIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [playback.isPlaying, scheduleScopeAnalysis]);

  useEffect(() => {
    return () => {
      if (scopeDebounceTimer.current !== undefined) {
        window.clearTimeout(scopeDebounceTimer.current);
      }
      scopeRequestId.current += 1;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        const previous = undo();
        if (previous) {
          setProject(previous);
          setSelectedNodeId(previous.nodes[0]?.id ?? selectedNodeId);
        }
      }

      if (modifier && event.key === "z" && event.shiftKey) {
        event.preventDefault();
        const next = redo();
        if (next) {
          setProject(next);
          setSelectedNodeId(next.nodes[0]?.id ?? selectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [redo, selectedNodeId, undo]);

  useEffect(() => {
    if (!mediaUrl || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.pause();
    video.load();
    video.currentTime = 0;
    rendererRef.current?.setVideoSource(video);
  }, [mediaUrl]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Import, viewer, playback</p>
          <h1>Chroma Node</h1>
        </div>
        <div className={`diagnostic ${diagnostics?.available ? "is-ok" : "is-warning"}`}>
          <span className="diagnostic-dot" />
          {diagnosticsLabel}
        </div>
      </header>

      <section className="workspace" aria-label="Chroma Node workspace">
        <aside className="inspector" aria-label="Media diagnostics">
          <div className="panel-title">Media</div>
          {state.media ? <MetadataTable media={state.media} /> : <EmptyMetadata />}

          <div className="panel-title export-title">Viewer State</div>
          <dl className="metadata-table">
            <MetadataRow label="Mode" value={playback.viewerMode} />
            <MetadataRow label="Frame" value={`${playback.currentFrame + 1} / ${totalFrames}`} />
            <MetadataRow label="Timecode" value={timecode} />
            <MetadataRow label="Split" value={`${Math.round(playback.splitPosition * 100)}%`} />
          </dl>

          <div className="panel-title export-title">Project</div>
          <dl className="metadata-table">
            <MetadataRow label="Name" value={project.name} />
            <MetadataRow label="Nodes" value={`${project.nodes.length} / ${MAX_SERIAL_NODES}`} />
            <MetadataRow label="Path" value={state.projectPath ?? "Unsaved"} />
          </dl>

          <div className="panel-title export-title">Export</div>
          <section className="export-card" aria-label="H.264 export settings and progress">
            <label className="field-label">
              <span>Quality</span>
              <select
                value={project.exportSettings.quality}
                onChange={(event) => {
                  const quality = event.currentTarget.value as ExportQuality;
                  commitProject((current) => ({
                    ...current,
                    exportSettings: {
                      ...current.exportSettings,
                      quality
                    }
                  }));
                }}
                disabled={isExporting}
              >
                <option value="draft">Draft</option>
                <option value="standard">Standard</option>
                <option value="high">High</option>
              </select>
            </label>
            {exportOperation && exportOperation.state !== "completed" ? (
              <ExportProgressPanel progress={exportOperation} onCancel={cancelProjectExport} />
            ) : state.exportResult ? (
              <ExportSummary result={state.exportResult} />
            ) : (
              <p className="muted">No export run yet.</p>
            )}
          </section>
        </aside>

        <section className="viewer-column" aria-label="Viewer">
          <div ref={viewerFrameRef} className={`viewer-frame viewer-mode-${showMatte ? "matte" : playback.viewerMode}`}>
            {mediaUrl ? (
              <video
                key={mediaUrl}
                ref={videoRef}
                className="viewer-video-source"
                src={mediaUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(event) => rendererRef.current?.setVideoSource(event.currentTarget)}
                onPlay={() => {
                  setPlayback((current) => ({ ...current, isPlaying: true }));
                  setState((current) => ({ ...current, status: "ready", message: "Playing clip.", error: undefined }));
                }}
                onPause={() => {
                  setPlayback((current) => ({ ...current, isPlaying: false }));
                }}
                onEnded={() => {
                  setPlayback((current) => ({
                    ...current,
                    isPlaying: false,
                    currentFrame: lastFrameIndex
                  }));
                }}
                onTimeUpdate={(event) => {
                  const frameIndex = timeToFrameIndex(event.currentTarget.currentTime, state.media);
                  setPlayback((current) => (current.isScrubbing ? current : { ...current, currentFrame: frameIndex }));
                }}
                onSeeked={(event) => {
                  const frameIndex = timeToFrameIndex(event.currentTarget.currentTime, state.media);
                  setPlayback((current) => (current.isScrubbing ? current : { ...current, currentFrame: frameIndex }));
                }}
              />
            ) : null}

            <canvas ref={canvasRef} className="viewer-canvas" aria-label="Video viewer" />
            {state.media ? (
              <WindowOverlay
                activeNode={resolvedActiveNode}
                disabled={Boolean(trackingOperation)}
                sourceRect={viewerSourceRect}
                onUpdateWindow={updatePowerWindow}
              />
            ) : null}
            {!showMatte && playback.viewerMode === "split" ? (
              <div className="split-rule" style={{ left: `${playback.splitPosition * 100}%` }} />
            ) : null}
            {state.media ? (
              <>
                <div className="viewer-badge viewer-badge-left">{showMatte ? `Matte ${activeNodeIndex + 1}` : playback.viewerMode === "graded" ? "Graded" : "Original"}</div>
                {!showMatte && playback.viewerMode === "split" ? <div className="viewer-badge viewer-badge-right">Graded</div> : null}
              </>
            ) : null}
            {!state.media ? (
              <div className="empty-state">
                <p className="eyebrow">Viewer</p>
                <h2>Import a supported clip</h2>
                <p>Load one MP4 or MOV up to 1920 x 1080, then inspect playback with frame stepping, scrubbing, and before-after modes.</p>
                <button className="primary-action" type="button" onClick={importMedia} disabled={state.status === "busy"}>
                  Import Clip
                </button>
              </div>
            ) : null}
          </div>

          <section className="playback-panel" aria-label="Playback controls">
            <div className="viewer-mode-row" role="group" aria-label="Viewer mode">
              <button
                type="button"
                className={playback.viewerMode === "original" ? "is-active" : ""}
                onClick={() => setPlayback((current) => ({ ...current, viewerMode: "original" }))}
                disabled={!canUseMedia}
              >
                Original
              </button>
              <button
                type="button"
                className={playback.viewerMode === "graded" ? "is-active" : ""}
                onClick={() => setPlayback((current) => ({ ...current, viewerMode: "graded" }))}
                disabled={!canUseMedia}
              >
                Graded
              </button>
              <button
                type="button"
                className={playback.viewerMode === "split" ? "is-active" : ""}
                onClick={() => setPlayback((current) => ({ ...current, viewerMode: "split" }))}
                disabled={!canUseMedia}
              >
                Split
              </button>
            </div>

            {playback.viewerMode === "split" ? (
              <label className="split-control">
                <span>Split</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={playback.splitPosition}
                  onChange={(event) =>
                    setPlayback((current) => ({ ...current, splitPosition: Number(event.currentTarget.value) }))
                  }
                  disabled={!canUseMedia}
                />
              </label>
            ) : null}

            <div className="scrub-row">
              <span>{timecode}</span>
              <input
                type="range"
                min="0"
                max={lastFrameIndex}
                value={playback.currentFrame}
                onChange={(event) => handleScrubChange(event.currentTarget.value)}
                onPointerUp={commitScrub}
                onKeyUp={commitScrub}
                onBlur={commitScrub}
                disabled={!canUseMedia}
                aria-label="Scrub timeline"
              />
              <span>{playback.currentFrame + 1} / {totalFrames}</span>
            </div>

            <div className="transport-controls" role="group" aria-label="Transport controls">
              <IconButton label="First frame" onClick={() => commitFrame(0)} disabled={!canUseMedia}>
                |&lt;
              </IconButton>
              <IconButton label="Step backward" onClick={() => commitFrame(playback.currentFrame - 1)} disabled={!canUseMedia}>
                &lt;
              </IconButton>
              <button className="play-toggle" type="button" onClick={togglePlayback} disabled={!canUseMedia}>
                {playback.isPlaying ? "Pause" : "Play"}
              </button>
              <IconButton label="Step forward" onClick={() => commitFrame(playback.currentFrame + 1)} disabled={!canUseMedia}>
                &gt;
              </IconButton>
              <IconButton label="Last frame" onClick={() => commitFrame(lastFrameIndex)} disabled={!canUseMedia}>
                &gt;|
              </IconButton>
            </div>
          </section>

          <section className="scopes-panel" aria-label="Video scopes">
            <div className="scope-card scope-card-waveform">
              <div className="scope-header">
                <h2>Waveform</h2>
                <span>Y 0-100 IRE</span>
              </div>
              <canvas
                ref={waveformCanvasRef}
                className="scope-canvas"
                width="320"
                height="160"
                aria-label="Luma waveform"
              />
            </div>
            <div className="scope-card scope-card-vectorscope">
              <div className="scope-header">
                <h2>Vectorscope</h2>
                <span>Cb / Cr</span>
              </div>
              <canvas
                ref={vectorscopeCanvasRef}
                className="scope-canvas"
                width="220"
                height="220"
                aria-label="Chroma vectorscope"
              />
            </div>
            <p className="scope-status">{scopeInfo}</p>
          </section>

          <footer className="transport">
            <div>
              <span className={`status-pill status-${previewBusy ? "busy" : state.status}`}>{previewBusy ? "decode" : state.status}</span>
              <span className="status-message">{previewBusy ? "Settling to exact frame..." : state.message}</span>
            </div>
            <div className="action-row">
              <button type="button" onClick={() => { const prev = undo(); if (prev) { setProject(prev); setSelectedNodeId(prev.nodes[0]?.id ?? selectedNodeId); } }} disabled={!canUndo}>
                Undo
              </button>
              <button type="button" onClick={() => { const next = redo(); if (next) { setProject(next); setSelectedNodeId(next.nodes[0]?.id ?? selectedNodeId); } }} disabled={!canRedo}>
                Redo
              </button>
              <button type="button" onClick={openProject} disabled={state.status === "busy"}>
                Open
              </button>
              <button type="button" onClick={saveProject} disabled={state.status === "busy"}>
                Save
              </button>
              <button type="button" onClick={importMedia} disabled={state.status === "busy"}>
                Import
              </button>
              <button type="button" onClick={runProjectExport} disabled={!state.media || state.status === "busy" || diagnostics?.available === false}>
                Export MP4
              </button>
              <button type="button" onClick={cancelProjectExport} disabled={!isExporting}>
                Cancel Export
              </button>
            </div>
          </footer>

          {state.error ? <ErrorBanner error={state.error} /> : null}
          {relinkState.isRelinking ? (
            <RelinkPanel
              originalPath={relinkState.originalPath}
              error={relinkState.error}
              onRelink={relinkMedia}
              onCancel={cancelRelink}
            />
          ) : null}
        </section>

          <ColorPanel
            nodes={project.nodes}
            activeNode={activeNode}
            canUseTracking={Boolean(state.media)}
            trackingOperation={trackingOperation}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onAddNode={addNode}
            onDeleteNode={deleteActiveNode}
            onCancelTracking={cancelTracking}
            onUpdateNode={updateActiveNode}
            onUpdateRgb={updateRgbPrimary}
            onUpdateScalar={updateScalarPrimary}
            onUpdateQualifierScalar={updateQualifierScalar}
            onUpdateWindowScalar={updatePowerWindowScalar}
            onUpdateWindow={updatePowerWindow}
            onResetPrimary={resetPrimary}
            onResetWindows={resetWindows}
            onRunTracking={runWindowTracking}
            onSetTrackingTarget={setTrackingTarget}
            showMatte={showMatte}
            onShowMatteChange={setShowMatte}
          />
      </section>
    </main>
  );
}

function ColorPanel({
  activeNode,
  canUseTracking,
  nodes,
  trackingOperation,
  selectedNodeId,
  onAddNode,
  onCancelTracking,
  onDeleteNode,
  onResetWindows,
  onResetPrimary,
  onRunTracking,
  onSetTrackingTarget,
  onShowMatteChange,
  onSelectNode,
  onUpdateQualifierScalar,
  onUpdateNode,
  onUpdateRgb,
  onUpdateScalar,
  onUpdateWindow,
  onUpdateWindowScalar,
  showMatte
}: {
  activeNode: ColorNode;
  canUseTracking: boolean;
  nodes: ColorNode[];
  trackingOperation?: TrackingOperation;
  selectedNodeId: string;
  onAddNode: () => void;
  onCancelTracking: () => void;
  onDeleteNode: () => void;
  onResetWindows: () => void;
  onResetPrimary: (key: RgbPrimaryKey | ScalarPrimaryKey) => void;
  onRunTracking: (direction: TrackingDirection) => void;
  onSetTrackingTarget: (shape: PowerWindowShape) => void;
  onShowMatteChange: (showMatte: boolean) => void;
  onSelectNode: (id: string) => void;
  onUpdateQualifierScalar: (key: QualifierScalarKey, value: number) => void;
  onUpdateNode: (updater: (node: ColorNode) => ColorNode) => void;
  onUpdateRgb: (key: RgbPrimaryKey, channel: RgbChannel, value: number) => void;
  onUpdateScalar: (key: ScalarPrimaryKey, value: number) => void;
  onUpdateWindow: (shape: PowerWindowShape, updater: (window: PowerWindow) => PowerWindow) => void;
  onUpdateWindowScalar: (shape: PowerWindowShape, key: WindowScalarKey, value: number) => void;
  showMatte: boolean;
}) {
  const isTracking = Boolean(trackingOperation);
  return (
    <aside className="color-panel" aria-label="Node graph and primary controls">
      <div className="panel-title">Serial Nodes</div>
      <div className="node-strip" role="list" aria-label="Serial node graph">
        {nodes.map((node, index) => (
          <div className={`node-card ${node.id === selectedNodeId ? "is-selected" : ""} ${node.enabled ? "" : "is-bypassed"}`} key={node.id}>
            <button type="button" className="node-select" onClick={() => onSelectNode(node.id)} disabled={isTracking}>
              <span className="node-index">{index + 1}</span>
              <span className="node-label">{node.name}</span>
              <span className="node-state">{node.enabled ? "On" : "Bypass"}</span>
            </button>
            {index < nodes.length - 1 ? <span className="node-arrow">-&gt;</span> : null}
          </div>
        ))}
      </div>
      <button className="add-node" type="button" onClick={onAddNode} disabled={nodes.length >= MAX_SERIAL_NODES || isTracking}>
        Add Node
      </button>

      <div className="panel-title export-title">Node</div>
      <div className="node-editor">
        <label className="field-label">
          <span>Name</span>
          <input
            type="text"
            value={activeNode.name}
            maxLength={48}
            onChange={(event) => onUpdateNode((node) => ({ ...node, name: event.currentTarget.value }))}
          />
        </label>
        <div className="node-actions">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={activeNode.enabled}
              onChange={(event) => onUpdateNode((node) => ({ ...node, enabled: event.currentTarget.checked }))}
            />
            <span>Enabled</span>
          </label>
          <button type="button" onClick={() => onUpdateNode((node) => ({ ...node, primaries: createNeutralPrimaries() }))}>
            Reset Node
          </button>
          <button type="button" onClick={onDeleteNode} disabled={nodes.length <= 1 || isTracking}>
            Delete
          </button>
        </div>
      </div>

      <div className="panel-title export-title">Primary</div>
      <RgbControl label="Lift" value={activeNode.primaries.lift} rangeKey="lift" onChange={onUpdateRgb} onReset={onResetPrimary} />
      <RgbControl label="Gamma" value={activeNode.primaries.gamma} rangeKey="gamma" onChange={onUpdateRgb} onReset={onResetPrimary} />
      <RgbControl label="Gain" value={activeNode.primaries.gain} rangeKey="gain" onChange={onUpdateRgb} onReset={onResetPrimary} />
      <RgbControl label="Offset" value={activeNode.primaries.offset} rangeKey="offset" onChange={onUpdateRgb} onReset={onResetPrimary} />

      <div className="scalar-grid">
        <ScalarControl label="Contrast" value={activeNode.primaries.contrast} rangeKey="contrast" onChange={onUpdateScalar} onReset={onResetPrimary} />
        <ScalarControl label="Pivot" value={activeNode.primaries.pivot} rangeKey="pivot" onChange={onUpdateScalar} onReset={onResetPrimary} />
        <ScalarControl label="Saturation" value={activeNode.primaries.saturation} rangeKey="saturation" onChange={onUpdateScalar} onReset={onResetPrimary} />
        <ScalarControl label="Temperature" value={activeNode.primaries.temperature} rangeKey="temperature" onChange={onUpdateScalar} onReset={onResetPrimary} />
        <ScalarControl label="Tint" value={activeNode.primaries.tint} rangeKey="tint" onChange={onUpdateScalar} onReset={onResetPrimary} />
      </div>

      <div className="panel-title export-title">Qualifier</div>
      <section className="mask-card">
        <div className="mask-toggle-grid">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={activeNode.qualifier.enabled}
              onChange={(event) => onUpdateNode((node) => ({
                ...node,
                qualifier: { ...node.qualifier, enabled: event.currentTarget.checked }
              }))}
            />
            <span>Enable</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={activeNode.qualifier.invert}
              onChange={(event) => onUpdateNode((node) => ({
                ...node,
                qualifier: { ...node.qualifier, invert: event.currentTarget.checked }
              }))}
            />
            <span>Invert</span>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={showMatte}
              onChange={(event) => onShowMatteChange(event.currentTarget.checked)}
            />
            <span>Show Matte</span>
          </label>
        </div>
        <QualifierControl label="Hue Center" value={activeNode.qualifier.hueCenter} rangeKey="hueCenter" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Hue Width" value={activeNode.qualifier.hueWidth} rangeKey="hueWidth" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Hue Softness" value={activeNode.qualifier.hueSoftness} rangeKey="hueSoftness" onChange={onUpdateQualifierScalar} />
        <div className="mask-subtitle">Saturation</div>
        <QualifierControl label="Min" value={activeNode.qualifier.saturationMin} rangeKey="saturationMin" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Max" value={activeNode.qualifier.saturationMax} rangeKey="saturationMax" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Softness" value={activeNode.qualifier.saturationSoftness} rangeKey="saturationSoftness" onChange={onUpdateQualifierScalar} />
        <div className="mask-subtitle">Luminance</div>
        <QualifierControl label="Min" value={activeNode.qualifier.luminanceMin} rangeKey="luminanceMin" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Max" value={activeNode.qualifier.luminanceMax} rangeKey="luminanceMax" onChange={onUpdateQualifierScalar} />
        <QualifierControl label="Softness" value={activeNode.qualifier.luminanceSoftness} rangeKey="luminanceSoftness" onChange={onUpdateQualifierScalar} />
      </section>

      <div className="panel-title export-title">Power Windows</div>
      <section className="mask-card">
        <div className="primary-card-header">
          <h2>Windows</h2>
          <button type="button" onClick={onResetWindows} disabled={isTracking}>Reset</button>
        </div>
        <TrackingControl
          activeNode={activeNode}
          canUseTracking={canUseTracking}
          operation={trackingOperation}
          onCancel={onCancelTracking}
          onRun={onRunTracking}
          onSetTarget={onSetTrackingTarget}
        />
        <WindowControl
          disabled={isTracking}
          shape="ellipse"
          window={activeNode.windows.ellipse}
          onUpdate={onUpdateWindow}
          onUpdateScalar={onUpdateWindowScalar}
        />
        <WindowControl
          disabled={isTracking}
          shape="rectangle"
          window={activeNode.windows.rectangle}
          onUpdate={onUpdateWindow}
          onUpdateScalar={onUpdateWindowScalar}
        />
      </section>
    </aside>
  );
}

function RgbControl({
  label,
  onChange,
  onReset,
  rangeKey,
  value
}: {
  label: string;
  onChange: (key: RgbPrimaryKey, channel: RgbChannel, value: number) => void;
  onReset: (key: RgbPrimaryKey) => void;
  rangeKey: RgbPrimaryKey;
  value: RgbVector;
}) {
  const range = PRIMARY_RANGES[rangeKey];
  return (
    <section className="primary-card">
      <div className="primary-card-header">
        <h2>{label}</h2>
        <button type="button" onClick={() => onReset(rangeKey)}>Reset</button>
      </div>
      {(["r", "g", "b"] as const).map((channel) => (
        <label className={`channel-row channel-${channel}`} key={channel}>
          <span>{channel.toUpperCase()}</span>
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={range.step}
            value={value[channel]}
            onChange={(event) => onChange(rangeKey, channel, Number(event.currentTarget.value))}
          />
          <input
            type="number"
            min={range.min}
            max={range.max}
            step={range.step}
            value={formatControlValue(value[channel])}
            onChange={(event) => onChange(rangeKey, channel, Number(event.currentTarget.value))}
          />
        </label>
      ))}
    </section>
  );
}

function ScalarControl({
  label,
  onChange,
  onReset,
  rangeKey,
  value
}: {
  label: string;
  onChange: (key: ScalarPrimaryKey, value: number) => void;
  onReset: (key: ScalarPrimaryKey) => void;
  rangeKey: ScalarPrimaryKey;
  value: number;
}) {
  const range = PRIMARY_RANGES[rangeKey];
  return (
    <section className="scalar-card">
      <div className="primary-card-header">
        <h2>{label}</h2>
        <button type="button" onClick={() => onReset(rangeKey)}>Reset</button>
      </div>
      <label className="channel-row scalar-row">
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          onChange={(event) => onChange(rangeKey, Number(event.currentTarget.value))}
        />
        <input
          type="number"
          min={range.min}
          max={range.max}
          step={range.step}
          value={formatControlValue(value)}
          onChange={(event) => onChange(rangeKey, Number(event.currentTarget.value))}
        />
      </label>
    </section>
  );
}

function QualifierControl({
  label,
  onChange,
  rangeKey,
  value
}: {
  label: string;
  onChange: (key: QualifierScalarKey, value: number) => void;
  rangeKey: QualifierScalarKey;
  value: number;
}) {
  const range = QUALIFIER_RANGES[rangeKey];
  return (
    <label className="mask-row">
      <span>{label}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(rangeKey, Number(event.currentTarget.value))}
      />
      <input
        type="number"
        min={range.min}
        max={range.max}
        step={range.step}
        value={formatControlValue(value)}
        onChange={(event) => onChange(rangeKey, Number(event.currentTarget.value))}
      />
    </label>
  );
}

function TrackingControl({
  activeNode,
  canUseTracking,
  onCancel,
  onRun,
  onSetTarget,
  operation
}: {
  activeNode: ColorNode;
  canUseTracking: boolean;
  onCancel: () => void;
  onRun: (direction: TrackingDirection) => void;
  onSetTarget: (shape: PowerWindowShape) => void;
  operation?: TrackingOperation;
}) {
  const tracking = activeNode.tracking;
  const targetEnabled = activeNode.windows[tracking.targetShape].enabled;
  const isTracking = Boolean(operation);
  const status = formatTrackingStatus(activeNode);
  const progressValue = operation
    ? Math.min(100, Math.round(operation.completedFrames / Math.max(1, operation.totalFrames) * 100))
    : 0;

  return (
    <section className="tracking-card" aria-label="Power window tracking">
      <div className="tracking-header">
        <h2>Translation Track</h2>
        <span className={`tracking-state tracking-state-${tracking.state}`}>{tracking.state}</span>
      </div>
      <label className="tracking-target">
        <span>Target</span>
        <select
          value={tracking.targetShape}
          onChange={(event) => onSetTarget(event.currentTarget.value as PowerWindowShape)}
          disabled={isTracking}
        >
          <option value="ellipse">Ellipse</option>
          <option value="rectangle">Rectangle</option>
        </select>
      </label>
      <div className="tracking-actions" role="group" aria-label="Tracking actions">
        <button type="button" onClick={() => onRun("backward")} disabled={!canUseTracking || !targetEnabled || isTracking}>
          Track Back
        </button>
        <button type="button" onClick={() => onRun("forward")} disabled={!canUseTracking || !targetEnabled || isTracking}>
          Track Forward
        </button>
        <button type="button" onClick={onCancel} disabled={!isTracking}>
          Cancel
        </button>
      </div>
      {operation ? (
        <div className="tracking-progress" role="status" aria-live="polite">
          <progress value={progressValue} max="100" />
          <span>{operation.message} Frame {operation.currentFrame + 1}. {operation.completedFrames} / {operation.totalFrames} frames.</span>
        </div>
      ) : (
        <p className="tracking-summary">{status}</p>
      )}
    </section>
  );
}

function WindowControl({
  disabled = false,
  onUpdate,
  onUpdateScalar,
  shape,
  window
}: {
  disabled?: boolean;
  onUpdate: (shape: PowerWindowShape, updater: (window: PowerWindow) => PowerWindow) => void;
  onUpdateScalar: (shape: PowerWindowShape, key: WindowScalarKey, value: number) => void;
  shape: PowerWindowShape;
  window: PowerWindow;
}) {
  const title = shape === "ellipse" ? "Ellipse" : "Rectangle";
  return (
    <section className="window-card">
      <div className="window-card-header">
        <h2>{title}</h2>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={window.enabled}
            onChange={(event) => onUpdate(shape, (current) => ({ ...current, enabled: event.currentTarget.checked }))}
            disabled={disabled}
          />
          <span>Enable</span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={window.invert}
            onChange={(event) => onUpdate(shape, (current) => ({ ...current, invert: event.currentTarget.checked }))}
            disabled={disabled}
          />
          <span>Invert</span>
        </label>
      </div>
      <WindowScalarControl disabled={disabled} label="X" value={window.centerX} shape={shape} rangeKey="centerX" onChange={onUpdateScalar} />
      <WindowScalarControl disabled={disabled} label="Y" value={window.centerY} shape={shape} rangeKey="centerY" onChange={onUpdateScalar} />
      <WindowScalarControl disabled={disabled} label="Width" value={window.width} shape={shape} rangeKey="width" onChange={onUpdateScalar} />
      <WindowScalarControl disabled={disabled} label="Height" value={window.height} shape={shape} rangeKey="height" onChange={onUpdateScalar} />
      <WindowScalarControl disabled={disabled} label="Rotate" value={window.rotationDegrees} shape={shape} rangeKey="rotationDegrees" onChange={onUpdateScalar} />
      <WindowScalarControl disabled={disabled} label="Softness" value={window.softness} shape={shape} rangeKey="softness" onChange={onUpdateScalar} />
    </section>
  );
}

function WindowScalarControl({
  disabled = false,
  label,
  onChange,
  rangeKey,
  shape,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (shape: PowerWindowShape, key: WindowScalarKey, value: number) => void;
  rangeKey: WindowScalarKey;
  shape: PowerWindowShape;
  value: number;
}) {
  const range = WINDOW_RANGES[rangeKey];
  return (
    <label className="mask-row">
      <span>{label}</span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(event) => onChange(shape, rangeKey, Number(event.currentTarget.value))}
        disabled={disabled}
      />
      <input
        type="number"
        min={range.min}
        max={range.max}
        step={range.step}
        value={formatControlValue(value)}
        onChange={(event) => onChange(shape, rangeKey, Number(event.currentTarget.value))}
        disabled={disabled}
      />
    </label>
  );
}

function WindowOverlay({
  activeNode,
  disabled = false,
  onUpdateWindow,
  sourceRect
}: {
  activeNode: ColorNode;
  disabled?: boolean;
  onUpdateWindow: (shape: PowerWindowShape, updater: (window: PowerWindow) => PowerWindow) => void;
  sourceRect: SourceRect;
}) {
  const interactionRef = useRef<WindowInteraction | undefined>(undefined);
  const enabledWindows = (["ellipse", "rectangle"] as const).filter((shape) => activeNode.windows[shape].enabled);

  if (sourceRect.width <= 0 || sourceRect.height <= 0 || enabledWindows.length === 0) {
    return null;
  }

  const beginInteraction = (
    event: ReactPointerEvent<SVGElement>,
    shape: PowerWindowShape,
    mode: WindowInteraction["mode"]
  ) => {
    if (disabled) {
      return;
    }

    event.preventDefault();
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    interactionRef.current = {
      mode,
      shape,
      initialWindow: activeNode.windows[shape]
    };
  };

  const updateInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    const interaction = interactionRef.current;
    if (!interaction) {
      return;
    }

    const point = readSvgPoint(event);
    const initial = interaction.initialWindow;
    if (interaction.mode === "move") {
      onUpdateWindow(interaction.shape, (window) => ({
        ...window,
        centerX: clamp01(point.x / sourceRect.width),
        centerY: clamp01(point.y / sourceRect.height)
      }));
      return;
    }

    if (interaction.mode === "rotate") {
      const center = {
        x: initial.centerX * sourceRect.width,
        y: initial.centerY * sourceRect.height
      };
      const degrees = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI + 90;
      onUpdateWindow(interaction.shape, (window) => ({
        ...window,
        rotationDegrees: clampNumber(normalizeSignedDegrees(degrees), WINDOW_RANGES.rotationDegrees)
      }));
      return;
    }

    const center = {
      x: initial.centerX * sourceRect.width,
      y: initial.centerY * sourceRect.height
    };
    const local = rotatePixelPoint(
      {
        x: point.x - center.x,
        y: point.y - center.y
      },
      -initial.rotationDegrees
    );
    onUpdateWindow(interaction.shape, (window) => ({
      ...window,
      width: clampNumber(Math.abs(local.x) * 2 / sourceRect.width, WINDOW_RANGES.width),
      height: clampNumber(Math.abs(local.y) * 2 / sourceRect.height, WINDOW_RANGES.height)
    }));
  };

  const finishInteraction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (interactionRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    interactionRef.current = undefined;
  };

  return (
    <div
      className="window-overlay"
      style={{
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height
      }}
    >
      <svg
        aria-label="Power window overlay"
        viewBox={`0 0 ${sourceRect.width} ${sourceRect.height}`}
        preserveAspectRatio="none"
        onPointerMove={updateInteraction}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
      >
        {enabledWindows.map((shape) => (
          <WindowOverlayShape
            key={shape}
            disabled={disabled}
            shape={shape}
            window={activeNode.windows[shape]}
            sourceRect={sourceRect}
            onBeginInteraction={beginInteraction}
          />
        ))}
      </svg>
    </div>
  );
}

function WindowOverlayShape({
  disabled,
  onBeginInteraction,
  shape,
  sourceRect,
  window
}: {
  disabled: boolean;
  onBeginInteraction: (event: ReactPointerEvent<SVGElement>, shape: PowerWindowShape, mode: WindowInteraction["mode"]) => void;
  shape: PowerWindowShape;
  sourceRect: SourceRect;
  window: PowerWindow;
}) {
  const geometry = getWindowGeometry(window, sourceRect);
  const rotate = `rotate(${window.rotationDegrees} ${geometry.center.x} ${geometry.center.y})`;
  const resizePoint = rotatePixelPoint({ x: geometry.width / 2, y: geometry.height / 2 }, window.rotationDegrees);
  const rotationPoint = rotatePixelPoint({ x: 0, y: -geometry.height / 2 - 28 }, window.rotationDegrees);

  return (
    <g className={`window-shape window-shape-${shape} ${disabled ? "is-disabled" : ""}`}>
      {shape === "ellipse" ? (
        <ellipse
          cx={geometry.center.x}
          cy={geometry.center.y}
          rx={geometry.width / 2}
          ry={geometry.height / 2}
          transform={rotate}
        />
      ) : (
        <rect
          x={geometry.center.x - geometry.width / 2}
          y={geometry.center.y - geometry.height / 2}
          width={geometry.width}
          height={geometry.height}
          transform={rotate}
        />
      )}
      <line
        className="window-rotation-line"
        x1={geometry.center.x}
        y1={geometry.center.y}
        x2={geometry.center.x + rotationPoint.x}
        y2={geometry.center.y + rotationPoint.y}
      />
      <circle
        className="window-handle window-handle-center"
        cx={geometry.center.x}
        cy={geometry.center.y}
        r="7"
        onPointerDown={(event) => onBeginInteraction(event, shape, "move")}
      />
      <circle
        className="window-handle"
        cx={geometry.center.x + resizePoint.x}
        cy={geometry.center.y + resizePoint.y}
        r="7"
        onPointerDown={(event) => onBeginInteraction(event, shape, "resize")}
      />
      <circle
        className="window-handle window-handle-rotate"
        cx={geometry.center.x + rotationPoint.x}
        cy={geometry.center.y + rotationPoint.y}
        r="7"
        onPointerDown={(event) => onBeginInteraction(event, shape, "rotate")}
      />
    </g>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick
}: {
  children: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function EmptyMetadata() {
  return (
    <dl className="metadata-table">
      <div>
        <dt>Source</dt>
        <dd>Waiting for import</dd>
      </div>
      <div>
        <dt>Probe</dt>
        <dd>Not run</dd>
      </div>
    </dl>
  );
}

function MetadataTable({ media }: { media: MediaRef }) {
  return (
    <dl className="metadata-table">
      <MetadataRow label="File" value={media.fileName} />
      <MetadataRow label="Codec" value={media.codec} />
      <MetadataRow label="Raster" value={`${media.width} x ${media.height}`} />
      <MetadataRow label="Duration" value={`${media.durationSeconds.toFixed(2)}s`} />
      <MetadataRow label="Frame Rate" value={`${media.frameRate.toFixed(3)} fps`} />
      <MetadataRow label="Frames" value={String(media.totalFrames ?? "Unknown")} />
      <MetadataRow label="Audio" value={media.hasAudio ? "Present" : "Ignored"} />
      <MetadataRow label="Rotation" value={`${media.rotation} deg`} />
    </dl>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

function ExportSummary({ result }: { result: ExportJobResult }) {
  return (
    <dl className="metadata-table">
      <MetadataRow label="Codec" value={result.codec} />
      <MetadataRow label="Raster" value={`${result.width} x ${result.height}`} />
      <MetadataRow label="Frames" value={String(result.frameCount)} />
      <MetadataRow label="Audio" value={result.hasAudio ? "Present" : "None"} />
      <MetadataRow label="Path" value={result.outputPath} />
    </dl>
  );
}

function ExportProgressPanel({
  onCancel,
  progress
}: {
  onCancel: () => void;
  progress: ExportProgress;
}) {
  const elapsedSeconds = Math.max(0, progress.elapsedMs / 1000);
  return (
    <div className="export-progress" role="status" aria-live="polite">
      <div className="export-progress-header">
        <span className={`tracking-state tracking-state-${progress.state}`}>{progress.state}</span>
        <span>{progress.percent.toFixed(1)}%</span>
      </div>
      <progress value={progress.percent} max="100" />
      <p>{progress.currentFrame} / {progress.totalFrames} frames, {elapsedSeconds.toFixed(1)}s elapsed.</p>
      <p title={progress.outputPath}>{progress.message}</p>
      <button type="button" onClick={onCancel} disabled={progress.state !== "pending" && progress.state !== "running"}>
        Cancel
      </button>
    </div>
  );
}

function formatTrackingStatus(node: ColorNode): string {
  const tracking = node.tracking;
  if (tracking.keyframes.length === 0) {
    return "No tracking keyframes.";
  }

  const frameRange = `${tracking.keyframes[0].frame + 1}-${tracking.keyframes[tracking.keyframes.length - 1].frame + 1}`;
  if (tracking.state === "stale") {
    return `${tracking.keyframes.length} keyframes are stale after a manual ${tracking.targetShape} edit.`;
  }

  if (tracking.state === "failed") {
    const failure = tracking.failureFrame === undefined ? "" : ` Stopped at frame ${tracking.failureFrame + 1}.`;
    return `${tracking.keyframes.length} keyframes kept for frames ${frameRange}.${failure}`;
  }

  return `${tracking.keyframes.length} keyframes for ${tracking.targetShape}, frames ${frameRange}.`;
}

function ErrorBanner({ error }: { error: AppError }) {
  return (
    <div className="error-banner" role="alert">
      <strong>{error.code}</strong>
      <span>{error.message}</span>
      {error.detail ? <code>{error.detail}</code> : null}
    </div>
  );
}

function createUniqueNode(nodes: ColorNode[]): ColorNode {
  const nextNode = createColorNode(nodes.length + 1);
  const existingIds = new Set(nodes.map((node) => node.id));
  if (!existingIds.has(nextNode.id)) {
    return nextNode;
  }

  return {
    ...nextNode,
    id: `node-${Date.now().toString(36)}`
  };
}

function formatControlValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

interface SourceRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PixelPoint {
  x: number;
  y: number;
}

interface WindowInteraction {
  mode: "move" | "resize" | "rotate";
  shape: PowerWindowShape;
  initialWindow: PowerWindow;
}

function getContainedRect(containerWidth: number, containerHeight: number, sourceWidth: number, sourceHeight: number): SourceRect {
  if (containerWidth <= 0 || containerHeight <= 0 || sourceWidth <= 0 || sourceHeight <= 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const containerAspect = containerWidth / containerHeight;
  const sourceAspect = sourceWidth / sourceHeight;
  if (containerAspect > sourceAspect) {
    const width = containerHeight * sourceAspect;
    return {
      left: (containerWidth - width) / 2,
      top: 0,
      width,
      height: containerHeight
    };
  }

  const height = containerWidth / sourceAspect;
  return {
    left: 0,
    top: (containerHeight - height) / 2,
    width: containerWidth,
    height
  };
}

function readSvgPoint(event: ReactPointerEvent<SVGSVGElement>): PixelPoint {
  const rect = event.currentTarget.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function getWindowGeometry(window: PowerWindow, sourceRect: SourceRect): {
  center: PixelPoint;
  width: number;
  height: number;
} {
  return {
    center: {
      x: window.centerX * sourceRect.width,
      y: window.centerY * sourceRect.height
    },
    width: window.width * sourceRect.width,
    height: window.height * sourceRect.height
  };
}

function rotatePixelPoint(point: PixelPoint, degrees: number): PixelPoint {
  const radians = degrees * Math.PI / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}

function normalizeSignedDegrees(value: number): number {
  const degrees = ((value + 180) % 360 + 360) % 360 - 180;
  return degrees === -180 ? 180 : degrees;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function captureScopeFrame(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number
): RgbaFrame {
  const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not create scope sampling canvas.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "medium";
  context.drawImage(source, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);

  return {
    width,
    height,
    data: imageData.data
  };
}

async function decodedFrameToLumaFrame(frame: DecodedFrame): Promise<LumaFrame> {
  const image = await loadImage(frame.dataUrl);
  const width = frame.width || image.naturalWidth;
  const height = frame.height || image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Could not create tracking frame canvas.");
  }

  context.drawImage(image, 0, 0, width, height);
  const rgba = context.getImageData(0, 0, width, height).data;
  const luma = new Uint8ClampedArray(width * height);

  for (let index = 0, pixel = 0; index < rgba.length; index += 4, pixel += 1) {
    luma[pixel] = Math.round(rgba[index] * 0.2126 + rgba[index + 1] * 0.7152 + rgba[index + 2] * 0.0722);
  }

  return { width, height, data: luma };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode scope source frame."));
    image.src = dataUrl;
  });
}

function filePathToUrl(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, "/");
  const segments = normalized.split("/").map((segment, index) => {
    if (index === 0 && /^[A-Za-z]:$/.test(segment)) {
      return segment;
    }

    return encodeURIComponent(segment);
  });
  const escaped = segments.join("/");

  return normalized.startsWith("/") ? `file://${escaped}` : `file:///${escaped}`;
}

function RelinkPanel({
  error,
  onCancel,
  onRelink,
  originalPath
}: {
  error?: AppError;
  onCancel: () => void;
  onRelink: () => void;
  originalPath?: string;
}) {
  return (
    <div className="relink-panel" role="alertdialog" aria-label="Media relink required">
      <div className="relink-content">
        <h2>Media Missing</h2>
        <p>The media file linked in this project could not be found.</p>
        {originalPath ? (
          <p className="relink-path">Original path: <code title={originalPath}>{originalPath}</code></p>
        ) : null}
        {error ? (
          <p className="relink-error">Validation error: {error.message}</p>
        ) : null}
        <p>Select a replacement media file to continue. The replacement must be:</p>
        <ul>
          <li>An MP4 or MOV file with H.264 video codec</li>
          <li>Maximum resolution of 1920 x 1080</li>
        </ul>
        <div className="relink-actions">
          <button type="button" className="primary-action" onClick={onRelink}>
            Choose Replacement Media
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
