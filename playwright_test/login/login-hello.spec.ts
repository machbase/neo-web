import { expect, test } from '@playwright/test';

test('types hello in the login user field', async ({ page }) => {
    await page.goto('http://127.0.0.1:7777/web/ui/login');

    const sUserInput = page.getByRole('textbox', { name: 'User' });

    await sUserInput.fill('hello');

    await expect(sUserInput).toHaveValue('hello');
});
