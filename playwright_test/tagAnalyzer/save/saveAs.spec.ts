import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer Save As', () => {
    test('opens the Save As dialog', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 3. [1.2.3.3] Open Save As.
        await page
            .getByRole('button', { name: 'Open Save As', exact: true })
            .click();
        const saveDialog = page.getByRole('dialog');
        await expect(
            saveDialog.getByText('Save As', { exact: true }),
        ).toBeVisible();

        // 4. [1.2.3.5] Validate the default file name.
        await expect(
            saveDialog.getByLabel('File name', { exact: true }),
        ).toHaveValue(/\.taz$/);

        // 5. [1.2.3.18] Cancel without saving.
        await saveDialog
            .getByRole('button', { name: 'Cancel', exact: true })
            .click();
        await expect(saveDialog).toHaveCount(0);
    });
});
