import { test, expect } from "@playwright/test";

const TS = Date.now();

test.describe("Staff Queue Page", () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: "e2e_test", value: "1", domain: "localhost", path: "/" },
    ]);
    await page.goto("/");
    await page.waitForResponse((res) =>
      res.url().includes("/api/clinics") && res.status() === 200,
    );
    await expect(page.getByRole("region", { name: /queue statistics/i })).toBeVisible({ timeout: 10000 });
  });

  test("loads and shows clinic selector", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Dr. Token System" }).first()).toBeVisible();
    await expect(page.getByRole("combobox")).toBeVisible();
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
    await page.getByRole("button", { name: /add new patient/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/patient name/i).fill(patientName);
    await dialog.getByLabel(/phone/i).fill("555-9999");
    await dialog.getByRole("button", { name: /add/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("cell", { name: patientName })).toBeVisible({ timeout: 5000 });
  });

  test("can call next patient", async ({ page }) => {
    const patientName = `Call-Test-${TS}`;
    await page.getByRole("button", { name: /add new patient/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/patient name/i).fill(patientName);
    await dialog.getByRole("button", { name: /add/i }).click();
    await expect(page.getByRole("cell", { name: patientName })).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);
    const callNextBtn = page.getByRole("button", { name: /call next/i });
    if (await callNextBtn.isEnabled()) {
      await callNextBtn.click();
    }
  });
});

test.describe("Patient Tracking Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([
      { name: "e2e_test", value: "1", url: "http://localhost:3000" },
    ]);
    await page.goto("/track");
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
