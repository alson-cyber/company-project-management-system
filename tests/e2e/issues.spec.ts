import { expect, test } from "@playwright/test";
import { signIn } from "./sign-in";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("hierarchy renders project issues from PostgreSQL", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  const tree = page.getByRole("tree", { name: "Work breakdown" });
  await expect(tree.getByRole("treeitem", { name: /Epic AQUA-1 Guest booking experience/ })).toBeVisible();
  await expect(tree.getByRole("treeitem", { name: /User Story AQUA-2 Streamline guest booking flow/ })).toBeVisible();
  await expect(tree.getByRole("treeitem", { name: /Sub-task AQUA-8 Cache daily availability/ })).toBeVisible();
  await expect(page.getByText(/Project progress \d+% from executable work/)).toBeVisible();
});

test("expand and collapse keep the selection from rewriting the tree", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  const epic = page.getByRole("treeitem", { name: /Epic AQUA-1 Guest booking experience/ });
  await epic.getByRole("button", { name: "Collapse AQUA-1" }).click();
  await expect(page.getByRole("treeitem", { name: /Streamline guest booking flow/ })).toHaveCount(0);

  await page.getByRole("link", { name: /Operations dashboard/ }).click();
  await expect(page).toHaveURL(/\/projects\/AQUA\/issues\/\d+$/);
  await expect(page.getByRole("treeitem", { name: /Streamline guest booking flow/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Expand all" }).click();
  await expect(page.getByRole("treeitem", { name: /Streamline guest booking flow/ })).toBeVisible();
  await page.getByRole("button", { name: "Collapse all" }).click();
  await expect(page.getByRole("treeitem", { name: /Streamline guest booking flow/ })).toHaveCount(0);
});

test("child actions offer only the legal next type", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  const epic = page.getByRole("treeitem", { name: /Epic AQUA-1 Guest booking experience/ });
  await expect(epic.getByRole("button", { name: "Add User Story" })).toBeVisible();
  await expect(epic.getByRole("button", { name: "Add Task" })).toHaveCount(0);

  const subtask = page.getByRole("treeitem", { name: /Sub-task AQUA-4 Design mobile layouts/ });
  await expect(subtask.getByRole("button", { name: /^Add / })).toHaveCount(0);

  await epic.getByRole("button", { name: "Add User Story" }).click();
  await expect(page.getByLabel("As a")).toBeVisible();
  await expect(page.getByLabel("I want")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Type" })).toHaveCount(1);
});

test("search keeps ancestor context and can be reset", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  await page.getByLabel("Search issues").fill("cache daily");
  await expect(page.getByRole("treeitem", { name: /Cache daily availability/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Implement availability API/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Guest booking experience/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Design booking wizard/ })).toHaveCount(0);
  await expect(page.getByRole("treeitem", { name: /Operations dashboard/ })).toHaveCount(0);

  await page.getByLabel("Search issues").fill("zzzz-no-such-issue");
  await expect(page.getByText("No issues match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("treeitem", { name: /Operations dashboard/ })).toBeVisible();
});

test("filters keep ancestor context and reset cleanly", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  const filters = page.getByRole("region", { name: "Issue filters" });

  await filters.getByLabel("Status").selectOption("DONE");
  await expect(page.getByText("Filters active")).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Design booking wizard/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Guest booking experience/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /QA booking happy path/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await filters.getByLabel("Priority").selectOption("HIGHEST");
  await expect(page.getByRole("treeitem", { name: /Implement availability API/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Guest booking experience/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Operations dashboard/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await filters.getByLabel("Type").selectOption("SUB_TASK");
  await expect(page.getByRole("treeitem", { name: /Cache daily availability/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /Implement availability API/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /QA booking happy path/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Reset" }).click();
  await filters.getByLabel("Assignee").selectOption({ label: "Unassigned" });
  await expect(page.getByText("No issues match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("treeitem", { name: /Operations dashboard/ })).toBeVisible();
});

test("selecting a user story opens the inspector without leaving the hierarchy", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  await page.getByRole("link", { name: /Streamline guest booking flow/ }).click();
  await expect(page).toHaveURL(/\/projects\/AQUA\/issues\/2$/);
  await expect(page.getByRole("heading", { name: "Streamline guest booking flow" })).toBeVisible();
  await expect(page.getByText(/As a\s*resort guest/)).toBeVisible();
  await expect(page.getByText(/I want\s*to book activities through a simple flow/)).toBeVisible();
  await expect(page.getByRole("tree", { name: "Work breakdown" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Notes" })).toBeVisible();
  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByText("No notes yet.")).toBeVisible();
  await page.getByLabel("Internal note").fill("Concierge still gets walk-up requests");
  await page.getByRole("button", { name: "Status, In Progress" }).click();
  await page.getByRole("menuitem", { name: "In Review" }).click();
  await expect(page.getByLabel("Internal note")).toHaveValue("Concierge still gets walk-up requests");
  await expect(page.getByRole("button", { name: "Status, In Review" })).toBeVisible();
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Concierge still gets walk-up requests")).toBeVisible();
  await expect(page).toHaveURL(/section=notes/);
  await page.getByRole("button", { name: "Status, In Review" }).click();
  await page.getByRole("menuitem", { name: "In Progress" }).click();
  await expect(page.getByRole("button", { name: "Status, In Progress" })).toBeVisible();
});

test("a permalink opens the issue in the inspector", async ({ page }) => {
  await page.goto("/projects/AQUA/issues/2");
  await expect(page.getByRole("heading", { name: "Streamline guest booking flow" })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /User Story AQUA-2 Streamline guest booking flow/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.goto("/issues/AQUA-6");
  await expect(page).toHaveURL(/\/projects\/AQUA\/issues\/6$/);
  await expect(page.getByRole("heading", { name: "Implement availability API" })).toBeVisible();
  await expect(page.getByText("Part of")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open governing story AQUA-2, Streamline guest booking flow" })).toBeVisible();
  await page.getByRole("tab", { name: "Sub-tasks" }).click();
  await expect(
    page.getByRole("tabpanel", { name: /Sub-tasks/ }).getByRole("link", { name: /Cache daily availability/ }),
  ).toBeVisible();

  await page.goto("/projects/AQUA/issues/6?section=comments");
  await expect(page.getByRole("tab", { name: "Comments" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("No comments yet.")).toBeVisible();
});

test("mobile keeps navigation, hierarchy, and the issue reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/AQUA/issues");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();

  const epic = page.getByRole("treeitem", { name: /Epic AQUA-1 Guest booking experience/ });
  await epic.getByRole("button", { name: "Add User Story" }).click();
  await expect(page.getByLabel("As a")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("link", { name: /Streamline guest booking flow/ }).click();
  await expect(page.getByRole("heading", { name: "Streamline guest booking flow" })).toBeVisible();
  await page.getByRole("link", { name: "Back to hierarchy" }).click();
  await expect(page).toHaveURL(/\/projects\/AQUA\/issues$/);
  await expect(page.getByRole("tree", { name: "Work breakdown" })).toBeVisible();
});

test("creating an epic stays in the test database", async ({ page }) => {
  await page.goto("/projects/AQUA/issues");
  await page.getByRole("button", { name: "Create Epic" }).click();
  await page.getByLabel("Title").fill("E2E epic isolation");
  await page.getByRole("button", { name: "Create Epic" }).click();
  await expect(page.getByRole("treeitem", { name: /E2E epic isolation/ })).toBeVisible();
  await expect(page.getByRole("treeitem", { name: /E2E epic isolation/ })).toContainText("Unassigned");
});
