import { expect, test } from '@playwright/test';

test('loads initial routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('screen-game')).toBeVisible();

  await page.goto('/explore');
  await expect(page.getByTestId('screen-explore')).toBeVisible();
  await expect(page.getByText('Sobre o Projeto')).toBeVisible();
});
