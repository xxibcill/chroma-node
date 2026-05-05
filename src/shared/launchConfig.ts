export const LAUNCH_CONFIG_SCHEMA_VERSION = "1.0.0";

export type PricingGate = "free" | "trial" | "paid" | "pro" | "ai" | "asset-pack";

export interface PricingTier {
  id: PricingGate;
  label: string;
  description: string;
  features: string[];
  limits: {
    maxProjects: number;
    maxExportsPerMonth: number;
    maxExportResolution: string;
    aiAssistedGrading: boolean;
    advancedScopes: boolean;
    marketplaceAccess: boolean;
    prioritySupport: boolean;
  };
  price?: {
    amount: number;
    currency: string;
    interval?: "monthly" | "yearly" | "lifetime";
  };
}

export interface OnboardingExperiment {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variant?: "control" | "treatment";
}

export interface LaunchMetrics {
  activation: {
    tracked: boolean;
    events: string[];
  };
  exportCompletion: {
    tracked: boolean;
    events: string[];
  };
  retention: {
    tracked: boolean;
    events: string[];
    intervalsDays: number[];
  };
  conversion: {
    tracked: boolean;
    events: string[];
  };
  supportLoad: {
    tracked: boolean;
    events: string[];
  };
  refundDrivers: {
    tracked: boolean;
    events: string[];
  };
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    label: "Free",
    description: "Get started with basic color grading.",
    features: [
      "Import media and create projects",
      "Basic color correction tools",
      "Export up to 720p",
      "5 projects maximum",
      "10 exports per month"
    ],
    limits: {
      maxProjects: 5,
      maxExportsPerMonth: 10,
      maxExportResolution: "720p",
      aiAssistedGrading: false,
      advancedScopes: false,
      marketplaceAccess: false,
      prioritySupport: false
    }
  },
  {
    id: "trial",
    label: "Trial",
    description: "14-day trial of Pro features.",
    features: [
      "All Free features",
      "Pro color correction tools",
      "Export up to 1080p",
      "AI-assisted grading preview",
      "Advanced scopes (waveform, vectorscope)"
    ],
    limits: {
      maxProjects: 10,
      maxExportsPerMonth: 25,
      maxExportResolution: "1080p",
      aiAssistedGrading: true,
      advancedScopes: true,
      marketplaceAccess: false,
      prioritySupport: false
    }
  },
  {
    id: "paid",
    label: "Paid",
    description: "Full access to core grading features.",
    features: [
      "All Trial features",
      "Export up to 4K",
      "50 projects maximum",
      "100 exports per month",
      "Marketplace access"
    ],
    limits: {
      maxProjects: 50,
      maxExportsPerMonth: 100,
      maxExportResolution: "4k",
      aiAssistedGrading: true,
      advancedScopes: true,
      marketplaceAccess: true,
      prioritySupport: false
    },
    price: {
      amount: 2999,
      currency: "USD",
      interval: "lifetime"
    }
  },
  {
    id: "pro",
    label: "Pro",
    description: "Professional grade with all features.",
    features: [
      "All Paid features",
      "Unlimited projects",
      "Unlimited exports",
      "HDR export",
      "Priority support"
    ],
    limits: {
      maxProjects: -1,
      maxExportsPerMonth: -1,
      maxExportResolution: "hdr",
      aiAssistedGrading: true,
      advancedScopes: true,
      marketplaceAccess: true,
      prioritySupport: true
    },
    price: {
      amount: 4999,
      currency: "USD",
      interval: "lifetime"
    }
  }
];

export const ONBOARDING_EXPERIMENTS: OnboardingExperiment[] = [
  {
    id: "first-run-sample-project",
    name: "First-Run Sample Project",
    description: "Load a sample project on first run to demonstrate key features.",
    enabled: true,
    variant: "treatment"
  },
  {
    id: "guided-first-grade",
    name: "Guided First Grade",
    description: "Interactive tutorial for the first color grade.",
    enabled: true,
    variant: "treatment"
  },
  {
    id: "export-success-celebration",
    name: "Export Success Celebration",
    description: "Show success message and next steps after first export.",
    enabled: true,
    variant: "treatment"
  },
  {
    id: "lesson-quick-start",
    name: "Lesson Quick Start",
    description: "Suggest relevant lessons based on user activity.",
    enabled: true
  }
];

export const DEFAULT_LAUNCH_METRICS: LaunchMetrics = {
  activation: {
    tracked: true,
    events: ["app:start", "license:trial-start", "license:activate"]
  },
  exportCompletion: {
    tracked: true,
    events: ["export:complete", "export:fail"]
  },
  retention: {
    tracked: true,
    events: ["app:start", "app:quit"],
    intervalsDays: [1, 7, 14, 30]
  },
  conversion: {
    tracked: true,
    events: ["license:activate", "purchase:initiated", "purchase:completed"]
  },
  supportLoad: {
    tracked: true,
    events: ["support:submit", "crash:capture"]
  },
  refundDrivers: {
    tracked: true,
    events: ["refund:initiated", "license:deactivate"]
  }
};

export function getPricingTier(gate: PricingGate): PricingTier | undefined {
  return PRICING_TIERS.find(tier => tier.id === gate);
}

export function isFeatureAllowed(gate: PricingGate, feature: keyof PricingTier["limits"]): boolean {
  const tier = getPricingTier(gate);
  if (!tier) return false;
  const value = tier.limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return false;
}
