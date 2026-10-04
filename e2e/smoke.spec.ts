import { expect, test } from '@playwright/test';

test('browse, filter, reveal a solution and switch language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /পদার্থবিজ্ঞান/ }).first().click();
  await expect(page).toHaveURL(/\/ssc\/physics\/$/);
  await page.locator('.filters').getByText('২. গতি').click();
  await page.locator('.filters').getByRole('button', { name: 'সহজ' }).click();
  await expect(page).toHaveURL(/chapters=02-motion/);
  await expect(page).toHaveURL(/difficulty=easy/);

  const metas = page.locator('.card .meta');
  await expect(metas.first()).toBeVisible();
  for (const text of await metas.allTextContents()) expect(text).toContain('সহজ');

  const card = page.locator('.card').first();
  await card.getByRole('button', { name: 'সমাধান দেখাও' }).click();
  await expect(card.locator('.solution')).toBeVisible();

  const stem = page.locator('.card .q-body').first();
  const bn = await stem.textContent();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(stem).not.toHaveText(bn ?? '');
  await expect(page.locator('h1 .en')).toBeVisible();
});

test('build a 5-MCQ set and open its print view', async ({ page }) => {
  await page.goto('/ssc/physics/build');
  const mcq = page.getByLabel('MCQ সংখ্যা');
  await mcq.fill('5');
  await page.getByRole('button', { name: 'সেট তৈরি করুন' }).click();
  await expect(page.locator('.card')).toHaveCount(5);
  await expect(page).toHaveURL(/mcq=5/);

  await page.getByRole('link', { name: 'প্রিন্ট / PDF' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Answer Sheet' })).toBeVisible();
});

test('the bank still works when localStorage throws', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage is disabled', 'SecurityError');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/ssc/physics/');
  await expect(page.locator('.card').first()).toBeVisible();
  await page.locator('.card').first().getByRole('button', { name: 'বুকমার্ক করুন' }).click();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.locator('h1 .en')).toBeVisible();
  expect(errors).toEqual([]);
});
