import { test, expect } from "@playwright/test";

test("la liste des articles s'affiche avec le bon nombre d'entrées", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BlogMigrate" })).toBeVisible();

  const articleCount = await page.locator("article").count();
  expect(articleCount).toBe(20);

  await expect(page.getByText(/\d+ articles/)).toBeVisible();
});

test("une page article affiche l'auteur, les tags, et les commentaires", async ({ page }) => {
  await page.goto("/");

  const firstArticleLink = page.locator("article").first().getByRole("link");
  await firstArticleLink.click();
  await page.waitForURL(/\/posts\//);

  await expect(page.locator("h1")).toBeVisible();

  const tags = page.locator("article span.rounded-full");
  expect(await tags.count()).toBeGreaterThan(0);

  await expect(page.getByRole("heading", { level: 2 }).filter({ hasText: /commentaire/ })).toBeVisible();
});
