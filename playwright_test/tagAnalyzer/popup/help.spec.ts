import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { openNewTagAnalyzerBoard } from '../../support/tagAnalyzer';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new data-free TagAnalyzer board.
        await openNewTagAnalyzerBoard(page);
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
