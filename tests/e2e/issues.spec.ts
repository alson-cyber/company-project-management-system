import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test("a member sees seeded AquaDesk issues from PostgreSQL and can create the legal chain", async ({ page }) => {
  await signIn(page, "alex.noor@workhub.test");
  await page.goto("/projects/AQUA/issues");
  await expect(page.getByRole("main").getByText("Guest booking experience")).toBeVisible();
  await expect(page.getByText("AQUA-1", { exact: true })).toBeVisible();

  const epicTitle = `E2E epic ${Date.now()}`;
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByLabel("Title").fill(epicTitle);
  await page.getByRole("button", { name: "Create Epic" }).click();
  await expect(page.getByRole("main").getByText(epicTitle)).toBeVisible();

  await page.getByRole("link", { name: new RegExp(epicTitle) }).click();
  await expect(page.getByRole("heading", { name: epicTitle })).toBeVisible();
  await page.getByRole("button", { name: "Add User Story" }).click();
  const createStory = page.locator("form").filter({ has: page.getByRole("button", { name: "Create User Story" }) });
  const storyTitle = `E2E story ${Date.now()}`;
  await createStory.getByLabel("Title").fill(storyTitle);
  await createStory.getByLabel("As a").fill("tester");
  await createStory.getByLabel("I want").fill("to create a legal story");
  await createStory.getByLabel("So that").fill("the hierarchy is enforced");
  await createStory.getByRole("button", { name: "Create User Story" }).click();
  await expect(page.getByRole("main").getByText(storyTitle)).toBeVisible({ timeout: 10_000 });
});

test("issue edits survive a full reload", async ({ page }) => {
  await signIn(page, "sarah.kim@workhub.test");
  await page.goto("/projects/AQUA/issues/1");
  await expect(page.getByRole("heading", { name: "Guest booking experience" })).toBeVisible();
  await page.getByLabel("Status").selectOption("IN_REVIEW");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Status")).toHaveValue("IN_REVIEW");
});

test("an Executive can read AquaDesk issues without write controls", async ({ page }) => {
  await signIn(page, "alson.chen@workhub.test");
  await page.goto("/projects/AQUA/issues");
  await expect(page.getByRole("main").getByText("Guest booking experience")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Epic" })).toHaveCount(0);
});

test("an Admin without membership cannot open AquaDesk issues", async ({ page }) => {
  await signIn(page, "omar.haleem@workhub.test");
  const response = await page.goto("/projects/AQUA/issues");
  expect(response?.status()).toBe(404);
});
