import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.4] Open an existing TagAnalyzer board.
        await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
        await expect(
            page.getByRole('button', { name: 'TAG ANALYZER.taz', exact: true }),
        ).toBeVisible();
    });

    test.describe('Help popup', () => {
        test('opens from Tag Analyzer', async ({ page }) => {
            // 3. [1.2.1.6] Open Help.
            await page
                .getByRole('button', { name: 'Open help', exact: true })
                .click();

            const popup = page.getByRole('dialog');

            await expect(popup).toBeVisible();
            await expect(
                popup.getByRole('heading', { name: 'Board Header' }),
            ).toBeVisible();
            await expect(
                popup.getByRole('button', { name: 'Close modal' }),
            ).toBeVisible();
        });
    });
});
