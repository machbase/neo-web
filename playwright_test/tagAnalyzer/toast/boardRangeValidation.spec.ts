import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer toast', () => {
    test('shows an error for an invalid board range', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 2. Open Board Range.
        await page
            .getByRole('button', { name: 'Board range', exact: true })
            .click();
        const rangeDialog = page.getByRole('dialog');
        await expect(rangeDialog).toBeVisible();

        // 3. Enter an invalid range.
        await rangeDialog
            .getByRole('button', { name: 'Numeric', exact: true })
            .click();
        await rangeDialog.getByLabel('From', { exact: true }).fill('10');
        await rangeDialog.getByLabel('To', { exact: true }).fill('5');
        await rangeDialog
            .getByRole('button', { name: 'Apply', exact: true })
            .click();

        // 4. Check the toast.
        const toast = page.getByRole('status').filter({
            hasText: 'Please enter both numeric boundaries in a valid order.',
        });
        await expect(toast).toBeVisible();
    });
});
