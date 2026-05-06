import { useCallback, useState } from "react";
import type { ColorNode } from "../../shared/colorEngine";

interface Still {
  id: string;
  thumbnail: string;
  timestamp: number;
  frameIndex: number;
  gradeName: string;
}

interface UseGalleryWorkflowOptions {
  initialStills?: Still[];
  projectName?: string;
  currentFrame?: number;
}

interface UseGalleryWorkflowResult {
  galleryStills: Still[];
  compareStillId: string | null;
  captureStill: (source: { thumbnail: string; frameIndex: number }) => void;
  deleteStill: (stillId: string) => void;
  applyStillGrade: (stillId: string, activeNode: ColorNode) => ColorNode | undefined;
  setCompareStillId: (id: string | null) => void;
}

export function useGalleryWorkflow({
  initialStills = [],
  projectName = "Untitled"
}: UseGalleryWorkflowOptions = {}): UseGalleryWorkflowResult {
  const [galleryStills, setGalleryStills] = useState<Still[]>(initialStills);
  const [compareStillId, setCompareStillId] = useState<string | null>(null);

  const captureStill = useCallback((source: { thumbnail: string; frameIndex: number }) => {
    const still: Still = {
      id: `still-${Date.now().toString(36)}`,
      thumbnail: source.thumbnail,
      timestamp: Date.now(),
      frameIndex: source.frameIndex,
      gradeName: projectName
    };

    setGalleryStills((prev) => [still, ...prev]);
  }, [projectName]);

  const deleteStill = useCallback((stillId: string) => {
    setGalleryStills((prev) => prev.filter((s) => s.id !== stillId));
    if (compareStillId === stillId) {
      setCompareStillId(null);
    }
  }, [compareStillId]);

  const applyStillGrade = useCallback((stillId: string, activeNode: ColorNode): ColorNode | undefined => {
    const still = galleryStills.find((s) => s.id === stillId);
    if (!still || !activeNode) {
      return undefined;
    }

    const newNode: ColorNode = {
      ...activeNode,
      id: `node-${Date.now().toString(36)}`,
      name: `Grade ${galleryStills.length}`,
      tracking: { targetShape: activeNode.tracking.targetShape, keyframes: [], state: "empty" }
    };

    setGalleryStills((prev) => [...prev]);
    return newNode;
  }, [galleryStills]);

  return {
    galleryStills,
    compareStillId,
    captureStill,
    deleteStill,
    applyStillGrade,
    setCompareStillId
  };
}