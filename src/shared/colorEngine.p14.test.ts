import { describe, expect, it } from "vitest";
import {
  PROFILE_REGISTRY,
  getProfile,
  getWorkingProfiles,
  buildTransformGraph,
  validateTransformPath,
  resolveColorSpaceToProfileId,
  CAMERA_LOG_PROFILES,
  detectCameraLog,
  resolveCameraLogProfile,
  ACES_WORKING_SPACES,
  getOcioConfigStatus,
  buildAcesPipelineDescriptor,
  validateProjectPortability,
  DELIVERY_PROFILES,
  validateDeliveryConformance,
  buildExportColorSummary,
  buildFFmpegColorArgs,
  DISPLAY_SIMULATION_PRESETS,
  DEFAULT_DISPLAY_SIMULATION_STATE,
  generateSoftProofOverlays,
  validateDisplaySimulationState,
  checkDisplayCapability,
  applyHdrToneMap,
  compressGamutAdaptive,
  TECHNICAL_LUT_SLOT_ORDER,
  parseTechnicalLut,
  createTechnicalLutDescriptor,
  PRIMARIES
} from "./colorEngine";

describe("P14 - profile registry and transform graph", () => {
  it("has registry entries for all major color spaces", () => {
    expect(getProfile("rec709_in")).toBeDefined();
    expect(getProfile("rec2020_in")).toBeDefined();
    expect(getProfile("p3_in")).toBeDefined();
    expect(getProfile("appleLog_in")).toBeDefined();
    expect(getProfile("hlg_in")).toBeDefined();
    expect(getProfile("pq_in")).toBeDefined();
  });

  it("has working space profiles", () => {
    const working = getWorkingProfiles();
    expect(working.length).toBeGreaterThan(0);
    expect(working.some(p => p.id === "rec709_wk")).toBe(true);
    expect(working.some(p => p.id === "acescg_wk")).toBe(true);
  });

  it("has delivery profiles with HDR metadata", () => {
    const hlgDel = getProfile("rec2020_hlg_del");
    expect(hlgDel?.isHdr).toBe(true);
    expect(hlgDel?.hdrMetadata?.peakLuminance).toBe(1000);
  });

  it("builds valid transform graph", () => {
    const { graph, warnings } = buildTransformGraph(
      "appleLog_in",
      "rec2020_wk",
      "rec709_disp",
      "rec709_del",
      "sdr",
      "clip"
    );
    expect(warnings.length).toBe(0);
    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBe(3);
  });

  it("validates transform path with capability checks", () => {
    const result = validateTransformPath(
      "appleLog_in",
      "rec2020_wk",
      "rec709_disp",
      "rec709_del",
      ["cpu", "glsl"]
    );
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("resolves color space to profile ID", () => {
    expect(resolveColorSpaceToProfileId("rec709", "input")).toBe("rec709_in");
    expect(resolveColorSpaceToProfileId("appleLog", "working")).toBe("rec2020_wk");
    expect(resolveColorSpaceToProfileId("pq", "delivery")).toBe("rec2020_pq_del");
  });
});

describe("P14 - camera log input transforms", () => {
  it("has all major camera log profiles", () => {
    expect(CAMERA_LOG_PROFILES.appleLog).toBeDefined();
    expect(CAMERA_LOG_PROFILES.arriLogC3).toBeDefined();
    expect(CAMERA_LOG_PROFILES.arriLogC4).toBeDefined();
    expect(CAMERA_LOG_PROFILES.sonySLog3).toBeDefined();
    expect(CAMERA_LOG_PROFILES.canonCLog3).toBeDefined();
    expect(CAMERA_LOG_PROFILES.panasonicVLog).toBeDefined();
    expect(CAMERA_LOG_PROFILES.redLog3G10).toBeDefined();
  });

  it("camera log profiles have provenance", () => {
    expect(CAMERA_LOG_PROFILES.appleLog.provenance).toContain("Apple");
    expect(CAMERA_LOG_PROFILES.arriLogC4.provenance).toContain("ARRI");
  });

  it("detects Apple Log from codec", () => {
    const detected = detectCameraLog("dvi", {});
    expect(detected).toBe("appleLog");
  });

  it("detects ARRI LogC4 from vendor metadata", () => {
    const detected = detectCameraLog("prores", { vendor: "ARRI", transfer_characteristics: "logc4" });
    expect(detected).toBe("arriLogC4");
  });

  it("resolves camera log profile", () => {
    const profile = resolveCameraLogProfile("appleLog", { metadata: null, detectedProfile: "appleLog", isHDR: true, isWideGamut: true });
    expect(profile).toBe("appleLog");
  });
});

describe("P14 - ACES and OCIO workflows", () => {
  it("has ACES working space definitions", () => {
    expect(ACES_WORKING_SPACES.acescg).toBeDefined();
    expect(ACES_WORKING_SPACES.acescg.primaries).toBe("rec2020");
    expect(ACES_WORKING_SPACES.acescg.isWideGamut).toBe(true);
  });

  it("OCIO config status is not required", () => {
    const status = getOcioConfigStatus();
    expect(status.configExists).toBe(false);
    expect(status.configPath).toBeNull();
  });

  it("builds ACES pipeline descriptor", () => {
    const pipeline = buildAcesPipelineDescriptor(
      "appleLog",
      "acescg",
      PROFILE_REGISTRY.rec2020_pq_disp,
      null
    );
    expect(pipeline.input.idtName).toContain("Apple");
    expect(pipeline.working.type).toBe("acescg");
    expect(pipeline.usesOcioConfig).toBe(false);
  });

  it("validates project portability", () => {
    const pipeline = buildAcesPipelineDescriptor(
      "appleLog",
      "acescg",
      PROFILE_REGISTRY.rec2020_pq_disp,
      "Film Look"
    );
    const result = validateProjectPortability(pipeline);
    // Without OCIO config, portability is maintained (app-managed workflow)
    expect(result.isPortable).toBe(true);
  });
});

describe("P14 - HDR tone mapping", () => {
  it("tone maps PQ to SDR", () => {
    const input = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = applyHdrToneMap(input, "pq", 1000);
    expect(result.r).toBeGreaterThanOrEqual(0);
    expect(result.r).toBeLessThanOrEqual(1);
  });

  it("tone maps HLG to SDR", () => {
    const input = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
    const result = applyHdrToneMap(input, "hlg", 1000);
    expect(result.r).toBeGreaterThanOrEqual(0);
    expect(result.r).toBeLessThanOrEqual(1);
  });

  it("sdr tone map works", () => {
    const input = { r: 0.8, g: 0.8, b: 0.8, a: 1 };
    const result = applyHdrToneMap(input, "sdr", 1000);
    expect(result.r).toBeGreaterThanOrEqual(0);
    expect(result.r).toBeLessThanOrEqual(1);
  });
});

describe("P14 - gamut compression", () => {
  it("compresses wide gamut to rec709 without NaN", () => {
    const result = compressGamutAdaptive(
      { r: 0.9, g: 0.1, b: 0.1, a: 1 },
      PRIMARIES.rec2020,
      PRIMARIES.rec709
    );
    expect(Number.isFinite(result.color.r)).toBe(true);
    expect(result.color.r).toBeGreaterThanOrEqual(0);
  });

  it("reports clipping amount", () => {
    const result = compressGamutAdaptive(
      { r: 1.5, g: 0.5, b: 0.5, a: 1 },
      PRIMARIES.rec2020,
      PRIMARIES.rec709
    );
    expect(result.amountClipped).toBeGreaterThan(0);
  });
});

describe("P14 - display simulation", () => {
  it("has display simulation presets", () => {
    expect(DISPLAY_SIMULATION_PRESETS.srgb).toBeDefined();
    expect(DISPLAY_SIMULATION_PRESETS.rec2020_pq).toBeDefined();
    expect(DISPLAY_SIMULATION_PRESETS.displayP3).toBeDefined();
  });

  it("default display simulation state", () => {
    expect(DEFAULT_DISPLAY_SIMULATION_STATE.activePreset).toBe("srgb");
    expect(DEFAULT_DISPLAY_SIMULATION_STATE.isActive).toBe(false);
  });

  it("generates soft proof overlays", () => {
    const overlays = generateSoftProofOverlays(
      { r: 0.95, g: 0.95, b: 0.1, a: 1 },
      "displayP3",
      "srgb"
    );
    expect(overlays.length).toBeGreaterThan(0);
  });

  it("validates display simulation state", () => {
    const result = validateDisplaySimulationState(
      DEFAULT_DISPLAY_SIMULATION_STATE,
      "rec2020_pq"
    );
    // PQ target differs from sRGB simulation
    expect(result.mismatches.length).toBeGreaterThan(0);
  });

  it("checks display capability", () => {
    const result = checkDisplayCapability(100, 1000, "pq");
    expect(result.canRepresent).toBe(false);
    expect(result.warning).toContain("1000 nits");
  });
});

describe("P14 - technical LUT management", () => {
  it("technical LUT slot order is defined", () => {
    expect(TECHNICAL_LUT_SLOT_ORDER).toContain("input");
    expect(TECHNICAL_LUT_SLOT_ORDER).toContain("display");
    expect(TECHNICAL_LUT_SLOT_ORDER).toContain("output");
  });

  it("parses technical LUT with shaper", () => {
    const content = `TITLE "Test Technical LUT"
LUT_1D_SIZE 3
0.0 0.0 0.0
0.5 0.5 0.5
1.0 1.0 1.0
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0`;
    const result = parseTechnicalLut(content);
    expect(result.hasShaper).toBe(true);
    expect(result.shaperSize).toBe(3);
  });

  it("validates technical LUT descriptor", () => {
    const descriptor = createTechnicalLutDescriptor(
      "test_lut",
      "Test LUT",
      "input",
      null,
      "rec709",
      "rec2020"
    );
    expect(descriptor.isValid).toBe(false);
    expect(descriptor.validationErrors.length).toBeGreaterThan(0);
  });
});

describe("P14 - delivery conformance", () => {
  it("has delivery profiles", () => {
    expect(DELIVERY_PROFILES.rec709_sdr).toBeDefined();
    expect(DELIVERY_PROFILES.rec2020_hlg).toBeDefined();
    expect(DELIVERY_PROFILES.rec2020_pq).toBeDefined();
  });

  it("validates compliant Rec.709 export", () => {
    const result = validateDeliveryConformance(
      {
        width: 1920,
        height: 1080,
        codec: "h264",
        container: "mp4",
        colorPrimaries: "rec709",
        colorTransfer: "bt1886",
        colorSpace: "bt709",
        range: { type: "limited" },
        bitDepth: 8,
        hasAudio: true,
        fps: 24,
        durationSeconds: 10
      },
      "rec709_sdr"
    );
    expect(result.isCompliant).toBe(true);
  });

  it("flags non-compliant codec", () => {
    const result = validateDeliveryConformance(
      {
        width: 1920,
        height: 1080,
        codec: "vp9",
        container: "webm",
        colorPrimaries: "rec709",
        colorTransfer: "bt1886",
        colorSpace: "bt709",
        range: { type: "limited" },
        bitDepth: 8,
        hasAudio: false,
        fps: 24,
        durationSeconds: 10
      },
      "rec709_sdr"
    );
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("vp9");
  });

  it("builds FFmpeg color args", () => {
    const args = buildFFmpegColorArgs("rec2020_pq");
    expect(args.length).toBeGreaterThan(0);
    expect(args.some(a => a.includes("bt2020"))).toBe(true);
  });

  it("builds export color summary", () => {
    const summary = buildExportColorSummary(
      "Apple Log",
      "ACEScg",
      "Rec.2020 PQ",
      "Rec.2020 PQ",
      ["input_lut"],
      [],
      "none",
      "none",
      []
    );
    expect(summary.sourceProfile).toBe("Apple Log");
    expect(summary.workingSpace).toBe("ACEScg");
    expect(summary.activeTechnicalLuts).toContain("input_lut");
  });
});
