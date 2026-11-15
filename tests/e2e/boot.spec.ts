import { expect, test } from "@playwright/test";

test("first run shows setup, skips into search, and persists the choice", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Add Chinese dictionary" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Skip for now" })).toBeVisible();

  await page.getByRole("button", { name: "Skip for now" }).click();

  const search = page.getByRole("searchbox", { name: "Search the dictionary" });
  await expect(search).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile" })).toBeVisible();

  await page.reload();
  await expect(search).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Add Chinese dictionary" }),
  ).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});
