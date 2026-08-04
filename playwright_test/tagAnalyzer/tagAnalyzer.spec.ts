import { expect, test } from '@playwright/test';
import { login } from '../support/login';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('starts from the authenticated application', async ({ page }) => {
        await expect(page).toHaveURL(/\/web\/ui\/?$/);
    });
});
