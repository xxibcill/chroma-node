import { test, expect } from "@playwright/test";

test.describe("App UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();

    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("net::ERR")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("shows empty state with import button when no media loaded", async ({ page }) => {
    const emptyState = page.locator(".empty-state");
    await expect(emptyState).toBeVisible();

    const importButton = page.locator(".primary-action");
    await expect(importButton).toBeVisible();
    await expect(importButton).toHaveText("Import Clip");
  });

  test("shows viewer canvas element", async ({ page }) => {
    const viewerCanvas = page.locator(".viewer-canvas");
    await expect(viewerCanvas).toBeVisible();
  });

  test("shows scopes panel with waveform and vectorscope", async ({ page }) => {
    const scopesPanel = page.locator(".scopes-panel");
    await expect(scopesPanel).toBeVisible();

    const waveformCanvas = page.locator(".scope-card-waveform .scope-canvas");
    await expect(waveformCanvas).toBeVisible();

    const vectorscopeCanvas = page.locator(".scope-card-vectorscope .scope-canvas");
    await expect(vectorscopeCanvas).toBeVisible();
  });

  test("playback controls are disabled when no media loaded", async ({ page }) => {
    const playToggle = page.locator(".play-toggle");
    await expect(playToggle).toBeDisabled();

    const firstFrameButton = page.locator('button[aria-label="First frame"]');
    await expect(firstFrameButton).toBeDisabled();

    const lastFrameButton = page.locator('button[aria-label="Last frame"]');
    await expect(lastFrameButton).toBeDisabled();
  });

  test("viewer mode buttons exist", async ({ page }) => {
    const originalButton = page.locator('button:has-text("Original")');
    await expect(originalButton).toBeVisible();

    const gradedButton = page.locator('button:has-text("Graded")');
    await expect(gradedButton).toBeVisible();

    const splitButton = page.locator('button:has-text("Split")');
    await expect(splitButton).toBeVisible();
  });

  test("color panel with node strip is visible", async ({ page }) => {
    const colorPanel = page.locator(".color-panel");
    await expect(colorPanel).toBeVisible();

    const nodeStrip = page.locator(".node-strip");
    await expect(nodeStrip).toBeVisible();
  });

  test("primary corrections are visible in color panel", async ({ page }) => {
    const colorPanel = page.locator(".color-panel");
    await expect(colorPanel).toBeVisible();

    const primaryTitle = page.locator('.panel-title:has-text("Primary")');
    await expect(primaryTitle).toBeVisible();

    const primaryCard = page.locator(".primary-card").first();
    await expect(primaryCard).toBeVisible();
  });

  test("qualifier section is visible in color panel", async ({ page }) => {
    const colorPanel = page.locator(".color-panel");
    await expect(colorPanel).toBeVisible();

    const qualifierTitle = page.locator('.panel-title:has-text("Qualifier")');
    await expect(qualifierTitle).toBeVisible();

    const maskCard = page.locator(".mask-card").first();
    await expect(maskCard).toBeVisible();
  });

  test("FFmpeg diagnostic indicator exists", async ({ page }) => {
    const diagnostic = page.locator(".diagnostic");
    await expect(diagnostic).toBeVisible();
  });
});
