import { test } from '@playwright/test';
import { login } from '../support/login';

test('logs in', async ({ page }) => {
    // Features M.1.1-M.1.5 - Complete the authentication flow.
    await login(page);
});
