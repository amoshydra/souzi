import { expect, test } from "@playwright/test";
import { openApp, openEnglishEntry } from "./helpers/app";

test("searches English, opens an entry, and returns to search", async ({
  page,
}) => {
  await openApp(page);
  await openEnglishEntry(page, "run");

  await expect(page).toHaveURL(/#\/en\/\d+$/);
  await expect(page.getByRole("heading", { name: "run", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();

  const search = page.getByRole("searchbox", { name: "Search the dictionary" });
  await expect(search).toBeVisible();
  await expect(search).toHaveValue("run");

  // The browser back button should also unwind the same flow.
  await openEnglishEntry(page, "run");
  await page.goBack();
  await expect(search).toBeVisible();
});
