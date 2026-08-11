import { expect, type Page } from '@playwright/test';

export async function login(page: Page) {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:7777';

    await page.goto(`${baseUrl}/web/ui/login`);

    await page.getByTestId('login-username-input').fill('sys');
    await page.getByTestId('login-password-input').fill('Manager');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/web\/ui\/?$/);
}
