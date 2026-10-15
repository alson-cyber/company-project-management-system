import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";

const accounts = {
  member: "alex.noor@workhub.test",
  executive: "alson.chen@workhub.test",
  admin: "omar.haleem@workhub.test",
} as const;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("unauthenticated visitors are sent to login", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in to Workhub" })).toBeVisible();
});

test("unknown credentials are rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("nobody@workhub.test");
  await page.getByLabel("Password").fill("definitely-wrong-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/couldn.t sign you in/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a member reaches projects from PostgreSQL and cannot open Executive", async ({ page }) => {
  await signIn(page, accounts.member);
  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /AquaDesk/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Executive" })).toHaveCount(0);

  const executive = await page.goto("/executive");
  expect(executive?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("an Executive can open the Executive overview", async ({ page }) => {
  await signIn(page, accounts.executive);
  await page.goto("/executive");
  await expect(page.getByRole("heading", { name: "Company delivery overview" })).toBeVisible();
  await expect(page.getByText("AquaDesk")).toBeVisible();
  await expect(page.getByText("SignVeli")).toBeVisible();
});

test("an Admin without membership does not see project content and cannot open Executive", async ({ page }) => {
  await signIn(page, accounts.admin);
  await page.goto("/projects");
  await expect(page.getByText("No projects to show")).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Workspace administration" })).toBeVisible();

  const executive = await page.goto("/executive");
  expect(executive?.status()).toBe(404);
});

test("a session survives a full page refresh", async ({ page }) => {
  await signIn(page, accounts.member);
  await page.goto("/projects");
  await expect(page.getByRole("main").getByRole("link", { name: /AquaDesk/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("main").getByRole("link", { name: /AquaDesk/ })).toBeVisible();
  await expect(page).toHaveURL(/\/projects/);
});
