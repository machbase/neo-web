import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer toast', () => {
    test('shows an error for an invalid board range', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 3. [1.2.2.1] Open Board Range.
        await page
            .getByRole('button', { name: 'Board range', exact: true })
            .click();
        const rangeDialog = page.getByRole('dialog');
        await expect(rangeDialog).toBeVisible();

        // 4. [1.2.2.5, 1.2.2.6] Submit an invalid numeric range.
        await rangeDialog
            .getByRole('button', { name: 'Numeric', exact: true })
            .click();
        await rangeDialog.getByLabel('From', { exact: true }).fill('10');
        await rangeDialog.getByLabel('To', { exact: true }).fill('5');
        await rangeDialog
            .getByRole('button', { name: 'Apply', exact: true })
            .click();

        // 5. [1.5.3] Check the status toast.
        const toast = page.getByRole('status').filter({
            hasText: 'Please enter both numeric boundaries in a valid order.',
        });
        await expect(toast).toBeVisible();
    });
});
