import { expect, test } from "@playwright/test";
import { openApp } from "./helpers/app";

test("switches UI language and keeps it after reload", async ({ page }) => {
  await openApp(page);

  await page
    .getByRole("navigation", { name: "Mobile" })
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();

  const language = page.locator('select[name="app-language"]');
  await language.selectOption("zh-Hans");

  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByRole("heading", { name: "设置", level: 1 })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await expect(page.getByRole("heading", { name: "设置", level: 1 })).toBeVisible();

  await page.locator('select[name="app-language"]').selectOption("zh-Hant");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByRole("heading", { name: "設定", level: 1 })).toBeVisible();
});
