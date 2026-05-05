import { createColorNode, createNeutralPrimaries, type ColorNode, type PrimaryCorrection } from "./colorEngine.js";

export const RECIPE_SCHEMA_VERSION = "1.0.0";
export const LESSON_SCHEMA_VERSION = "1.0.0";
export const PROGRESS_SCHEMA_VERSION = "1.0.0";

export type LessonId =
  | "exposure"
  | "white-balance"
  | "contrast"
  | "saturation"
  | "skin-tone"
  | "secondaries"
  | "tracking"
  | "scopes"
  | "export-check";

export type RecipeId =
  | "neutral-balance"
  | "clean-contrast"
  | "warm-portrait"
  | "cool-night"
  | "phone-log-normalization"
  | "sky-isolation"
  | "face-window";

export interface LessonStep {
  id: string;
  instruction: string;
  targetField: string;
  targetValue: number;
  tolerance: number;
  checkType: "primary" | "qualifier" | "scope" | "window";
}

export interface Lesson {
  id: LessonId;
  title: string;
  description: string;
  steps: LessonStep[];
}

export interface LessonAttempt {
  lessonId: LessonId;
  startedAt: number;
  completedAt?: number;
  stepResults: { stepId: string; passed: boolean; actualValue?: number }[];
  completed: boolean;
}

export interface Recipe {
  id: RecipeId;
  name: string;
  description: string;
  nodes: ColorNode[];
  compatibleProfiles: string[];
}

export interface PracticeTarget {
  id: string;
  name: string;
  description: string;
  referenceStillPath?: string;
  targetLumaMin: number;
  targetLumaMax: number;
  targetContrastMin: number;
  targetContrastMax: number;
  targetSaturationMin: number;
  targetSaturationMax: number;
  targetSkinToneMin: number;
  targetSkinToneMax: number;
  isUserCreated: boolean;
}

export interface PracticeAttempt {
  targetId: string;
  projectId: string;
  startedAt: number;
  completedAt?: number;
  lumaScore?: number;
  contrastScore?: number;
  saturationScore?: number;
  skinToneScore?: number;
  overallScore?: number;
  completed: boolean;
}

export interface LearningProgress {
  schemaVersion: typeof PROGRESS_SCHEMA_VERSION;
  lessonsCompleted: LessonId[];
  lessonAttempts: LessonAttempt[];
  practiceAttempts: PracticeAttempt[];
  savedLooks: { id: string; name: string; nodes: ColorNode[]; createdAt: number }[];
  lastActiveLesson?: LessonId;
  createdAt: number;
  updatedAt: number;
}

export interface GradeRecipe {
  id: RecipeId;
  version: typeof RECIPE_SCHEMA_VERSION;
  name: string;
  description: string;
  nodes: ColorNode[];
  compatibleProfiles: string[];
  tags: string[];
}

function createRecipeNode(
  index: number,
  name: string,
  primaries: PrimaryCorrection
): ColorNode {
  const node = createColorNode(index);
  node.name = name;
  node.primaries = primaries;
  return node;
}

export const GRADE_RECIPES: GradeRecipe[] = [
  {
    id: "neutral-balance",
    version: RECIPE_SCHEMA_VERSION,
    name: "Neutral Balance",
    description: "Clean, neutral starting point. Adjust to taste.",
    nodes: [
      createRecipeNode(1, "Neutral Balance", createNeutralPrimaries())
    ],
    compatibleProfiles: ["rec709", "srgb", "p3"],
    tags: ["starter", "neutral"]
  },
  {
    id: "clean-contrast",
    version: RECIPE_SCHEMA_VERSION,
    name: "Clean Contrast",
    description: "Slight contrast boost with neutral balance. Good for underexposed shots.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Contrast";
        node.primaries = {
          ...createNeutralPrimaries(),
          contrast: 1.08,
          pivot: 0.385
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb", "p3"],
    tags: ["contrast", "starter"]
  },
  {
    id: "warm-portrait",
    version: RECIPE_SCHEMA_VERSION,
    name: "Warm Portrait",
    description: "Slight warmth boost with lifted shadows. Ideal for skin tones.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Warmth";
        node.primaries = {
          ...createNeutralPrimaries(),
          temperature: 0.05,
          tint: 0.02,
          shadowAmount: 0.04,
          highlightAmount: -0.02
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb", "p3"],
    tags: ["portrait", "warm", "skin"]
  },
  {
    id: "cool-night",
    version: RECIPE_SCHEMA_VERSION,
    name: "Cool Night",
    description: "Cooler tones with crushed blacks. Good for night scenes.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Cool Night";
        node.primaries = {
          ...createNeutralPrimaries(),
          temperature: -0.06,
          tint: -0.02,
          contrast: 1.12,
          lift: { r: -0.02, g: -0.02, b: -0.01 }
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb"],
    tags: ["night", "cool", "moody"]
  },
  {
    id: "phone-log-normalization",
    version: RECIPE_SCHEMA_VERSION,
    name: "Phone Log Normalization",
    description: "Neutralizes flat log footage from smartphones. Brings contrast and saturation to natural levels.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Log Normalize";
        node.primaries = {
          ...createNeutralPrimaries(),
          contrast: 1.15,
          saturation: 1.1,
          pivot: 0.38,
          temperature: 0.02
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb", "appleLog"],
    tags: ["log", "phone", "normalization"]
  },
  {
    id: "sky-isolation",
    version: RECIPE_SCHEMA_VERSION,
    name: "Sky Isolation",
    description: "Face window + sky qualifier for targeted sky enhancement without affecting skin tones.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Sky Isolation";
        node.primaries = {
          ...createNeutralPrimaries(),
          saturation: 1.08,
          temperature: 0.03
        };
        node.qualifier = {
          enabled: true,
          hueCenter: 0.58,
          hueWidth: 0.12,
          hueSoftness: 0.15,
          saturationMin: 0.15,
          saturationMax: 1.0,
          saturationSoftness: 0.1,
          luminanceMin: 0.5,
          luminanceMax: 1.0,
          luminanceSoftness: 0.15,
          invert: false
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb", "p3"],
    tags: ["sky", "secondary", "landscape"]
  },
  {
    id: "face-window",
    version: RECIPE_SCHEMA_VERSION,
    name: "Face Window",
    description: "Ellipse power window centered for face/key light isolation.",
    nodes: [
      (() => {
        const node = createColorNode(1);
        node.name = "Face Window";
        node.primaries = {
          ...createNeutralPrimaries(),
          temperature: 0.03,
          highlightAmount: 0.05
        };
        node.windows.ellipse = {
          enabled: true,
          centerX: 0.5,
          centerY: 0.45,
          width: 0.35,
          height: 0.3,
          rotationDegrees: 0,
          softness: 0.25,
          invert: false
        };
        return node;
      })()
    ],
    compatibleProfiles: ["rec709", "srgb", "p3"],
    tags: ["face", "window", "portrait"]
  }
];

export const COLOR_LESSONS: Lesson[] = [
  {
    id: "exposure",
    title: "Exposure",
    description: "Learn to read and adjust exposure using lift, gamma, and gain.",
    steps: [
      {
        id: "exposure-1",
        instruction: "Start with a neutral node.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "primary"
      },
      {
        id: "exposure-2",
        instruction: "Lift the blacks using the Lift control. Target a 2-3% shadow lift in the waveform.",
        targetField: "lift.r",
        targetValue: 0.02,
        tolerance: 0.01,
        checkType: "primary"
      },
      {
        id: "exposure-3",
        instruction: "Adjust gamma to set your midtone exposure. Target around 0.95-1.05 gamma.",
        targetField: "gamma.r",
        targetValue: 1.0,
        tolerance: 0.08,
        checkType: "primary"
      },
      {
        id: "exposure-4",
        instruction: "Use gain to set your white point. Target around 0.98-1.02 for natural highlight headroom.",
        targetField: "gain.r",
        targetValue: 1.0,
        tolerance: 0.04,
        checkType: "primary"
      }
    ]
  },
  {
    id: "white-balance",
    title: "White Balance",
    description: "Correct color temperature and tint for neutral whites.",
    steps: [
      {
        id: "wb-1",
        instruction: "Identify a neutral reference in your footage. A gray card or white wall works best.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "primary"
      },
      {
        id: "wb-2",
        instruction: "Adjust Temperature to remove warmth or coolness. Positive = warmer, negative = cooler.",
        targetField: "temperature",
        targetValue: 0,
        tolerance: 0.03,
        checkType: "primary"
      },
      {
        id: "wb-3",
        instruction: "Fine-tune with Tint to remove green or magenta cast.",
        targetField: "tint",
        targetValue: 0,
        tolerance: 0.02,
        checkType: "primary"
      },
      {
        id: "wb-4",
        instruction: "Verify your vectorscope shows natural skin tones along the I and Q axes.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      }
    ]
  },
  {
    id: "contrast",
    title: "Contrast",
    description: "Shape the tonal range using contrast, pivot, and lift/gamma/gain.",
    steps: [
      {
        id: "contrast-1",
        instruction: "Set your pivot point to 0.385 (18% gray, Rec.709 standard).",
        targetField: "pivot",
        targetValue: 0.385,
        tolerance: 0.01,
        checkType: "primary"
      },
      {
        id: "contrast-2",
        instruction: "Increase contrast to 1.1. Watch the waveform spread at both ends.",
        targetField: "contrast",
        targetValue: 1.1,
        tolerance: 0.03,
        checkType: "primary"
      },
      {
        id: "contrast-3",
        instruction: "Check that highlights are not clipping. Reduce gain if needed.",
        targetField: "gain.r",
        targetValue: 1.0,
        tolerance: 0.05,
        checkType: "primary"
      },
      {
        id: "contrast-4",
        instruction: "Add a subtle shadow lift (+0.01 to +0.02) for film-like rolloff.",
        targetField: "lift.r",
        targetValue: 0.015,
        tolerance: 0.01,
        checkType: "primary"
      }
    ]
  },
  {
    id: "saturation",
    title: "Saturation",
    description: "Learn how saturation affects color intensity across the tonal range.",
    steps: [
      {
        id: "sat-1",
        instruction: "Start with saturation at neutral (1.0).",
        targetField: "saturation",
        targetValue: 1.0,
        tolerance: 0.02,
        checkType: "primary"
      },
      {
        id: "sat-2",
        instruction: "Increase saturation to 1.2. Notice how primary colors become more vivid.",
        targetField: "saturation",
        targetValue: 1.2,
        tolerance: 0.03,
        checkType: "primary"
      },
      {
        id: "sat-3",
        instruction: "Reduce saturation to 0.85 for a softer, more desaturated look.",
        targetField: "saturation",
        targetValue: 0.85,
        tolerance: 0.03,
        checkType: "primary"
      },
      {
        id: "sat-4",
        instruction: "Find a natural-looking saturation for your footage. Aim for histogram peaks within legal limits.",
        targetField: "saturation",
        targetValue: 1.0,
        tolerance: 0.08,
        checkType: "primary"
      }
    ]
  },
  {
    id: "skin-tone",
    title: "Skin Tone",
    description: "Identify and protect skin tones while grading the rest of the image.",
    steps: [
      {
        id: "skin-1",
        instruction: "Enable the HSL qualifier. Set hue center to 0.08 (skin tone range).",
        targetField: "qualifier.hueCenter",
        targetValue: 0.08,
        tolerance: 0.03,
        checkType: "qualifier"
      },
      {
        id: "skin-2",
        instruction: "Set hue width to 0.08 to cover the skin tone range.",
        targetField: "qualifier.hueWidth",
        targetValue: 0.08,
        tolerance: 0.03,
        checkType: "qualifier"
      },
      {
        id: "skin-3",
        instruction: "Set saturation min to 0.08 to isolate low-saturation pixels (skin).",
        targetField: "qualifier.saturationMin",
        targetValue: 0.08,
        tolerance: 0.03,
        checkType: "qualifier"
      },
      {
        id: "skin-4",
        instruction: "Verify skin tones are isolated in the vectorscope near the I/Q axis.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      }
    ]
  },
  {
    id: "secondaries",
    title: "Secondary Color Correction",
    description: "Use HSL qualifiers to isolate and adjust specific color ranges.",
    steps: [
      {
        id: "sec-1",
        instruction: "Enable the HSL qualifier and target a color range you want to adjust.",
        targetField: "qualifier.enabled",
        targetValue: 1,
        tolerance: 0,
        checkType: "qualifier"
      },
      {
        id: "sec-2",
        instruction: "Set hue center to your target color. Adjust hue width to 0.05-0.15 depending on range needed.",
        targetField: "qualifier.hueCenter",
        targetValue: 0.5,
        tolerance: 0.05,
        checkType: "qualifier"
      },
      {
        id: "sec-3",
        instruction: "Narrow the hue width to isolate just your target color.",
        targetField: "qualifier.hueWidth",
        targetValue: 0.08,
        tolerance: 0.03,
        checkType: "qualifier"
      },
      {
        id: "sec-4",
        instruction: "Invert the qualifier to protect your target color while adjusting everything else.",
        targetField: "qualifier.invert",
        targetValue: 1,
        tolerance: 0,
        checkType: "qualifier"
      }
    ]
  },
  {
    id: "tracking",
    title: "Power Window Tracking",
    description: "Learn to set up and run tracking on a power window.",
    steps: [
      {
        id: "track-1",
        instruction: "Enable the ellipse power window and position it over your tracking target.",
        targetField: "windows.ellipse.enabled",
        targetValue: 1,
        tolerance: 0,
        checkType: "window"
      },
      {
        id: "track-2",
        instruction: "Position the window center at 0.5, 0.5 to start in the frame center.",
        targetField: "windows.ellipse.centerX",
        targetValue: 0.5,
        tolerance: 0.05,
        checkType: "window"
      },
      {
        id: "track-3",
        instruction: "Set the window size (width 0.3, height 0.25) to fit your tracking target.",
        targetField: "windows.ellipse.width",
        targetValue: 0.3,
        tolerance: 0.05,
        checkType: "window"
      },
      {
        id: "track-4",
        instruction: "Run tracking forward. Verify the window follows your target.",
        targetField: "tracking.state",
        targetValue: 1,
        tolerance: 0,
        checkType: "window"
      }
    ]
  },
  {
    id: "scopes",
    title: "Reading Scopes",
    description: "Use waveform, vectorscope, and histogram to guide your grade.",
    steps: [
      {
        id: "scopes-1",
        instruction: "Import media and observe the waveform. Notice where your blacks and whites fall.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      },
      {
        id: "scopes-2",
        instruction: "Check the histogram. Identify if the image is low, mid, or high key.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      },
      {
        id: "scopes-3",
        instruction: "View the vectorscope. Skin tones should cluster near the I/Q axes (approx 10-11 o'clock).",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      },
      {
        id: "scopes-4",
        instruction: "Make a small adjustment and observe how it affects all scopes simultaneously.",
        targetField: "contrast",
        targetValue: 1.05,
        tolerance: 0.03,
        checkType: "scope"
      }
    ]
  },
  {
    id: "export-check",
    title: "Export Verification",
    description: "Learn to check export settings and verify legal delivery limits.",
    steps: [
      {
        id: "export-1",
        instruction: "Switch to the Export workspace preset to see export settings.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "primary"
      },
      {
        id: "export-2",
        instruction: "Set codec to H.264 for maximum compatibility.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "primary"
      },
      {
        id: "export-3",
        instruction: "Check that your waveform stays within 0-100% (legal range) before exporting.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "scope"
      },
      {
        id: "export-4",
        instruction: "Export a still frame to verify your grade before rendering the full sequence.",
        targetField: "none",
        targetValue: 0,
        tolerance: 0,
        checkType: "primary"
      }
    ]
  }
];

export function createDefaultLearningProgress(): LearningProgress {
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    lessonsCompleted: [],
    lessonAttempts: [],
    practiceAttempts: [],
    savedLooks: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function getRecipeById(id: RecipeId): GradeRecipe | undefined {
  return GRADE_RECIPES.find((r) => r.id === id);
}

export function getLessonById(id: LessonId): Lesson | undefined {
  return COLOR_LESSONS.find((l) => l.id === id);
}

export function checkLessonStep(
  lesson: Lesson,
  stepId: string,
  projectNodes: ColorNode[],
  _scopeData?: { lumaMin: number; lumaMax: number; saturationAvg: number } // eslint-disable-line @typescript-eslint/no-unused-vars
): { passed: boolean; actualValue?: number } {
  const step = lesson.steps.find((s) => s.id === stepId);
  if (!step || step.checkType === "scope" || step.targetField === "none") {
    return { passed: true };
  }

  if (step.checkType === "primary" || step.checkType === "qualifier" || step.checkType === "window") {
    const activeNode = projectNodes[0];
    if (!activeNode) return { passed: false };

    const fieldParts = step.targetField.split(".");
    let value: unknown = activeNode;

    for (const part of fieldParts) {
      if (value && typeof value === "object") {
        value = (value as Record<string, unknown>)[part];
      } else {
        return { passed: false };
      }
    }

    if (typeof value !== "number") return { passed: false };

    const tolerance = step.tolerance;
    const passed = Math.abs(value - step.targetValue) <= tolerance;

    return { passed, actualValue: value };
  }

  return { passed: true };
}

export function scorePracticeTarget(
  target: PracticeTarget,
  scopeData: { lumaMin: number; lumaMax: number; contrast: number; saturationAvg: number; skinToneHue: number }
): {
  lumaScore: number;
  contrastScore: number;
  saturationScore: number;
  skinToneScore: number;
  overallScore: number;
} {
  const lumaScore = scopeData.lumaMin >= target.targetLumaMin && scopeData.lumaMax <= target.targetLumaMax ? 100 :
    scopeData.lumaMin < target.targetLumaMin ?
      Math.max(0, 100 - (target.targetLumaMin - scopeData.lumaMin) * 200) :
      Math.max(0, 100 - (scopeData.lumaMax - target.targetLumaMax) * 200);

  const contrastScore = scopeData.contrast >= target.targetContrastMin && scopeData.contrast <= target.targetContrastMax ? 100 :
    Math.max(0, 100 - Math.abs(scopeData.contrast - ((target.targetContrastMin + target.targetContrastMax) / 2)) * 200);

  const saturationScore = scopeData.saturationAvg >= target.targetSaturationMin && scopeData.saturationAvg <= target.targetSaturationMax ? 100 :
    Math.max(0, 100 - Math.abs(scopeData.saturationAvg - ((target.targetSaturationMin + target.targetSaturationMax) / 2)) * 200);

  const skinToneScore = scopeData.skinToneHue >= target.targetSkinToneMin && scopeData.skinToneHue <= target.targetSkinToneMax ? 100 :
    Math.max(0, 100 - Math.abs(scopeData.skinToneHue - ((target.targetSkinToneMin + target.targetSkinToneMax) / 2)) * 200);

  const overallScore = (lumaScore + contrastScore + saturationScore + skinToneScore) / 4;

  return { lumaScore, contrastScore, saturationScore, skinToneScore, overallScore };
}

export const DEFAULT_PRACTICE_TARGETS: PracticeTarget[] = [
  {
    id: "legal-delivery",
    name: "Legal Delivery",
    description: "Ensure luma stays within broadcast-legal 0-100% range.",
    targetLumaMin: 0.01,
    targetLumaMax: 0.92,
    targetContrastMin: 0.7,
    targetContrastMax: 1.3,
    targetSaturationMin: 0.7,
    targetSaturationMax: 1.2,
    targetSkinToneMin: 0.05,
    targetSkinToneMax: 0.12,
    isUserCreated: false
  },
  {
    id: "skin-tone-standard",
    name: "Natural Skin Tones",
    description: "Skin tones should fall within the vectorscope I/Q range.",
    targetLumaMin: 0.05,
    targetLumaMax: 0.85,
    targetContrastMin: 0.85,
    targetContrastMax: 1.2,
    targetSaturationMin: 0.75,
    targetSaturationMax: 1.1,
    targetSkinToneMin: 0.06,
    targetSkinToneMax: 0.11,
    isUserCreated: false
  },
  {
    id: "balanced-exposure",
    name: "Balanced Exposure",
    description: "Well-exposed image with natural contrast and moderate saturation.",
    targetLumaMin: 0.02,
    targetLumaMax: 0.95,
    targetContrastMin: 0.9,
    targetContrastMax: 1.15,
    targetSaturationMin: 0.9,
    targetSaturationMax: 1.1,
    targetSkinToneMin: 0.05,
    targetSkinToneMax: 0.12,
    isUserCreated: false
  }
];
