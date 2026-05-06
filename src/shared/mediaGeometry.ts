export const MAX_DISPLAY_WIDTH = 3840;
export const MAX_DISPLAY_HEIGHT = 2160;
export const MAX_SUPPORTED_DISPLAY_EDGE = 3840;
export const MAX_SUPPORTED_DISPLAY_PIXELS = MAX_DISPLAY_WIDTH * MAX_DISPLAY_HEIGHT;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Original coded raster dimensions (before display rotation). */
export interface CodedRaster {
  width: number;
  height: number;
}

/** Display raster dimensions (after applying rotation). */
export interface DisplayRaster {
  width: number;
  height: number;
}

/** A rectangle within a source raster, used for contained-viewer and crop/pad rects. */
export interface ContainedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A point in normalized [0, 1] coordinate space. */
export interface NormalizedPoint {
  x: number;
  y: number;
}

/** Resize policy controlling how source content fills a target raster. */
export type ResizePolicy = "fit" | "crop" | "pad";

/**
 * Mapping from a source region to a target region, used by overlays, scopes sampling,
 * and tracking coordinate transforms.
 */
export interface OverlayMapping {
  /** Horizontal offset in source pixels where the mapped region starts. */
  sourceX: number;
  /** Vertical offset in source pixels where the mapped region starts. */
  sourceY: number;
  /** Width of the source region being mapped. */
  sourceWidth: number;
  /** Height of the source region being mapped. */
  sourceHeight: number;
  /** Target width (the destination container width). */
  targetWidth: number;
  /** Target height (the destination container height). */
  targetHeight: number;
}

// ---------------------------------------------------------------------------
// Rotation helpers
// ---------------------------------------------------------------------------

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function isRotated(rotation: number): boolean {
  const normalized = normalizeRotation(rotation);
  return normalized === 90 || normalized === 270;
}

// ---------------------------------------------------------------------------
// Display size / aspect ratio helpers
// ---------------------------------------------------------------------------

/**
 * Returns the display raster for a given coded raster and rotation.
 * For 90/270 degree rotations the width and height are swapped.
 */
export function getDisplaySize(
  codedWidth: number,
  codedHeight: number,
  rotation: number
): DisplayRaster {
  if (isRotated(rotation)) {
    return { width: codedHeight, height: codedWidth };
  }
  return { width: codedWidth, height: codedHeight };
}

export function getAspectRatio(width: number, height: number): number {
  if (height <= 0) {
    return 0;
  }
  return width / height;
}

export function isSupportedDisplayRaster(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }

  const displayWidth = Math.round(width);
  const displayHeight = Math.round(height);
  if (displayWidth < 1 || displayHeight < 1) {
    return false;
  }

  return Math.max(displayWidth, displayHeight) <= MAX_SUPPORTED_DISPLAY_EDGE
    && displayWidth * displayHeight <= MAX_SUPPORTED_DISPLAY_PIXELS;
}

export function clampDisplaySize(
  width: number,
  height: number
): DisplayRaster {
  let displayWidth = toPositiveInteger(width);
  let displayHeight = toPositiveInteger(height);

  if (isSupportedDisplayRaster(displayWidth, displayHeight)) {
    return { width: displayWidth, height: displayHeight };
  }

  const edgeScale = MAX_SUPPORTED_DISPLAY_EDGE / Math.max(displayWidth, displayHeight);
  const pixelScale = Math.sqrt(MAX_SUPPORTED_DISPLAY_PIXELS / (displayWidth * displayHeight));
  const scale = Math.min(1, edgeScale, pixelScale);
  displayWidth = Math.max(1, Math.floor(displayWidth * scale));
  displayHeight = Math.max(1, Math.floor(displayHeight * scale));

  while (!isSupportedDisplayRaster(displayWidth, displayHeight)) {
    if (displayWidth >= displayHeight && displayWidth > 1) {
      displayWidth -= 1;
      continue;
    }
    if (displayHeight > 1) {
      displayHeight -= 1;
      continue;
    }
    break;
  }

  return { width: displayWidth, height: displayHeight };
}

// ---------------------------------------------------------------------------
// Contained rect (viewer fit)
// ---------------------------------------------------------------------------

/**
 * Returns the largest rectangle of the source content that fits within the
 * container while preserving aspect ratio (letterbox / pillarbox fit).
 *
 * If the container is wider than the source aspect ratio, the content fills
 * the container height and is centered horizontally. Otherwise it fills the
 * container width and is centered vertically.
 */
export function getContainedRect(
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ContainedRect {
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

// ---------------------------------------------------------------------------
// Resize policy helpers
// ---------------------------------------------------------------------------

/**
 * Computed output dimensions after applying a resize policy.
 * Returns the target dimensions directly (caller applies any additional clamping).
 */
export interface ResizeResult {
  width: number;
  height: number;
}

/**
 * Applies a resize policy to determine output dimensions given source and target rasters.
 *
 * - `"fit"`: Fit the entire source within the target, preserving aspect ratio.
 * - `"crop"`: Fill the target entirely from the source, potentially cropping edges.
 * - `"pad"`: Source fills the target (like crop) but padding may be applied to preserve
 *            the full source when aspect ratios differ (pad calculation is caller responsibility;
 *            this returns the same as crop but signals the intent via a separate rect).
 */
export function applyResizePolicy(
  policy: ResizePolicy,
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ResizeResult {
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  if (policy === "fit") {
    if (sourceAspect > targetAspect) {
      return { width: targetWidth, height: Math.round(targetWidth / sourceAspect) };
    }
    return { width: Math.round(targetHeight * sourceAspect), height: targetHeight };
  }

  // crop and pad both fill the target; pad pads, crop crops.
  // Caller uses getPaddedContentRect for pad positioning.
  return { width: targetWidth, height: targetHeight };
}

// ---------------------------------------------------------------------------
// Pad rect (used by pad resize policy)
// ---------------------------------------------------------------------------

/**
 * Returns the content rect within a target raster when padding is applied.
 * The source content is scaled to fit entirely within the target, then centered.
 * Any remaining space is padding (filled with black by the caller).
 */
export function getPaddedContentRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): ContainedRect {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  return {
    left: Math.floor((targetWidth - width) / 2),
    top: Math.floor((targetHeight - height) / 2),
    width,
    height
  };
}

// ---------------------------------------------------------------------------
// Overlay / scope / tracking mapping helpers
// ---------------------------------------------------------------------------

/**
 * Maps a normalized point in the destination container to the corresponding
 * normalized point in the source raster, accounting for contained-rect centering.
 *
 * @param point      - A normalized [0,1] point in the destination container.
 * @param sourceRect - The contained rect within the source raster.
 * @param targetWidth - The container width.
 * @param targetHeight - The container height.
 */
export function mapPointToSource(
  point: NormalizedPoint,
  sourceRect: ContainedRect,
  targetWidth: number,
  targetHeight: number
): NormalizedPoint {
  const x = (sourceRect.left + point.x * sourceRect.width) / targetWidth;
  const y = (sourceRect.top + point.y * sourceRect.height) / targetHeight;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}

/**
 * Computes the overlay mapping from source pixels to a target container
 * given a resize policy.
 *
 * For "fit", the source may not fill the target — use mapPointToSource.
 * For "crop", the source fills the target with no letterboxing.
 * For "pad", the source is centered within the target with possible padding.
 */
export function getOverlayMapping(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  policy: ResizePolicy
): OverlayMapping {
  if (policy === "pad") {
    const padRect = getPaddedContentRect(sourceWidth, sourceHeight, targetWidth, targetHeight);
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth,
      sourceHeight,
      targetWidth: padRect.width,
      targetHeight: padRect.height
    };
  }

  if (policy === "fit") {
    const containerAspect = targetWidth / targetHeight;
    const sourceAspect = sourceWidth / sourceHeight;

    let mappedWidth: number;
    let mappedHeight: number;

    if (containerAspect > sourceAspect) {
      // Container is wider — source content fills height, centered horizontally
      mappedHeight = targetHeight;
      mappedWidth = Math.round(targetHeight * sourceAspect);
    } else {
      // Container is taller — source content fills width, centered vertically
      mappedWidth = targetWidth;
      mappedHeight = Math.round(targetWidth / sourceAspect);
    }

    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth,
      sourceHeight,
      targetWidth: mappedWidth,
      targetHeight: mappedHeight
    };
  }

  // crop — source fills target with no padding
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight
  };
}

// ---------------------------------------------------------------------------
// Fit / crop / pad calculation shortcuts
// ---------------------------------------------------------------------------

/**
 * Calculate the output dimensions for a "fit" resize: source fits entirely
 * within target bounds, preserving aspect ratio.
 */
export function calcFitDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): ResizeResult {
  return applyResizePolicy("fit", targetWidth, targetHeight, sourceWidth, sourceHeight);
}

/**
 * Calculate the output dimensions for a "crop" resize: target is filled
 * by cropped source (aspect ratio of target is preserved, source may be cropped).
 * Returns the target dimensions directly — caller handles source cropping region.
 */
export function calcCropDimensions(
  targetWidth: number,
  targetHeight: number
): ResizeResult {
  return { width: targetWidth, height: targetHeight };
}

/**
 * Calculate the output dimensions for a "pad" resize: source fills target
 * while preserving aspect ratio; remaining space is padded.
 * Returns the scaled source dimensions.
 */
export function calcPadDimensions(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): ResizeResult {
  const padRect = getPaddedContentRect(sourceWidth, sourceHeight, targetWidth, targetHeight);
  return { width: padRect.width, height: padRect.height };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toPositiveInteger(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}
