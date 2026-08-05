import { expect, type Page } from '@playwright/test';

export async function login(page: Page) {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:7777';

    // Feature M.1.1 - Open the login page.
    await page.goto(`${baseUrl}/web/ui/login`);

    // Feature M.1.2 - Enter the user ID.
    await page.getByPlaceholder('User').fill('sys');

    // Feature M.1.3 - Enter the password.
    await page.getByPlaceholder('Password').fill('Manager');

    // Feature M.1.4 - Sign in.
    await page.getByRole('button', { name: 'SIGN IN' }).click();

    // Feature M.1.5 - Open the authenticated application.
    await expect(page).toHaveURL(/\/web\/ui\/?$/);
}
