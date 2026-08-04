import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer Save As', () => {
    test('opens the Save As dialog', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 2. Open Save As.
        await page
            .getByRole('button', { name: 'Open Save As', exact: true })
            .click();
        const saveDialog = page.getByRole('dialog');
        await expect(
            saveDialog.getByText('Save As', { exact: true }),
        ).toBeVisible();

        // 3. Check the file name.
        await expect(
            saveDialog.getByLabel('File name', { exact: true }),
        ).toHaveValue(/\.taz$/);

        // 4. Cancel without saving.
        await saveDialog
            .getByRole('button', { name: 'Cancel', exact: true })
            .click();
        await expect(saveDialog).toHaveCount(0);
    });
});
