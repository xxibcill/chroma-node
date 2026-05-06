import { useCallback, useState } from "react";
import type { MediaRef } from "../../shared/ipc";
import { clampFrameIndex } from "../playback";

interface UsePlaybackWorkflowOptions {
  initialFrame?: number;
  viewerMode?: "original" | "graded" | "split";
  splitPosition?: number;
  media: MediaRef | undefined;
  onPlaybackChange: (playback: {
    isPlaying: boolean;
    isScrubbing: boolean;
    currentFrame: number;
    viewerMode: "original" | "graded" | "split";
    splitPosition: number;
  }) => void;
  onStatusChange: (status: "idle" | "busy" | "ready" | "error", message: string) => void;
}

interface UsePlaybackWorkflowResult {
  playback: {
    isPlaying: boolean;
    isScrubbing: boolean;
    currentFrame: number;
    viewerMode: "original" | "graded" | "split";
    splitPosition: number;
  };
  seekVideoToFrame: (frameIndex: number, media?: MediaRef) => void;
  togglePlayback: () => void;
  handleScrubChange: (value: string) => void;
  commitScrub: () => void;
  commitFrame: (frameIndex: number) => void;
  setViewerMode: (mode: "original" | "graded" | "split") => void;
  setSplitPosition: (position: number) => void;
  lastFrameIndex: number;
}

export function usePlaybackWorkflow({
  initialFrame = 0,
  viewerMode = "graded",
  splitPosition = 0.5,
  media,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPlaybackChange: _onPlaybackChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStatusChange: _onStatusChange
}: UsePlaybackWorkflowOptions): UsePlaybackWorkflowResult {
  const [playback, setPlayback] = useState({
    isPlaying: false,
    isScrubbing: false,
    currentFrame: initialFrame,
    viewerMode: viewerMode as "original" | "graded" | "split",
    splitPosition
  });

  const lastFrameIndex = media ? Math.max(0, (media.totalFrames ?? Math.ceil(media.durationSeconds * media.frameRate)) - 1) : 0;

  const seekVideoToFrame = useCallback((frameIndex: number, mediaRef?: MediaRef) => {
    // Video seeking is handled externally via refs - this just validates the frame
    const targetMedia = mediaRef ?? media;
    if (!targetMedia) return;

    const clampedFrame = clampFrameIndex(frameIndex, targetMedia);
    // Return the clamped frame for external use
    void targetMedia;
    void clampedFrame;
  }, [media]);

  const togglePlayback = useCallback(() => {
    // Play/pause is handled externally - this just updates state
    setPlayback((current) => ({ ...current, isPlaying: !current.isPlaying }));
  }, []);

  const handleScrubChange = useCallback((value: string) => {
    if (!media) return;

    const frameIndex = clampFrameIndex(Number(value), media);
    setPlayback((current) => ({
      ...current,
      isScrubbing: true,
      currentFrame: frameIndex
    }));
  }, [media]);

  const commitFrame = useCallback((frameIndex: number) => {
    if (!media) return;

    const targetFrame = clampFrameIndex(frameIndex, media);
    setPlayback((current) => ({
      ...current,
      isPlaying: false,
      isScrubbing: false,
      currentFrame: targetFrame
    }));
  }, [media]);

  const commitScrub = useCallback(() => {
    if (playback.isScrubbing) {
      commitFrame(playback.currentFrame);
    }
  }, [commitFrame, playback.isScrubbing, playback.currentFrame]);

  const setViewerMode = useCallback((mode: "original" | "graded" | "split") => {
    setPlayback((current) => ({ ...current, viewerMode: mode }));
  }, []);

  const setSplitPosition = useCallback((position: number) => {
    setPlayback((current) => ({ ...current, splitPosition: position }));
  }, []);

  return {
    playback,
    seekVideoToFrame,
    togglePlayback,
    handleScrubChange,
    commitScrub,
    commitFrame,
    setViewerMode,
    setSplitPosition,
    lastFrameIndex
  };
}