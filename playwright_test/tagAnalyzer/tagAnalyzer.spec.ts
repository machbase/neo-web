import { expect, test } from '@playwright/test';
import { login } from '../support/login';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);
    });

    test('starts from the authenticated application', async ({ page }) => {
        // 2. [M.1.5] Confirm the authenticated application opened.
        await expect(page).toHaveURL(/\/web\/ui\/?$/);
    });
});
