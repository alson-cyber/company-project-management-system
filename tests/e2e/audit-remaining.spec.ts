import { access } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Dialog, type Page } from "@playwright/test";
import { Client } from "pg";
import { signIn } from "./sign-in";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required.");

function csvIssueKeys(csv: string): string[] {
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .filter((line) => line.length > 0)
    .map((line) => line.split(",")[0] ?? "");
}

async function pageIssueKeys(page: Page): Promise<string[]> {
  const table = page.getByRole("table", { name: "Overdue executable work" });
  if ((await table.count()) === 0) return [];
  return table.locator("tbody tr td .font-mono").allTextContents();
}

async function exportKeys(page: Page): Promise<string[]> {
  const href = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  return csvIssueKeys(await response.text());
}

function watchHydration(page: Page): string[] {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (/hydrat/i.test(message.text())) messages.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (/hydrat/i.test(error.message)) messages.push(error.message);
  });
  return messages;
}

async function signInAs(page: Page, email: string): Promise<void> {
  await page.context().clearCookies();
  await signIn(page, email);
}

async function answer(page: Page, accept: boolean, expected: string): Promise<void> {
  page.once("dialog", async (dialog: Dialog) => {
    expect(dialog.message()).toContain(expected);
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
}

test("admin archive waits for confirmation and changes navigation and reports", async ({ page }) => {
  test.setTimeout(90_000);
  const key = `Z${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const name = `Archive check ${key}`;
  await signInAs(page, "omar.haleem@workhub.test");
  await page.goto("/admin");
  await page.getByLabel("Project key").fill(key);
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Project lead").selectOption({ label: "Sarah Kim · Delivery Manager" });
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByText(`Created ${key}`)).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(key) });
  await expect(row).toBeVisible();

  await answer(page, false, "Archive this project?");
  await row.getByRole("button", { name: "Archive" }).click();
  await expect(row).toBeVisible();
  await expect(page.getByText("No archived projects")).toBeVisible();

  await answer(page, true, "Archive this project?");
  await row.getByRole("button", { name: "Archive" }).click();
  const archived = page.getByRole("listitem").filter({ hasText: key });
  await expect(archived).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(key) })).toHaveCount(0);

  await signInAs(page, "sarah.kim@workhub.test");
  await expect(page.getByRole("link", { name })).toHaveCount(0);
  await page.goto("/reports/overdue");
  await expect(page.getByLabel("Project").locator("option", { hasText: name })).toHaveCount(0);
  await page.goto(`/projects/${key}`);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();

  await signInAs(page, "omar.haleem@workhub.test");
  await page.goto("/admin");
  await page.getByRole("listitem").filter({ hasText: key }).getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("row", { name: new RegExp(key) })).toBeVisible();

  await signInAs(page, "sarah.kim@workhub.test");
  await expect(page.getByRole("link", { name })).toBeVisible();
  await page.goto("/reports/overdue");
  await expect(page.getByLabel("Project").locator("option", { hasText: name })).toHaveCount(1);
});

test("admin purge removes only a previously removed file, and a member cannot administer it", async ({ page }) => {
  test.setTimeout(90_000);
  await signInAs(page, "alex.noor@workhub.test");
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);

  await signInAs(page, "sarah.kim@workhub.test");
  await page.goto("/projects/AQUA/issues");
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByLabel("Title").fill("Purge browser epic");
  await page.locator("form").filter({ hasText: "Create Epic" }).getByLabel("Assignee").selectOption({ label: "Sarah Kim" });
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByRole("link", { name: "Purge browser epic" }).click();
  await page.getByRole("tab", { name: /Attachments/ }).click();
  await page.locator("#issue-attachment").setInputFiles({
    name: "purge-me.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("synthetic purge bytes"),
  });
  await expect(page.getByText("purge-me.txt", { exact: true })).toBeVisible();
  await answer(page, true, "Remove purge-me.txt?");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("purge-me.txt", { exact: true })).toHaveCount(0);

  await signInAs(page, "omar.haleem@workhub.test");
  await page.goto("/admin");
  const file = page.getByRole("listitem").filter({ hasText: "purge-me.txt" });
  await expect(file).toBeVisible();
  await answer(page, false, "Delete the stored file permanently?");
  await file.getByRole("button", { name: "Purge file" }).click();
  await expect(file).toBeVisible();
  await answer(page, true, "Delete the stored file permanently?");
  await file.getByRole("button", { name: "Purge file" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "purge-me.txt" })).toHaveCount(0);

  const db = new Client({ connectionString: testDatabaseUrl });
  await db.connect();
  try {
    const row = await db.query<{ id: string; object_key: string; purged_at: Date | null; deleted_at: Date | null }>(
      "SELECT id, object_key, purged_at, deleted_at FROM issue_attachments WHERE original_filename = $1",
      ["purge-me.txt"],
    );
    const attachment = row.rows[0];
    expect(attachment?.deleted_at).toBeTruthy();
    expect(attachment?.purged_at).toBeTruthy();
    const event = await db.query("SELECT id FROM activity_events WHERE entity_id = $1 AND action = $2", [
      attachment?.id,
      "issue.attachment_purged",
    ]);
    expect(event.rowCount).toBe(1);
    const stored = path.resolve(process.env.STORAGE_LOCAL_DIR ?? ".data/storage", attachment!.object_key);
    await expect(access(stored)).rejects.toThrow();
  } finally {
    await db.end();
  }
});

test("the overdue CSV contains the same issues as the filtered report", async ({ page }) => {
  await signInAs(page, "alex.noor@workhub.test");
  await page.goto("/reports/overdue?project=AQUA");
  const allKeys = await pageIssueKeys(page);
  expect(allKeys.length).toBeGreaterThan(0);
  expect(await exportKeys(page)).toEqual(allKeys);

  await page.goto("/reports/overdue?project=AQUA&status=DONE");
  expect(await pageIssueKeys(page)).toEqual([]);
  expect(await exportKeys(page)).toEqual([]);

  await page.goto("/reports/overdue?project=AQUA");
  const priority = (await page.getByRole("table", { name: "Overdue executable work" }).locator("tbody tr").first().locator("td").nth(3).innerText()).trim();
  await page.getByLabel("Priority").selectOption({ label: priority });
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/priority=/);
  const filtered = await pageIssueKeys(page);
  expect(filtered.length).toBeGreaterThan(0);
  expect(filtered.length).toBeLessThanOrEqual(allKeys.length);
  expect(await exportKeys(page)).toEqual(filtered);
  for (const key of filtered) expect(allKeys).toContain(key);
});

test("the archive menu hydrates and archives on desktop and mobile", async ({ page }) => {
  test.setTimeout(60_000);
  const hydration = watchHydration(page);
  await signInAs(page, "alex.noor@workhub.test");
  await page.goto("/projects/AQUA/issues");
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByLabel("Title").fill("Inspector archive check");
  await page.locator("form").filter({ hasText: "Create Epic" }).getByLabel("Assignee").selectOption({ label: "Alex Noor" });
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByRole("link", { name: "Inspector archive check" }).click();
  await expect(page.getByRole("button", { name: "More actions" })).toBeVisible();
  await page.getByRole("button", { name: "More actions" }).click();
  await expect(page.getByRole("dialog", { name: "Archive" })).toBeVisible();
  await answer(page, true, "Archive this issue?");
  const inspector = page.getByRole("complementary", { name: "Issue inspector" });
  await page.getByRole("dialog", { name: "Archive" }).getByRole("button", { name: "Archive", exact: true }).click();
  await expect(inspector.getByText("Archived", { exact: true })).toBeVisible();
  const restore = page.getByRole("button", { name: "Restore issue" });
  if (!(await restore.isVisible())) await page.getByRole("button", { name: "More actions" }).click();
  await restore.click();
  await expect(inspector.getByText("Archived", { exact: true })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("button", { name: "More actions" })).toBeVisible();
  await page.getByRole("button", { name: "More actions" }).click();
  await answer(page, true, "Archive this issue?");
  await page.getByRole("dialog", { name: "Archive" }).getByRole("button", { name: "Archive", exact: true }).click();
  await expect(inspector.getByText("Archived", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Issue inspector" }).getByText("Archived", { exact: true })).toBeVisible();
  const restoreAgain = page.getByRole("button", { name: "Restore issue" });
  if (!(await restoreAgain.isVisible())) await page.getByRole("button", { name: "More actions" }).click();
  await restoreAgain.click();
  await expect(page.getByRole("complementary", { name: "Issue inspector" }).getByText("Archived", { exact: true })).toHaveCount(0);
  expect(hydration).toEqual([]);
});
