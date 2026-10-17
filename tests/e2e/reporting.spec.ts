import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("a project lead without the Executive grant cannot open Executive", async ({ page }) => {
  await signIn(page, "sarah.kim@workhub.test");
  const response = await page.goto("/executive");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an executive can read health, attention, activity and a report", async ({ page }) => {
  await signIn(page, "alson.chen@workhub.test");
  await page.goto("/executive");
  await expect(page.getByRole("heading", { name: "Company delivery overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project health" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Management attention" })).toBeVisible();
  await expect(page.locator("#portfolio").getByRole("link", { name: "AquaDesk" })).toBeVisible();
  await page.goto("/executive/activity");
  await expect(page.getByRole("heading", { name: "Master activity" })).toBeVisible();
  await page.goto("/reports");
  await expect(page.getByRole("link", { name: "Project progress" })).toBeVisible();
  await page.goto("/reports/overdue");
  await expect(page.getByRole("heading", { name: "Overdue work" })).toBeVisible();
});

test("a member report stays on accessible projects and executive stays blocked", async ({ page }) => {
  await signIn(page, "emma.davis@workhub.test");
  const executive = await page.goto("/executive");
  expect(executive?.status()).toBe(404);
  await page.goto("/reports/progress");
  await expect(page.getByRole("main").getByRole("link", { name: "AquaDesk" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "SignVeli" })).toHaveCount(0);
  const csv = await page.request.get("/api/reports/export?report=progress");
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body).toContain("AquaDesk");
  expect(body).not.toContain("SignVeli");
});

test("an admin does not receive project report rows", async ({ page }) => {
  await signIn(page, "omar.haleem@workhub.test");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Workspace administration" })).toBeVisible();
  await page.goto("/reports/progress");
  await expect(page.getByText("You cannot see any projects")).toBeVisible();
  const csv = await page.request.get("/api/reports/export?report=overdue");
  expect(csv.ok()).toBeTruthy();
  const body = await csv.text();
  expect(body).not.toContain("AQUA-");
  expect(body).not.toContain("AquaDesk");
});

test("executive portfolio remains readable on a phone-width viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await signIn(page, "alson.chen@workhub.test");
  await page.goto("/executive");
  await expect(page.getByRole("heading", { name: "Project health" })).toBeVisible();
  await expect(page.getByRole("link", { name: "AquaDesk" }).first()).toBeVisible();
});

test("export without a session is rejected", async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL: "http://localhost:3100", storageState: { cookies: [], origins: [] } });
  const response = await request.get("/api/reports/export?report=overdue", { maxRedirects: 0 });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: "Sign in required." });
  await request.dispose();
});
