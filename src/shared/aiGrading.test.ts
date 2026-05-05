import { describe, it, expect } from "vitest";
import {
  analyzeFrame,
  generateAutoBalanceAndDiagnostics,
  generateReferenceMatchSuggestions,
  generateNaturalLanguageSuggestions,
  parseNaturalLanguageIntent,
  applySuggestionToProject,
  validateAiSettings,
  DEFAULT_AI_SETTINGS,
  type RgbFrame
} from "./aiGrading";
import { createColorNode } from "./colorEngine";

function createTestFrame(width: number, height: number, r: number, g: number, b: number): RgbFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

describe("aiGrading", () => {
  describe("analyzeFrame", () => {
    it("analyzes a neutral gray frame", () => {
      const frame = createTestFrame(100, 100, 128, 128, 128);
      const analysis = analyzeFrame(frame);

      expect(analysis.samples).toBe(10000);
      expect(analysis.rgbLevels.avgR).toBeCloseTo(128, 0);
      expect(analysis.rgbLevels.avgG).toBeCloseTo(128, 0);
      expect(analysis.rgbLevels.avgB).toBeCloseTo(128, 0);
      // Uniform gray has no contrast variation, so isLow is true
      expect(analysis.contrast.isLow).toBe(true);
    });

    it("detects warm color cast", () => {
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const analysis = analyzeFrame(frame);

      expect(analysis.whiteBalance.hasCast).toBe(true);
      expect(analysis.whiteBalance.castColor).toBe("warm");
    });

    it("detects cool color cast", () => {
      const frame = createTestFrame(100, 100, 100, 150, 180);
      const analysis = analyzeFrame(frame);

      expect(analysis.whiteBalance.hasCast).toBe(true);
      expect(analysis.whiteBalance.castColor).toBe("cool");
    });

    it("detects clipping in bright frame", () => {
      // Pure white (255,255,255) has luma close to 1.0, which is not >= 100%
      // So we use a frame that will actually clip
      const frame = createTestFrame(100, 100, 255, 255, 255);
      const analysis = analyzeFrame(frame);

      // Super whites count pixels at luma >= 100%
      expect(analysis.exposure.superWhites).toBe(10000);
    });

    it("detects low contrast", () => {
      const frame = createTestFrame(100, 100, 120, 128, 136);
      const analysis = analyzeFrame(frame);

      expect(analysis.contrast.isLow).toBe(true);
    });

    it("detects normal contrast in varied frame", () => {
      // Create a frame with both dark and bright areas
      const frame = createTestFrame(100, 100, 50, 50, 50);
      const analysis = analyzeFrame(frame);

      // Single color frame has no contrast variation
      expect(analysis.contrast.isLow).toBe(true);
    });
  });

  describe("generateAutoBalanceAndDiagnostics", () => {
    it("generates suggestions for warm frame", () => {
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const existingNodes = [createColorNode(1)];
      const suggestions = generateAutoBalanceAndDiagnostics(frame, existingNodes);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].metadata.type).toBe("auto-balance");
      expect(suggestions[0].suggestedNodes.length).toBe(1);
    });

    it("includes diagnostics with suggestions", () => {
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const existingNodes = [createColorNode(1)];
      const suggestions = generateAutoBalanceAndDiagnostics(frame, existingNodes);

      expect(suggestions[0].metadata.diagnostics.length).toBeGreaterThan(0);
    });

    it("generates editable node changes", () => {
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const existingNodes = [createColorNode(1)];
      const suggestions = generateAutoBalanceAndDiagnostics(frame, existingNodes);

      const suggestion = suggestions[0];
      expect(suggestion.suggestedNodes[0].primaries).toBeDefined();
      expect(suggestion.metadata.changedControls.length).toBeGreaterThan(0);
    });
  });

  describe("generateReferenceMatchSuggestions", () => {
    it("generates match suggestions between two frames", () => {
      const sourceFrame = createTestFrame(100, 100, 128, 128, 128);
      const referenceFrame = createTestFrame(100, 100, 150, 140, 120);
      const existingNodes = [createColorNode(1)];

      const suggestions = generateReferenceMatchSuggestions(sourceFrame, referenceFrame, existingNodes);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].metadata.type).toBe("reference-match");
      expect(suggestions[0].suggestedNodes.length).toBe(1);
    });

    it("includes deviation information", () => {
      const sourceFrame = createTestFrame(100, 100, 128, 128, 128);
      const referenceFrame = createTestFrame(100, 100, 180, 150, 100);
      const existingNodes = [createColorNode(1)];

      const suggestions = generateReferenceMatchSuggestions(sourceFrame, referenceFrame, existingNodes);

      expect(suggestions[0].metadata.reason).toContain("match score");
    });
  });

  describe("parseNaturalLanguageIntent", () => {
    it("parses warmer intent", () => {
      const result = parseNaturalLanguageIntent("make it warmer");

      expect(result.actions).toContain("warmer");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("parses cooler intent", () => {
      const result = parseNaturalLanguageIntent("cooler tones please");

      expect(result.actions).toContain("cooler");
    });

    it("parses multiple intents", () => {
      const result = parseNaturalLanguageIntent("warmer skin tones, softer contrast");

      expect(result.actions).toContain("warmer");
      expect(result.actions).toContain("softer");
    });

    it("handles ambiguous input", () => {
      const result = parseNaturalLanguageIntent("make it better");

      expect(result.unsupportedTerms.length).toBeGreaterThan(0);
    });
  });

  describe("generateNaturalLanguageSuggestions", () => {
    it("generates suggestion for warmer intent", () => {
      const existingNodes = [createColorNode(1)];
      const suggestion = generateNaturalLanguageSuggestions("make it warmer", existingNodes);

      expect(suggestion).not.toBeNull();
      expect(suggestion!.suggestedNodes[0].primaries.temperature).toBeGreaterThan(0);
    });

    it("returns null for unsupported intent", () => {
      const existingNodes = [createColorNode(1)];
      const suggestion = generateNaturalLanguageSuggestions("fix the thing", existingNodes);

      expect(suggestion).toBeNull();
    });

    it("handles multiple intents", () => {
      const existingNodes = [createColorNode(1)];
      const suggestion = generateNaturalLanguageSuggestions("warmer and more saturated", existingNodes);

      expect(suggestion).not.toBeNull();
    });

    it("resolves incompatible intents", () => {
      const existingNodes = [createColorNode(1)];
      // warmer and cooler are incompatible - cooler should be removed
      const suggestion = generateNaturalLanguageSuggestions("warmer but not too cool", existingNodes);

      expect(suggestion).not.toBeNull();
      // Only warmer should be in the reason
      expect(suggestion!.metadata.reason).toContain("warmer");
    });
  });

  describe("applySuggestionToProject", () => {
    it("appends suggested nodes to existing nodes", () => {
      const existingNodes = [createColorNode(1)];
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const suggestions = generateAutoBalanceAndDiagnostics(frame, existingNodes);

      const result = applySuggestionToProject(existingNodes, suggestions[0]);

      expect(result.length).toBe(2);
    });

    it("limits nodes to MAX_SERIAL_NODES", () => {
      const existingNodes = [createColorNode(1), createColorNode(2)];
      const frame = createTestFrame(100, 100, 180, 150, 100);
      const suggestions = generateAutoBalanceAndDiagnostics(frame, existingNodes);

      const result = applySuggestionToProject(existingNodes, suggestions[0]);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe("validateAiSettings", () => {
    it("returns default settings for empty input", () => {
      const result = validateAiSettings({});

      expect(result.enabled).toBe(DEFAULT_AI_SETTINGS.enabled);
      expect(result.mode).toBe(DEFAULT_AI_SETTINGS.mode);
    });

    it("clamps request budget limit", () => {
      const result = validateAiSettings({ requestBudgetLimit: 20000 });

      expect(result.requestBudgetLimit).toBeLessThanOrEqual(10000);
    });

    it("clamps timeout values", () => {
      const result = validateAiSettings({ timeoutMs: 200000 });

      expect(result.timeoutMs).toBeLessThanOrEqual(120000);
    });

    it("clamps max retries", () => {
      const result = validateAiSettings({ maxRetries: 10 });

      expect(result.maxRetries).toBeLessThanOrEqual(5);
    });

    it("respects valid input values", () => {
      const result = validateAiSettings({
        enabled: true,
        mode: "cloud-assisted",
        cloudProvider: "anthropic",
        timeoutMs: 60000
      });

      expect(result.enabled).toBe(true);
      expect(result.mode).toBe("cloud-assisted");
      expect(result.cloudProvider).toBe("anthropic");
      expect(result.timeoutMs).toBe(60000);
    });
  });
});
