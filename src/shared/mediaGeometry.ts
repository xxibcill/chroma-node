export const MAX_DISPLAY_WIDTH = 3840;
export const MAX_DISPLAY_HEIGHT = 2160;

export function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function isRotated(rotation: number): boolean {
  const normalized = normalizeRotation(rotation);
  return normalized === 90 || normalized === 270;
}

export function getDisplaySize(
  codedWidth: number,
  codedHeight: number,
  rotation: number
): { displayWidth: number; displayHeight: number } {
  if (isRotated(rotation)) {
    return { displayWidth: codedHeight, displayHeight: codedWidth };
  }
  return { displayWidth: codedWidth, displayHeight: codedHeight };
}

export function getAspectRatio(width: number, height: number): number {
  if (height <= 0) {
    return 0;
  }
  return width / height;
}

export function clampDisplayWidth(width: number): number {
  return clampInteger(width, 1, MAX_DISPLAY_WIDTH);
}

export function clampDisplayHeight(height: number): number {
  return clampInteger(height, 1, MAX_DISPLAY_HEIGHT);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}
