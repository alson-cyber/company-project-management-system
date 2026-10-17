import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";

async function signIn(page: Page, email = "alex.noor@workhub.test") {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.describe("member workspace", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

test("overview, board, timeline, files, team, and activity share AquaDesk", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/projects/AQUA");
  await expect(page.getByRole("navigation", { name: "Project sections" }).getByText("Overview")).toBeVisible();
  await expect(page.getByText(/executable items done|no executable work yet/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();

  await page.goto("/projects/AQUA/board");
  await expect(page.getByRole("article", { name: /Task AQUA-6 Implement availability API/ })).toBeVisible();
  await expect(page.getByRole("article", { name: /Epic / })).toHaveCount(0);
  await expect(page.getByRole("article", { name: /User Story / })).toHaveCount(0);

  await page.goto("/projects/AQUA/board?group=story");
  await expect(page.getByRole("heading", { name: "Streamline guest booking flow" })).toBeVisible();
  await page.goto("/projects/AQUA/board?group=epic");
  await expect(page.getByRole("heading", { name: "Guest booking experience" })).toBeVisible();
  await page.goto("/projects/AQUA/board?priority=HIGHEST");
  await expect(page.getByRole("article", { name: /AQUA-6/ })).toBeVisible();
  await expect(page.getByRole("article", { name: /QA booking happy path/ })).toHaveCount(0);

  await page.goto("/projects/AQUA/timeline");
  await expect(page.getByText("Oct 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Implement availability API/ }).first()).toBeVisible();

  await page.goto("/projects/AQUA/files");
  await expect(page.getByText("booking-flow.png")).toBeVisible();
  await expect(page.getByRole("link", { name: /AQUA-\d+\s+Implement availability API/ }).first()).toBeVisible();

  await page.goto("/projects/AQUA/team");
  await expect(page.getByRole("link", { name: /Sarah Kim/ })).toBeVisible();
  await page.getByRole("link", { name: /Sarah Kim/ }).click();
  await expect(page.getByRole("heading", { name: "Sarah Kim" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /Completed/ })).toBeVisible();

  await page.goto("/projects/AQUA/activity");
  await expect(page.getByLabel("Person")).toBeVisible();
  await page.getByLabel("Action").selectOption("issue.created");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("created Epic AQUA-1", { exact: true })).toBeVisible();
  await expect(page.getByText("changed status from To Do to In Progress")).toHaveCount(0);
});

test("a keyboard move persists and is recorded in activity", async ({ page }) => {
  await page.goto("/projects/AQUA/board");
  const card = page.getByRole("article", { name: /Sub-task AQUA-8 Cache daily availability/ });
  await card.getByLabel("Move AQUA-8 to").selectOption("IN_PROGRESS");
  await card.getByRole("button", { name: "Move" }).click();
  await expect(page.getByRole("region", { name: "In Progress" }).getByRole("article", { name: /AQUA-8/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "In Progress" }).getByRole("article", { name: /AQUA-8/ })).toBeVisible();

  await page.goto("/projects/AQUA/activity?issue=AQUA-8");
  await expect(page.getByText(/changed status from To Do to In Progress/)).toBeVisible();
  await page.goto("/projects/AQUA/issues");
  await expect(page.getByRole("treeitem", { name: /Cache daily availability/ })).toContainText("In Progress");
});

test("project tabs stay reachable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/projects/AQUA", "/projects/AQUA/board", "/projects/AQUA/timeline", "/projects/AQUA/files", "/projects/AQUA/team", "/projects/AQUA/activity"]) {
    await page.goto(path);
    await expect(page.getByRole("navigation", { name: "Project sections" })).toBeVisible();
  }
  await expect(page.getByText("Recorded changes for this project")).toBeVisible();
  await page.goto("/projects/AQUA/board");
  await expect(page.getByRole("article", { name: /AQUA-6/ })).toBeVisible();
  await page.goto("/projects/AQUA/timeline");
  await expect(page.getByRole("link", { name: /Implement availability API/ }).first()).toBeVisible();
});
});

test("an administrator cannot open project files", async ({ page }) => {
  await signIn(page, "omar.haleem@workhub.test");
  await page.goto("/projects/AQUA/files");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByText("booking-flow.png")).toHaveCount(0);
});
