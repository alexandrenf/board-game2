import { expect, test } from '@playwright/test';

test('loads initial routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('screen-game')).toBeVisible();

  await page.goto('/explore');
  await expect(page.getByTestId('screen-explore-redirect')).toBeVisible();
  await expect(page.getByTestId('modal-help-center')).toBeVisible();
  await expect(page.getByText('Sobre o Projeto')).toBeVisible();
});

test('menu controls remain visible after reloads', async ({ page }) => {
  await page.goto('/');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await expect(page.getByTestId('btn-start-or-continue-game')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('btn-open-rules-from-menu')).toBeVisible();
    await expect(page.getByTestId('btn-open-customization-from-menu')).toBeVisible();
    await page.reload();
  }
});
