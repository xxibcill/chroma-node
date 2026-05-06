import { useCallback, useRef } from "react";
import type { RgbaFrame } from "../scopes/scopeAnalysis";
import { createGradedScopeFrame, createVectorscopeGuides, createVectorscopeHistogram, createWaveformHistogram } from "../scopes/scopeAnalysis";
import { clearScopeCanvas, drawVectorscope, drawWaveformScope } from "../scopes/scopeRender";
import { getScopeMaxWidth } from "../../shared/previewPolicy";

interface UseScopesWorkflowOptions {
  projectNodes: import("../../shared/colorEngine").ColorNode[];
  media: { displayWidth: number; displayHeight: number } | undefined;
  frame: { dataUrl: string; width: number; height: number } | undefined;
  maxWidth?: number;
}

interface UseScopesWorkflowResult {
  runScopeAnalysis: (isPlaybackSample: boolean, options: {
    waveformCanvas: HTMLCanvasElement | null;
    vectorscopeCanvas: HTMLCanvasElement | null;
    video?: HTMLVideoElement | null;
  }) => Promise<void>;
  scheduleScopeAnalysis: (isPlaybackSample: boolean, options: {
    waveformCanvas: HTMLCanvasElement | null;
    vectorscopeCanvas: HTMLCanvasElement | null;
    video?: HTMLVideoElement | null;
  }) => void;
  cleanupScopes: () => void;
}

const scopeDebounceMs = 50;

export function useScopesWorkflow({
  projectNodes,
  media,
  frame
}: UseScopesWorkflowOptions): UseScopesWorkflowResult {
  const scopeRequestId = useRef(0);
  const scopeDebounceTimer = useRef<number | undefined>(undefined);
  const scopeImageCache = useRef<{ dataUrl: string; image: HTMLImageElement } | undefined>(undefined);

  const loadScopeImage = useCallback(async (dataUrl: string): Promise<HTMLImageElement> => {
    if (scopeImageCache.current?.dataUrl === dataUrl) {
      return scopeImageCache.current.image;
    }

    const image = await loadImage(dataUrl);
    scopeImageCache.current = { dataUrl, image };
    return image;
  }, []);

  const captureScopeFrame = useCallback((
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    targetMaxWidth: number
  ): RgbaFrame => {
    const scale = sourceWidth > targetMaxWidth ? targetMaxWidth / sourceWidth : 1;
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

    return { width, height, data: imageData.data };
  }, []);

  const runScopeAnalysis = useCallback(async (
    isPlaybackSample: boolean,
    options: {
      waveformCanvas: HTMLCanvasElement | null;
      vectorscopeCanvas: HTMLCanvasElement | null;
      video?: HTMLVideoElement | null;
    }
  ) => {
    const { waveformCanvas, vectorscopeCanvas, video } = options;
    if (!waveformCanvas || !vectorscopeCanvas) return;

    const requestId = ++scopeRequestId.current;
    const displayWidth = media?.displayWidth ?? frame?.width ?? 0;
    const displayHeight = media?.displayHeight ?? frame?.height ?? 0;
    const scopeMaxWidth = getScopeMaxWidth(displayWidth, displayHeight, isPlaybackSample);

    try {
      let sourceFrame: RgbaFrame | undefined;

      if (isPlaybackSample && video) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          sourceFrame = captureScopeFrame(video, video.videoWidth, video.videoHeight, scopeMaxWidth);
        }
      }

      if (!sourceFrame && frame && displayWidth > 0 && displayHeight > 0) {
        const image = await loadScopeImage(frame.dataUrl);
        if (requestId !== scopeRequestId.current) return;
        sourceFrame = captureScopeFrame(image, displayWidth, displayHeight, scopeMaxWidth);
      }

      if (!sourceFrame) {
        clearScopeCanvas(waveformCanvas, "No frame");
        clearScopeCanvas(vectorscopeCanvas, "No frame");
        return;
      }

      const gradedFrame = createGradedScopeFrame(sourceFrame, projectNodes);
      const waveform = createWaveformHistogram(gradedFrame, 640, 256);
      const vectorscope = createVectorscopeHistogram(gradedFrame, 220);
      const guides = createVectorscopeGuides(220);

      if (requestId !== scopeRequestId.current) return;

      drawWaveformScope(waveformCanvas, waveform);
      drawVectorscope(vectorscopeCanvas, vectorscope, guides);
    } catch {
      if (requestId !== scopeRequestId.current) return;

      clearScopeCanvas(waveformCanvas, "Scope error");
      clearScopeCanvas(vectorscopeCanvas, "Scope error");
    }
  }, [media?.displayWidth, media?.displayHeight, frame, projectNodes, loadScopeImage, captureScopeFrame]);

  const scheduleScopeAnalysis = useCallback((
    isPlaybackSample: boolean,
    options: {
      waveformCanvas: HTMLCanvasElement | null;
      vectorscopeCanvas: HTMLCanvasElement | null;
      video?: HTMLVideoElement | null;
    }
  ) => {
    if (scopeDebounceTimer.current !== undefined) {
      window.clearTimeout(scopeDebounceTimer.current);
      scopeDebounceTimer.current = undefined;
    }

    if (isPlaybackSample) {
      void runScopeAnalysis(true, options);
      return;
    }

    scopeDebounceTimer.current = window.setTimeout(() => {
      scopeDebounceTimer.current = undefined;
      void runScopeAnalysis(false, options);
    }, scopeDebounceMs);
  }, [runScopeAnalysis]);

  const cleanupScopes = useCallback(() => {
    if (scopeDebounceTimer.current !== undefined) {
      window.clearTimeout(scopeDebounceTimer.current);
      scopeDebounceTimer.current = undefined;
    }
    scopeRequestId.current += 1;
  }, []);

  return {
    runScopeAnalysis,
    scheduleScopeAnalysis,
    cleanupScopes
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode scope source frame."));
    image.src = dataUrl;
  });
}