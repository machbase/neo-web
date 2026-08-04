import { test } from '@playwright/test';
import { login } from '../support/login';

test('logs in', async ({ page }) => {
    await login(page);
});
