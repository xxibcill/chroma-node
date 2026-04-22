import type { MediaRef } from "../shared/ipc";

const fallbackFrameRate = 24;

export function getPlaybackFrameRate(media: MediaRef | undefined): number {
  return media && Number.isFinite(media.frameRate) && media.frameRate > 0 ? media.frameRate : fallbackFrameRate;
}

export function getTotalFrameCount(media: MediaRef | undefined): number {
  if (!media) {
    return 1;
  }

  if (media.totalFrames && media.totalFrames > 0) {
    return media.totalFrames;
  }

  const estimated = Math.round(media.durationSeconds * getPlaybackFrameRate(media));
  return Math.max(1, estimated);
}

export function getLastFrameIndex(media: MediaRef | undefined): number {
  return Math.max(0, getTotalFrameCount(media) - 1);
}

export function clampFrameIndex(frameIndex: number, media: MediaRef | undefined): number {
  if (!Number.isFinite(frameIndex)) {
    return 0;
  }

  return Math.max(0, Math.min(getLastFrameIndex(media), Math.round(frameIndex)));
}

export function frameToTimeSeconds(frameIndex: number, media: MediaRef | undefined): number {
  if (!media) {
    return 0;
  }

  const frameRate = getPlaybackFrameRate(media);
  const frameTime = clampFrameIndex(frameIndex, media) / frameRate;
  return clampNumber(frameTime, 0, media.durationSeconds);
}

export function timeToFrameIndex(timeSeconds: number, media: MediaRef | undefined): number {
  if (!media) {
    return 0;
  }

  return clampFrameIndex(Math.floor(timeSeconds * getPlaybackFrameRate(media)), media);
}

export function formatTimecode(frameIndex: number, media: MediaRef | undefined): string {
  const frameRate = getPlaybackFrameRate(media);
  const clampedFrame = clampFrameIndex(frameIndex, media);
  const wholeFps = Math.max(1, Math.round(frameRate));
  const hours = Math.floor(clampedFrame / (wholeFps * 3600));
  const minutes = Math.floor((clampedFrame / (wholeFps * 60)) % 60);
  const seconds = Math.floor((clampedFrame / wholeFps) % 60);
  const frames = clampedFrame % wholeFps;

  return [hours, minutes, seconds, frames].map((part) => part.toString().padStart(2, "0")).join(":");
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}
