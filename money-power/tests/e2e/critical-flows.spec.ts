import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Critical user flows, driven through the real UI against a real database.
 * Each run signs up its own user through the genuine magic-link flow.
 *
 * Note on locators: field labels are rendered uppercase by CSS, and Chromium
 * computes accessible names from rendered text, so these use Playwright's
 * default case-insensitive matching and scope by form rather than exact names.
 */

function formWith(page: Page, buttonName: string): Locator {
  return page.locator("form").filter({ has: page.getByRole("button", { name: buttonName }) });
}

async function signIn(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Your name").fill("Diteria");
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();

  // With no SMTP transport configured the link is shown for local use.
  const link = page.locator("a[href*='/api/auth/callback']");
  await expect(link).toBeVisible();
  await page.goto((await link.getAttribute("href"))!);
  await expect(page.getByRole("heading", { name: /hello, diteria/i })).toBeVisible();

  return email;
}

async function addTransaction(
  page: Page,
  values: { date: string; merchant: string; category: string; amount: string },
) {
  await page.getByRole("link", { name: "Transactions" }).click();
  const form = formWith(page, "Add transaction");
  await form.getByLabel("Date").fill(values.date);
  await form.getByLabel("Merchant").fill(values.merchant);
  await form.getByLabel("Category").selectOption({ label: values.category });
  await form.getByLabel("Amount").fill(values.amount);
  await form.getByRole("button", { name: "Add transaction" }).click();
  await expect(page.getByRole("cell", { name: values.merchant })).toBeVisible();
}

async function setPlan(page: Page, category: string, amount: string) {
  await page.getByRole("link", { name: "Monthly Budget" }).click();
  await page.getByLabel(`${category} monthly plan`).fill(amount);
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
}

test("a new user signs in and lands on a seeded dashboard", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Monthly spend")).toBeVisible();
  await expect(page.getByText("Plan left")).toBeVisible();
  await expect(page.getByText("Waste to cut")).toBeVisible();
  await expect(page.getByText("Next check left")).toBeVisible();
  await expect(page.getByText("No CUT items yet—keep logging transactions.")).toBeVisible();

  // A brand-new user gets the full starter category list.
  await page.getByRole("link", { name: "Categories & Lists" }).click();
  await expect(page.getByRole("cell", { name: "Subscriptions" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Kids Allowance" })).toBeVisible();
});

test("logging a transaction derives its classification and updates the dashboard", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Transactions" }).click();

  const form = formWith(page, "Add transaction");
  await form.getByLabel("Date").fill("2026-08-10");
  await form.getByLabel("Merchant").fill("Netflix");
  await form.getByLabel("Category").selectOption({ label: "Subscriptions" });
  await form.getByLabel("Amount").fill("64.00");

  // Choosing a category fills in group, need/want and the waste signal.
  await expect(page.getByText("Auto-filled:")).toContainText("Flexible");
  await expect(page.getByText("Auto-filled:")).toContainText("Want");
  await expect(page.getByText("Auto-filled:")).toContainText("Cut");

  await form.getByRole("button", { name: "Add transaction" }).click();
  const row = page.getByRole("row").filter({ hasText: "Netflix" });
  await expect(row).toContainText("Flexible");
  await expect(row).toContainText("$64.00");

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.locator(".mp-card").filter({ hasText: "Monthly spend" })).toContainText("$64.00");
  await expect(page.locator(".mp-card").filter({ hasText: "Waste to cut" })).toContainText("$64.00");
  await expect(page.getByText("Pause your CUT items")).toBeVisible();
});

test("a monthly plan produces variance and a decision status", async ({ page }) => {
  await signIn(page);
  await addTransaction(page, {
    date: "2026-08-10",
    merchant: "Steakhouse",
    category: "Dining Out",
    amount: "120.00",
  });
  await setPlan(page, "Dining Out", "100");

  const row = page.getByRole("row").filter({ hasText: "Dining Out" });
  await expect(row).toContainText("CUT / RESET");
  await expect(row).toContainText("-$20.00");
  await expect(row).toContainText("120%");
});

test("the cut list ranks savings and a new cap can be accepted", async ({ page }) => {
  await signIn(page);
  await addTransaction(page, {
    date: "2026-08-11",
    merchant: "Streaming bundle",
    category: "Subscriptions",
    amount: "80.00",
  });
  await setPlan(page, "Subscriptions", "60");

  await page.getByRole("link", { name: "Cut List" }).click();
  const row = page.getByRole("row").filter({ hasText: "Subscriptions" });
  // Cut signal: max(overspend $20, half of $80) = $40, so the new cap is $20.
  await expect(row).toContainText("$40.00");
  await expect(row).toContainText("$20.00");

  await row.getByRole("button", { name: "Accept new cap" }).click();
  await expect(page.getByText("Cap confirmed at $20.00")).toBeVisible();

  await page.getByRole("link", { name: "Monthly Budget" }).click();
  await expect(page.getByLabel("Subscriptions monthly plan")).toHaveValue("20.00");
});

test("an over-allocated paycheck warns on both the plan and the dashboard", async ({ page }) => {
  await signIn(page);

  await page.getByRole("link", { name: "Setup" }).click();
  const setup = formWith(page, "Save setup");
  await setup.getByLabel("Take-home pay per check").fill("2000");
  await setup.getByLabel("Next payday").fill("2026-08-28");
  await setup.getByLabel("Savings rate target").fill("10");
  await setup.getByRole("button", { name: "Save setup" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("link", { name: "Paycheck Plan" }).click();
  await page.getByRole("button", { name: "New paycheck plan" }).click();
  const plan = formWith(page, "Save paycheck plan");

  // Savings is pre-filled from the 10% target on $2,000 take-home pay.
  await expect(plan.getByLabel("Savings")).toHaveValue("200.00");

  await plan.getByLabel("Payday").fill("2026-08-28");
  await plan.getByLabel("Net pay").fill("2000");
  await plan.getByLabel("Bills & essentials").fill("1900");
  await expect(page.getByText("Over-allocated", { exact: true })).toBeVisible();

  await plan.getByRole("button", { name: "Save paycheck plan" }).click();
  await expect(page.getByText("assigns $100.00 more than it brings home")).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.locator(".mp-card").filter({ hasText: "Next check left" })).toContainText("-$100.00");
  await expect(page.getByText("Over-allocated", { exact: true }).first()).toBeVisible();
});

test("the withholding check asks for inputs, then reports a recoverable amount", async ({ page }) => {
  await signIn(page);

  await page.getByRole("link", { name: "Withholding" }).click();
  await expect(page.getByText("Missing inputs")).toBeVisible();
  await expect(page.getByText("This is a planning estimate, not tax advice")).toBeVisible();

  await page.getByRole("link", { name: "Setup" }).first().click();
  const setup = formWith(page, "Save setup");
  await setup.getByLabel("Estimated annual tax liability").fill("8000");
  await setup.getByLabel("Income tax withheld year-to-date").fill("6000");
  await setup.getByLabel("Regular withholding per check").fill("400");
  await setup.getByLabel("Remaining paychecks this year").fill("8");
  await setup.getByRole("button", { name: "Save setup" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.getByRole("link", { name: "Withholding" }).click();
  await expect(page.getByText(/increase in spending power/i)).toContainText("$150.00");
  await expect(page.getByText("This is a planning estimate, not tax advice")).toBeVisible();
});

test("recurring bills stay out of actual spending until a payment is recorded", async ({ page }) => {
  await signIn(page);

  await page.getByRole("link", { name: "Recurring Bills" }).click();
  await page.getByRole("button", { name: "Add a bill" }).click();
  const form = formWith(page, "Save bill");
  await form.getByLabel("Merchant or account").fill("T-Mobile");
  await form.getByLabel("Category").selectOption({ label: "Utilities" });
  await form.getByLabel("Expected amount").fill("300");
  await form.getByLabel("Confirmation").selectOption("NeedsConfirmation");
  await form.getByRole("button", { name: "Save bill" }).click();

  const row = page.getByRole("row").filter({ hasText: "T-Mobile" });
  await expect(row).toContainText("Needs confirmation");

  // An unconfirmed bill is an expectation, never actual spending.
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.locator(".mp-card").filter({ hasText: "Monthly spend" })).toContainText("$0.00");

  await page.getByRole("link", { name: "Recurring Bills" }).click();
  await page.getByRole("button", { name: "Record payment" }).click();
  const payForm = formWith(page, "Log it");
  await payForm.getByLabel("Paid on").fill("2026-08-15");
  await payForm.getByRole("button", { name: "Log it" }).click();

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page.locator(".mp-card").filter({ hasText: "Monthly spend" })).toContainText("$300.00");
});
