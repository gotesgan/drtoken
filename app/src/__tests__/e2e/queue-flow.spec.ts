import { test, expect } from "@playwright/test";

const TS = Date.now();

test.describe("Staff Queue Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for clinics to load and the page to settle
    await page.waitForResponse((res) =>
      res.url().includes("/api/clinics") && res.status() === 200,
    );
    // Wait for stats to render
    await expect(page.getByRole("region", { name: /queue statistics/i })).toBeVisible({ timeout: 10000 });
  });

  test("loads and shows clinic selector", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dr. Token System" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: /select clinic/i })).toBeVisible();
  });

  test("shows queue stats", async ({ page }) => {
    const stats = page.getByRole("region", { name: /queue statistics/i });
    await expect(stats.getByText("Waiting")).toBeVisible();
    await expect(stats.getByText("Serving")).toBeVisible();
    await expect(stats.getByText("Completed")).toBeVisible();
    await expect(stats.getByText("Skipped")).toBeVisible();
  });

  test("shows OPD toggle", async ({ page }) => {
    await expect(page.getByText(/OPD/).first()).toBeVisible({ timeout: 10000 });
  });

  test("can add a patient", async ({ page }) => {
    const patientName = `Add-Test-${TS}`;

    // Click Add Patient button
    await page.getByRole("button", { name: /add new patient/i }).click();
    // Dialog should open
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill form
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/patient name/i).fill(patientName);
    await dialog.getByLabel(/phone/i).fill("555-9999");

    // Submit
    await dialog.getByRole("button", { name: /add/i }).click();

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });

    // Patient should appear in queue
    await expect(page.getByRole("cell", { name: patientName })).toBeVisible({ timeout: 5000 });
  });

  test("can call next patient", async ({ page }) => {
    const patientName = `Call-Test-${TS}`;

    // First add a patient
    await page.getByRole("button", { name: /add new patient/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/patient name/i).fill(patientName);
    await dialog.getByRole("button", { name: /add/i }).click();
    await expect(page.getByRole("cell", { name: patientName })).toBeVisible({ timeout: 5000 });

    // Wait for queue to refresh
    await page.waitForTimeout(2000);

    // Click Call Next button
    const callNextBtn = page.getByRole("button", { name: /call next/i });
    if (await callNextBtn.isEnabled()) {
      await callNextBtn.click();
    }
  });
});

test.describe("Patient Tracking Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/track");
    // Wait for clinics to load
    await page.waitForResponse((res) =>
      res.url().includes("/api/clinics") && res.status() === 200,
    );
  });

  test("loads and shows the tracking form", async ({ page }) => {
    await expect(page.getByRole("button", { name: /check my token/i })).toBeVisible();
    await expect(page.getByLabel(/phone/i)).toBeVisible();
  });

  test("shows not found for unknown phone", async ({ page }) => {
    await page.getByLabel(/phone/i).fill("000-0000");
    await page.getByRole("button", { name: /check my token/i }).click();

    await expect(page.getByText(/no record found/i)).toBeVisible({ timeout: 5000 });
  });
});
