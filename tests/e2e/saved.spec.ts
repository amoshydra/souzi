import { expect, test } from "@playwright/test";
import { openApp, openEnglishEntry } from "./helpers/app";

test("saves an English word and removes it", async ({ page }) => {
  await openApp(page);
  await openEnglishEntry(page, "run");

  await page.getByRole("button", { name: "Save word" }).click();
  await expect(
    page.getByRole("button", { name: "Saved — remove from saved words" }),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: "Mobile" })
    .getByRole("button", { name: /^Saved/ })
    .click();

  await expect(page.getByRole("heading", { name: "Saved words", level: 1 })).toBeVisible();
  await expect(page.locator(".saved-main").filter({ hasText: "run" })).toBeVisible();

  await page.getByRole("button", { name: "Remove run from saved words" }).click();
  await expect(page.getByRole("heading", { name: "No saved words yet" })).toBeVisible();
});
