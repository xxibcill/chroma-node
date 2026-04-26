/**
 * Preview proxy policy for large media handling.
 *
 * Defines when preview should use full resolution vs a reduced proxy size,
 * balancing interactivity against visual trustworthiness.
 */

export const PREVIEW_PROXY_THRESHOLD_WIDTH = 1920;
export const PREVIEW_PROXY_THRESHOLD_HEIGHT = 1080;

export const PREVIEW_MAX_WIDTH_FULL = 1920;
export const PREVIEW_MAX_WIDTH_PROXY = 1280;
export const PREVIEW_MAX_WIDTH_THUMBNAIL = 640;

export interface PreviewPolicy {
  isProxy: boolean;
  maxWidth: number;
  sourceDescription: string;
}

export function getPreviewPolicy(displayWidth: number, displayHeight: number): PreviewPolicy {
  const pixels = displayWidth * displayHeight;
  const isLargeRaster = displayWidth > PREVIEW_PROXY_THRESHOLD_WIDTH || displayHeight > PREVIEW_PROXY_THRESHOLD_HEIGHT;

  if (pixels > 1920 * 1200) {
    return {
      isProxy: true,
      maxWidth: PREVIEW_MAX_WIDTH_PROXY,
      sourceDescription: `${displayWidth}x${displayHeight} (high-res proxy)`
    };
  }

  if (isLargeRaster) {
    return {
      isProxy: false,
      maxWidth: PREVIEW_MAX_WIDTH_FULL,
      sourceDescription: `${displayWidth}x${displayHeight} (full res)`
    };
  }

  return {
    isProxy: false,
    maxWidth: PREVIEW_MAX_WIDTH_FULL,
    sourceDescription: `${displayWidth}x${displayHeight}`
  };
}

export function getTrackingMaxWidth(displayWidth: number, displayHeight: number): number {
  if (displayWidth > 1920 || displayHeight > 1080) {
    return PREVIEW_MAX_WIDTH_THUMBNAIL;
  }
  return 640;
}

export const SCOPE_PAUSED_MAX_WIDTH = 1280;
export const SCOPE_PLAYBACK_MAX_WIDTH = 640;

export function getScopeMaxWidth(displayWidth: number, displayHeight: number, isPlayback: boolean): number {
  const pixels = displayWidth * displayHeight;

  if (isPlayback) {
    if (pixels > 1920 * 1080) {
      return 320;
    }
    if (pixels > 1280 * 720) {
      return SCOPE_PLAYBACK_MAX_WIDTH;
    }
    return SCOPE_PLAYBACK_MAX_WIDTH;
  }

  if (pixels > 1920 * 1080) {
    return 640;
  }
  if (pixels > 1280 * 720) {
    return SCOPE_PAUSED_MAX_WIDTH;
  }
  return SCOPE_PAUSED_MAX_WIDTH;
}
