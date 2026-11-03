import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test("a member can search by keyboard and open My Work and Inbox", async ({ page }) => {
  await signIn(page, "alex.noor@workhub.test");
  await page.goto("/my-work");
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await expect(page.getByRole("link", { name: /AQUA-6/ })).toBeVisible();

  await page.getByRole("link", { name: "In Progress" }).click();
  await expect(page).toHaveURL(/view=progress/);

  await page.keyboard.press("ControlOrMeta+k");
  const search = page.getByRole("dialog").getByRole("textbox", { name: "Search" });
  await search.fill("AQUA-6");
  await expect(page.getByRole("option", { name: /Implement availability API/ })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/projects\/AQUA\/issues\/6/);

  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await page.getByRole("button", { name: /Notifications/ }).click();
  await page.getByRole("menuitem", { name: "View all" }).click();
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
});

test("mobile My Work and Inbox stay reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "alex.noor@workhub.test");
  await page.goto("/my-work");
  await expect(page.getByRole("heading", { name: "My Work" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
});

test("an admin cannot search hidden project content", async ({ page }) => {
  await signIn(page, "omar.haleem@workhub.test");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Search" }).fill("Implement availability API");
  await expect(page.getByText("No matching projects, issues or people.")).toBeVisible();
});

test("an executive can search an issue by key", async ({ page }) => {
  await signIn(page, "alson.chen@workhub.test");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Search" }).fill("AQUA-6");
  await expect(page.getByRole("option", { name: /Implement availability API/ })).toBeVisible();
});
