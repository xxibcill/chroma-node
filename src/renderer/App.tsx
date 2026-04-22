import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppError, DecodedFrame, ExportJobResult, FfmpegDiagnostics, MediaRef } from "../shared/ipc";
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
type ViewerMode = "original" | "graded" | "split";

interface UiState {
  status: Status;
  message: string;
  media?: MediaRef;
  frame?: DecodedFrame;
  exportResult?: ExportJobResult;
  error?: AppError;
}

interface PlaybackState {
  isPlaying: boolean;
  isScrubbing: boolean;
  currentFrame: number;
  viewerMode: ViewerMode;
  splitPosition: number;
}

const api = window.chromaNode;
const initialMessage = "Import an MP4 or MOV clip to start playback inspection.";

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<FrameRenderer | null>(null);
  const frameRequestId = useRef(0);
  const [diagnostics, setDiagnostics] = useState<FfmpegDiagnostics | undefined>();
  const [previewBusy, setPreviewBusy] = useState(false);
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    isScrubbing: false,
    currentFrame: 0,
    viewerMode: "graded",
    splitPosition: 50
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

  const diagnosticsLabel = useMemo(() => {
    if (!diagnostics) {
      return "Checking FFmpeg";
    }

    return diagnostics.available ? "FFmpeg ready" : "FFmpeg unavailable";
  }, [diagnostics]);

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

    setState({
      status: "ready",
      message: "Clip imported. Viewer is ready for playback.",
      media,
      frame: frameResult.value
    });
  }, [state.media]);

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
    if (!state.frame || !rendererRef.current) {
      return;
    }

    void rendererRef.current.setFrame(state.frame);
  }, [state.frame]);

  useEffect(() => {
    if (!mediaUrl || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.pause();
    video.load();
    video.currentTime = 0;
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
            <MetadataRow label="Split" value={`${playback.splitPosition}%`} />
          </dl>

          <div className="panel-title export-title">Export Spike</div>
          {state.exportResult ? <ExportSummary result={state.exportResult} /> : <p className="muted">No export run yet.</p>}
        </aside>

        <section className="viewer-column" aria-label="Viewer">
          <div className={`viewer-frame viewer-mode-${playback.viewerMode}`}>
            {mediaUrl ? (
              <div className="viewer-media">
                <video
                  key={mediaUrl}
                  ref={videoRef}
                  className="viewer-video"
                  src={mediaUrl}
                  muted
                  playsInline
                  preload="metadata"
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
                {playback.viewerMode === "split" ? (
                  <>
                    <div className="split-shade split-left" style={{ width: `${playback.splitPosition}%` }} />
                    <div className="split-rule" style={{ left: `${playback.splitPosition}%` }} />
                  </>
                ) : null}
                <div className="viewer-badge viewer-badge-left">{playback.viewerMode === "graded" ? "Graded" : "Original"}</div>
                {playback.viewerMode === "split" ? <div className="viewer-badge viewer-badge-right">Graded</div> : null}
              </div>
            ) : null}

            <canvas ref={canvasRef} className="viewer-canvas-probe" aria-hidden="true" />
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
                  max="100"
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
      </section>
    </main>
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
