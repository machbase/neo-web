import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer board range', () => {
    test('switches the range type', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByTestId('new-board-taz').click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Open Board Range.
        await board.getByTestId('range-button').click();
        const rangeDialog = page.getByTestId('tag-analyzer-range-dialog');
        const rangeTitle = rangeDialog.getByTestId('tag-analyzer-range-title');
        await expect(rangeTitle).toBeVisible();
        await expect(rangeTitle).toHaveText('Board Range');

        // 3. Select Numeric.
        const numericRange = rangeDialog.getByTestId(
            'tag-analyzer-range-kind-numeric-button',
        );
        await numericRange.click();
        await expect(numericRange).toHaveAttribute('aria-pressed', 'true');
        await expect(
            rangeDialog.getByTestId('tag-analyzer-range-from-input'),
        ).toBeVisible();
        await expect(
            rangeDialog.getByTestId('tag-analyzer-range-to-input'),
        ).toBeVisible();

        // 4. Close the dialog.
        await rangeDialog.getByTestId('tag-analyzer-range-cancel-button').click();
        await expect(rangeDialog).toHaveCount(0);
    });
});
