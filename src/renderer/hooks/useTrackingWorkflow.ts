import { useCallback, useRef, useState } from "react";
import type { MediaRef } from "../../shared/ipc";
import type { ColorNode, PowerWindowShape, TrackingKeyframe } from "../../shared/colorEngine";
import type { LumaFrame } from "../tracking/templateTracker";
import { clampFrameIndex } from "../playback";
import { getTrackingMaxWidth } from "../../shared/previewPolicy";
import { matchTranslation, getScaledSearchRadius, TrackingFailure } from "../tracking/templateTracker";

interface UseTrackingWorkflowOptions {
  media: MediaRef | undefined;
  activeNode: ColorNode | undefined;
  currentFrame: number;
  lastFrameIndex: number;
  onTrackingKeyframesCommit: (
    nodeId: string,
    targetShape: PowerWindowShape,
    keyframes: TrackingKeyframe[],
    trackingState: "ready" | "failed",
    failure?: { frame: number; reason: string }
  ) => void;
  onPlaybackChange: (playback: { isPlaying: boolean; isScrubbing: boolean }) => void;
  onStatusChange: (status: "idle" | "busy" | "ready" | "error", message: string, error?: import("../../shared/ipc").AppError) => void;
}

interface TrackingOperation {
  id: number;
  direction: "forward" | "backward";
  targetShape: PowerWindowShape;
  currentFrame: number;
  completedFrames: number;
  totalFrames: number;
  message: string;
}

interface UseTrackingWorkflowResult {
  trackingOperation: TrackingOperation | undefined;
  runWindowTracking: (direction: "forward" | "backward") => Promise<void>;
  cancelTracking: () => void;
  setTrackingTarget: (targetShape: PowerWindowShape) => void;
  fetchTrackingFrame: (media: MediaRef, frameIndex: number) => Promise<LumaFrame>;
}

const api = window.chromaNode;

export function useTrackingWorkflow({
  media,
  activeNode,
  currentFrame,
  lastFrameIndex,
  onTrackingKeyframesCommit,
  onPlaybackChange,
  onStatusChange
}: UseTrackingWorkflowOptions): UseTrackingWorkflowResult {
  const [trackingOperation, setTrackingOperation] = useState<TrackingOperation | undefined>();
  const trackingRequestId = useRef(0);
  const cancelledTrackingIds = useRef(new Set<number>());

  const fetchTrackingFrame = useCallback(async (mediaRef: MediaRef, frameIndex: number): Promise<LumaFrame> => {
    if (!api) {
      throw new Error("Electron preload API is unavailable.");
    }

    const targetFrame = clampFrameIndex(frameIndex, mediaRef);
    const trackingMaxWidth = getTrackingMaxWidth(mediaRef.displayWidth, mediaRef.displayHeight);
    const response = await api.extractFrame({
      sourcePath: mediaRef.sourcePath,
      frameIndex: targetFrame,
      maxWidth: trackingMaxWidth
    });
    const result = response.result;

    if (!result.ok) {
      throw new Error(`Frame access failed for ${mediaRef.sourcePath} at frame ${targetFrame + 1}: ${result.error.message}`);
    }

    return decodedFrameToLumaFrame(result.value);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setTrackingTarget = useCallback((_targetShape: PowerWindowShape) => {
    if (trackingOperation) return;
    // Tracking target is set on the node via onTrackingKeyframesCommit pattern
    // This just validates the operation isn't running
  }, [trackingOperation]);

  const runWindowTracking = useCallback(async (direction: "forward" | "backward") => {
    if (!media || !activeNode || trackingOperation) return;

    const nodeId = activeNode.id;
    const targetShape = activeNode.tracking.targetShape;
    const baseWindow = activeNode.windows[targetShape];
    const startFrame = clampFrameIndex(currentFrame, media);
    const step = direction === "forward" ? 1 : -1;
    const finalFrame = direction === "forward" ? lastFrameIndex : 0;
    const totalSteps = Math.abs(finalFrame - startFrame);

    if (!baseWindow.enabled) {
      onStatusChange("error", `Enable the ${targetShape} window before tracking.`, {
        code: "TRACKING_FAILED",
        message: `Enable the ${targetShape} window before tracking.`
      });
      return;
    }

    if (totalSteps === 0) {
      onStatusChange("ready", "Tracking needs at least one adjacent frame.");
      return;
    }

    const requestId = ++trackingRequestId.current;
    cancelledTrackingIds.current.delete(requestId);
    onPlaybackChange({ isPlaying: false, isScrubbing: false });

    setTrackingOperation({
      id: requestId,
      direction,
      targetShape,
      currentFrame: startFrame,
      completedFrames: 0,
      totalFrames: totalSteps,
      message: `Tracking ${targetShape} ${direction} from frame ${startFrame + 1}.`
    });
    onStatusChange("ready", "Tracking started.");

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
          onStatusChange("ready", "Tracking cancelled.");
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

      onTrackingKeyframesCommit(nodeId, targetShape, keyframes, "ready");
      setTrackingOperation(undefined);
      onStatusChange("ready", `Tracking complete: ${keyframes.length} keyframes written.`);
    } catch (error) {
      const failureFrame = error instanceof TrackingFailure ? error.frame : currentFrame;
      const failureReason = error instanceof Error ? error.message : "Tracking failed.";

      if (keyframes.length > 1) {
        onTrackingKeyframesCommit(nodeId, targetShape, keyframes, "failed", {
          frame: failureFrame,
          reason: failureReason
        });
      }

      setTrackingOperation(undefined);
      onStatusChange("error", failureReason, {
        code: "TRACKING_FAILED",
        message: failureReason,
        detail: `Frame ${failureFrame + 1}`
      });
    } finally {
      cancelledTrackingIds.current.delete(requestId);
    }
  }, [media, activeNode, trackingOperation, currentFrame, lastFrameIndex, fetchTrackingFrame, onPlaybackChange, onStatusChange, onTrackingKeyframesCommit]);

  const cancelTracking = useCallback(() => {
    if (!trackingOperation) return;

    cancelledTrackingIds.current.add(trackingOperation.id);
    setTrackingOperation((current) => current ? { ...current, message: "Cancelling tracking..." } : current);
  }, [trackingOperation]);

  return {
    trackingOperation,
    runWindowTracking,
    cancelTracking,
    setTrackingTarget,
    fetchTrackingFrame
  };
}

async function decodedFrameToLumaFrame(frame: { dataUrl: string; width?: number; height?: number }): Promise<LumaFrame> {
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
    image.onerror = () => reject(new Error("Could not decode tracking frame."));
    image.src = dataUrl;
  });
}