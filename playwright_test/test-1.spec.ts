import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://127.0.0.1:7777/web/ui/login');
  await page.getByRole('textbox', { name: 'User' }).click();
  await page.getByRole('textbox', { name: 'User' }).fill('sys');
  await page.getByRole('textbox', { name: 'User' }).press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill('Manager');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');

  await page.locator('div').filter({ hasText: /^TAG ANALYZER$/ }).nth(1).click();
  await page.locator('._button_uwue7_10._button--secondary_uwue7_357').click();
  await page.getByRole('button', { name: 'dew_point' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('New chart2024-03-01 10:33:20')).toBeVisible();
  await expect(page.locator('div').filter({ hasText: /^Time range not set$/ }).first()).toBeVisible();
  await expect(page.locator('._button_uwue7_10._button--secondary_uwue7_357._button--md_uwue7_440._button--full-width_uwue7_471')).toBeVisible();
  await page.locator('._button_uwue7_10._button--secondary_uwue7_357').first().click();
  await page.locator('._button_uwue7_10._button--secondary_uwue7_357').first().click();
  await page.locator('canvas').click({
    position: {
      x: 555,
      y: 136
    }
  });
  await expect(page.locator('#root')).toMatchAriaSnapshot(`- text: "/\\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ ~ \\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ \\\\( interval : 5min \\\\)/"`);
  await page.locator('.chart > button:nth-child(3)').click();
  await page.locator('.chart > button:nth-child(3)').click();
  await expect(page.locator('#root')).toMatchAriaSnapshot(`- text: "/\\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ ~ \\\\d+-\\\\d+-\\\\d+ \\\\d+:\\\\d+:\\\\d+ \\\\( interval : 5min \\\\)/"`);
});