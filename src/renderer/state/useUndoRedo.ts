import { useCallback, useRef, useEffect } from "react";
import type { ChromaProject } from "../../shared/project";

const MAX_HISTORY_SIZE = 50;
const COALESCE_WINDOW_MS = 300;

export interface HistoryState {
  past: ChromaProject[];
  future: ChromaProject[];
}

export interface UseUndoRedoResult {
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (snapshot: ChromaProject) => void;
  undo: () => ChromaProject | undefined;
  redo: () => ChromaProject | undefined;
  clearHistory: () => void;
}

export function useUndoRedo(): UseUndoRedoResult {
  const historyRef = useRef<HistoryState>({ past: [], future: [] });
  const lastPushTimeRef = useRef<number>(0);
  const pendingCoalesceRef = useRef<ChromaProject | undefined>(undefined);
  const coalesceTimerRef = useRef<number | undefined>(undefined);

  const pushHistory = useCallback((snapshot: ChromaProject) => {
    const now = performance.now();
    const timeSinceLast = now - lastPushTimeRef.current;

    if (timeSinceLast < COALESCE_WINDOW_MS && historyRef.current.past.length > 0) {
      pendingCoalesceRef.current = snapshot;
      if (coalesceTimerRef.current !== undefined) {
        window.clearTimeout(coalesceTimerRef.current);
      }
      coalesceTimerRef.current = window.setTimeout(() => {
        if (pendingCoalesceRef.current) {
          const current = historyRef.current.past[historyRef.current.past.length - 1];
          if (pendingCoalesceRef.current !== current) {
            historyRef.current = {
              past: [...historyRef.current.past.slice(-MAX_HISTORY_SIZE + 1), pendingCoalesceRef.current],
              future: []
            };
          }
          pendingCoalesceRef.current = undefined;
          lastPushTimeRef.current = performance.now();
        }
      }, COALESCE_WINDOW_MS);
      return;
    }

    if (pendingCoalesceRef.current) {
      const current = historyRef.current.past[historyRef.current.past.length - 1];
      if (pendingCoalesceRef.current !== current) {
        historyRef.current = {
          past: [...historyRef.current.past.slice(-MAX_HISTORY_SIZE + 1), pendingCoalesceRef.current],
          future: []
        };
      }
      pendingCoalesceRef.current = undefined;
    }

    historyRef.current = {
      past: [...historyRef.current.past.slice(-MAX_HISTORY_SIZE + 1), snapshot],
      future: []
    };
    lastPushTimeRef.current = now;
  }, []);

  const undo = useCallback((): ChromaProject | undefined => {
    if (coalesceTimerRef.current !== undefined) {
      window.clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = undefined;
    }
    pendingCoalesceRef.current = undefined;

    const { past, future } = historyRef.current;
    if (past.length < 2) {
      return undefined;
    }

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    historyRef.current = {
      past: newPast,
      future: [previous, ...future]
    };

    return newPast[newPast.length - 1];
  }, []);

  const redo = useCallback((): ChromaProject | undefined => {
    if (coalesceTimerRef.current !== undefined) {
      window.clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = undefined;
    }
    pendingCoalesceRef.current = undefined;

    const { past, future } = historyRef.current;
    if (future.length === 0) {
      return undefined;
    }

    const next = future[0];
    const newFuture = future.slice(1);
    historyRef.current = {
      past: [...past, next],
      future: newFuture
    };

    return next;
  }, []);

  const clearHistory = useCallback(() => {
    if (coalesceTimerRef.current !== undefined) {
      window.clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = undefined;
    }
    pendingCoalesceRef.current = undefined;
    historyRef.current = { past: [], future: [] };
  }, []);

  useEffect(() => {
    return () => {
      if (coalesceTimerRef.current !== undefined) {
        window.clearTimeout(coalesceTimerRef.current);
      }
    };
  }, []);

  const canUndo = historyRef.current.past.length >= 2;
  const canRedo = historyRef.current.future.length > 0;

  return {
    get history() { return historyRef.current; },
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    clearHistory
  };
}
