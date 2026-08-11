import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer board range validation', () => {
    test('shows an inline error for an invalid board range', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByTestId('new-board-taz').click();

        // 2. Open Board Range.
        await page.getByTestId('tag-analyzer-board-range-button').click();
        const rangeDialog = page.getByTestId('tag-analyzer-range-dialog');
        await expect(rangeDialog).toBeVisible();

        // 3. Enter an invalid range.
        await rangeDialog
            .getByTestId('tag-analyzer-range-kind-numeric-button')
            .click();
        await rangeDialog
            .getByTestId('tag-analyzer-range-from-input')
            .fill('10');
        await rangeDialog
            .getByTestId('tag-analyzer-range-to-input')
            .fill('5');
        await rangeDialog.getByTestId('tag-analyzer-range-apply-button').click();

        // 4. Check the inline validation message.
        const validationMessage = rangeDialog.getByTestId(
            'tag-analyzer-range-validation-message',
        );
        await expect(validationMessage).toHaveRole('alert');
        await expect(validationMessage).toHaveText(
            'Invalid input - enter both From and To using numbers or first/last expressions, with From less than To.',
        );
    });
});
