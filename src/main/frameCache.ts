/**
 * Frame decode cache for reducing repeated decode cost.
 *
 * Cache policy is explicit about retention and invalidation:
 * - Playback preview: single entry for current frame
 * - Tracking: retains recent frames with LRU eviction
 * - Memory-bounded by maxEntries limit
 */

import type { DecodedFrame } from "../shared/ipc.js";

interface CacheEntry {
  frame: DecodedFrame;
  lastAccessed: number;
}

const MAX_TRACKING_CACHE_ENTRIES = 8;
const MAX_PREVIEW_CACHE_ENTRIES = 2;
const CACHE_TTL_MS = 30_000;

const trackingCache = new Map<string, CacheEntry>();
const previewCache = new Map<string, CacheEntry>();

function makeKey(sourcePath: string, frameIndex: number | undefined, maxWidth: number): string {
  return `${sourcePath}:${frameIndex ?? "time"}:${maxWidth}`;
}

export function getCachedFrame(sourcePath: string, frameIndex: number | undefined, maxWidth: number): DecodedFrame | undefined {
  const key = makeKey(sourcePath, frameIndex, maxWidth);
  const entry = previewCache.get(key) ?? trackingCache.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.lastAccessed > CACHE_TTL_MS) {
    previewCache.delete(key);
    trackingCache.delete(key);
    return undefined;
  }

  entry.lastAccessed = Date.now();
  return entry.frame;
}

export function setPreviewFrame(sourcePath: string, frameIndex: number | undefined, maxWidth: number, frame: DecodedFrame): void {
  const key = makeKey(sourcePath, frameIndex, maxWidth);

  if (previewCache.size >= MAX_PREVIEW_CACHE_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [k, v] of previewCache) {
      if (v.lastAccessed < oldestTime) {
        oldestTime = v.lastAccessed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      previewCache.delete(oldestKey);
    }
  }

  previewCache.set(key, { frame, lastAccessed: Date.now() });
}

export function setTrackingFrame(sourcePath: string, frameIndex: number, maxWidth: number, frame: DecodedFrame): void {
  const key = makeKey(sourcePath, frameIndex, maxWidth);

  if (trackingCache.size >= MAX_TRACKING_CACHE_ENTRIES) {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;
    for (const [k, v] of trackingCache) {
      if (v.lastAccessed < oldestTime) {
        oldestTime = v.lastAccessed;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      trackingCache.delete(oldestKey);
    }
  }

  trackingCache.set(key, { frame, lastAccessed: Date.now() });
}

export function clearPreviewCache(): void {
  previewCache.clear();
}

export function clearTrackingCache(): void {
  trackingCache.clear();
}

export function clearAllCaches(): void {
  previewCache.clear();
  trackingCache.clear();
}

export function getCacheStats(): { previewEntries: number; trackingEntries: number } {
  return {
    previewEntries: previewCache.size,
    trackingEntries: trackingCache.size
  };
}
