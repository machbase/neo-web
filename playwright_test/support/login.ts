import { expect, type Page } from '@playwright/test';

export async function login(page: Page) {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:7777';

    await page.goto(`${baseUrl}/web/ui/login`);

    await page.getByPlaceholder('User').fill('sys');
    await page.getByPlaceholder('Password').fill('Manager');
    await page.getByRole('button', { name: 'SIGN IN' }).click();

    await expect(page).toHaveURL(/\/web\/ui\/?$/);
}
