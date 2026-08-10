import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer board range validation', () => {
    test('shows an inline error for an invalid board range', async ({ page }) => {
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

        // 4. Check the inline validation message.
        await expect(rangeDialog.getByRole('alert')).toHaveText(
            'Invalid input - enter both From and To using numbers or first/last expressions, with From less than To.',
        );
    });
});
