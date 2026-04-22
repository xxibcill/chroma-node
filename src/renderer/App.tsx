import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppError, DecodedFrame, ExportJobResult, FfmpegDiagnostics, MediaRef } from "../shared/ipc";
import type { ColorNode, RgbVector } from "../shared/colorEngine";
import {
  MAX_SERIAL_NODES,
  PRIMARY_RANGES,
  clampNumber,
  createColorNode,
  createNeutralPrimaries
} from "../shared/colorEngine";
import type { ChromaProject, ViewerMode } from "../shared/project";
import { createDefaultProject, sanitizeProject } from "../shared/project";
import {
  clampFrameIndex,
  formatTimecode,
  frameToTimeSeconds,
  getLastFrameIndex,
  getTotalFrameCount,
  timeToFrameIndex
} from "./playback";
import { FrameRenderer } from "./webgl/FrameRenderer";

type Status = "idle" | "busy" | "ready" | "error";
type RgbPrimaryKey = "lift" | "gamma" | "gain" | "offset";
type ScalarPrimaryKey = "contrast" | "pivot" | "saturation" | "temperature" | "tint";
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

interface PlaybackState {
  isPlaying: boolean;
  isScrubbing: boolean;
  currentFrame: number;
  viewerMode: ViewerMode;
  splitPosition: number;
}

const api = window.chromaNode;
const initialProject = createDefaultProject();
const initialMessage = "Import an MP4 or MOV clip to start playback inspection.";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<FrameRenderer | null>(null);
  const frameRequestId = useRef(0);
  const [diagnostics, setDiagnostics] = useState<FfmpegDiagnostics | undefined>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [project, setProject] = useState<ChromaProject>(initialProject);
  const [selectedNodeId, setSelectedNodeId] = useState(initialProject.nodes[0].id);
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

  const mediaUrl = useMemo(() => (state.media ? filePathToUrl(state.media.sourcePath) : undefined), [state.media]);
  const totalFrames = useMemo(() => getTotalFrameCount(state.media), [state.media]);
  const lastFrameIndex = useMemo(() => getLastFrameIndex(state.media), [state.media]);
  const timecode = useMemo(() => formatTimecode(playback.currentFrame, state.media), [playback.currentFrame, state.media]);
  const canUseMedia = Boolean(state.media);
  const activeNode = useMemo(
    () => project.nodes.find((node) => node.id === selectedNodeId) ?? project.nodes[0],
    [project.nodes, selectedNodeId]
  );

  const diagnosticsLabel = useMemo(() => {
    if (!diagnostics) {
      return "Checking FFmpeg";
    }

    return diagnostics.available ? "FFmpeg ready" : "FFmpeg unavailable";
  }, [diagnostics]);

  const commitProject = useCallback((updater: (current: ChromaProject) => ChromaProject) => {
    setProject((current) => sanitizeProject(updater(current)));
  }, []);

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

  const seekVideoToFrame = useCallback((frameIndex: number, media = state.media) => {
    const video = videoRef.current;
    if (!video || !media) {
      return;
    }

    video.currentTime = frameToTimeSeconds(frameIndex, media);
  }, [state.media]);

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
        message: `Project loaded, but media is missing: ${openedProject.media.sourcePath}`,
        projectPath: result.value.projectPath,
        error: {
          code: "FILE_NOT_FOUND",
          message: "Project media is missing.",
          detail: openedProject.media.sourcePath
        }
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

  const runExportSpike = useCallback(async () => {
    if (!api) {
      return;
    }

    videoRef.current?.pause();
    setPlayback((current) => ({ ...current, isPlaying: false }));
    setState((current) => ({ ...current, status: "busy", message: "Encoding synthetic H.264 MP4..." }));
    const exportResponse = await api.exportSynthetic();
    const exportResult = exportResponse.result;
    if (!exportResult.ok) {
      setState((current) => ({
        ...current,
        status: "error",
        message: exportResult.error.message,
        error: exportResult.error
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: "ready",
      message: "Synthetic export completed.",
      exportResult: exportResult.value,
      error: undefined
    }));
  }, []);

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

  useEffect(() => {
    if (!project.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(project.nodes[0].id);
    }
  }, [project.nodes, selectedNodeId]);

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
    rendererRef.current?.setViewerMode(playback.viewerMode, playback.splitPosition);
  }, [playback.splitPosition, playback.viewerMode]);

  useEffect(() => {
    rendererRef.current?.setPlaybackActive(playback.isPlaying);
  }, [playback.isPlaying]);

  useEffect(() => {
    if (!state.frame || !rendererRef.current || playback.isPlaying) {
      return;
    }

    void rendererRef.current.setFrame(state.frame);
  }, [playback.isPlaying, state.frame]);

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

          <div className="panel-title export-title">Export Spike</div>
          {state.exportResult ? <ExportSummary result={state.exportResult} /> : <p className="muted">No export run yet.</p>}
        </aside>

        <section className="viewer-column" aria-label="Viewer">
          <div className={`viewer-frame viewer-mode-${playback.viewerMode}`}>
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
            {playback.viewerMode === "split" ? (
              <div className="split-rule" style={{ left: `${playback.splitPosition * 100}%` }} />
            ) : null}
            {state.media ? (
              <>
                <div className="viewer-badge viewer-badge-left">{playback.viewerMode === "graded" ? "Graded" : "Original"}</div>
                {playback.viewerMode === "split" ? <div className="viewer-badge viewer-badge-right">Graded</div> : null}
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

          <footer className="transport">
            <div>
              <span className={`status-pill status-${previewBusy ? "busy" : state.status}`}>{previewBusy ? "decode" : state.status}</span>
              <span className="status-message">{previewBusy ? "Settling to exact frame..." : state.message}</span>
            </div>
            <div className="action-row">
              <button type="button" onClick={openProject} disabled={state.status === "busy"}>
                Open
              </button>
              <button type="button" onClick={saveProject} disabled={state.status === "busy"}>
                Save
              </button>
              <button type="button" onClick={importMedia} disabled={state.status === "busy"}>
                Import
              </button>
              <button type="button" onClick={runExportSpike} disabled={state.status === "busy" || diagnostics?.available === false}>
                Export MP4
              </button>
            </div>
          </footer>

          {state.error ? <ErrorBanner error={state.error} /> : null}
        </section>

        <ColorPanel
          nodes={project.nodes}
          activeNode={activeNode}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onAddNode={addNode}
          onDeleteNode={deleteActiveNode}
          onUpdateNode={updateActiveNode}
          onUpdateRgb={updateRgbPrimary}
          onUpdateScalar={updateScalarPrimary}
          onResetPrimary={resetPrimary}
        />
      </section>
    </main>
  );
}

function ColorPanel({
  activeNode,
  nodes,
  selectedNodeId,
  onAddNode,
  onDeleteNode,
  onResetPrimary,
  onSelectNode,
  onUpdateNode,
  onUpdateRgb,
  onUpdateScalar
}: {
  activeNode: ColorNode;
  nodes: ColorNode[];
  selectedNodeId: string;
  onAddNode: () => void;
  onDeleteNode: () => void;
  onResetPrimary: (key: RgbPrimaryKey | ScalarPrimaryKey) => void;
  onSelectNode: (id: string) => void;
  onUpdateNode: (updater: (node: ColorNode) => ColorNode) => void;
  onUpdateRgb: (key: RgbPrimaryKey, channel: RgbChannel, value: number) => void;
  onUpdateScalar: (key: ScalarPrimaryKey, value: number) => void;
}) {
  return (
    <aside className="color-panel" aria-label="Node graph and primary controls">
      <div className="panel-title">Serial Nodes</div>
      <div className="node-strip" role="list" aria-label="Serial node graph">
        {nodes.map((node, index) => (
          <div className={`node-card ${node.id === selectedNodeId ? "is-selected" : ""} ${node.enabled ? "" : "is-bypassed"}`} key={node.id}>
            <button type="button" className="node-select" onClick={() => onSelectNode(node.id)}>
              <span className="node-index">{index + 1}</span>
              <span className="node-label">{node.name}</span>
              <span className="node-state">{node.enabled ? "On" : "Bypass"}</span>
            </button>
            {index < nodes.length - 1 ? <span className="node-arrow">-&gt;</span> : null}
          </div>
        ))}
      </div>
      <button className="add-node" type="button" onClick={onAddNode} disabled={nodes.length >= MAX_SERIAL_NODES}>
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
          <button type="button" onClick={onDeleteNode} disabled={nodes.length <= 1}>
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
      <MetadataRow label="Path" value={result.outputPath} />
    </dl>
  );
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
