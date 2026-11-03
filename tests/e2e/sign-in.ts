import { expect, type Page } from "@playwright/test";

/** Exercise real sign-in while respecting the production limiter shared by CI's browser sessions. */
export async function signIn(page: Page, email = "alex.noor@workhub.test") {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass");

  const submit = async () => {
    const [response] = await Promise.all([
      page.waitForResponse((response) =>
        new URL(response.url()).pathname === "/api/auth/sign-in/email" && response.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);
    return response;
  };

  let response = await submit();
  if (response.status() === 429) {
    await expect(page.getByText("Too many sign-in attempts. Wait a minute and try again.")).toBeVisible();
    const retryAfter = Number(response.headers()["x-retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(10);
    // This is the server's explicit retry interval, not a delay to mask slow UI.
    await page.waitForTimeout(retryAfter * 1000 + 100);
    response = await submit();
  }
  // Unexpected authentication failures (including a second 429) fail immediately.
  expect(response.status()).toBe(200);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
