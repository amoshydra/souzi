import { expect, type Page } from "@playwright/test";

export async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Add Chinese dictionary" })).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Search the dictionary" }),
  ).toBeVisible();
}

export async function openEnglishEntry(page: Page, word = "run"): Promise<void> {
  const search = page.getByRole("searchbox", { name: "Search the dictionary" });
  await search.fill(word);
  const result = page
    .getByRole("button", { name: new RegExp(`^${word}\\b`) })
    .first();
  await expect(result).toBeVisible();
  await result.click();
  await expect(page.getByRole("heading", { name: word, level: 1 })).toBeVisible();
}
