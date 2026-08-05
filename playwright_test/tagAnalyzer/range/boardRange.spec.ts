import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer board range', () => {
    test('switches the range type', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 3. [1.2.2.1] Open Board Range.
        await page
            .getByRole('button', { name: 'Board range', exact: true })
            .click();
        const rangeDialog = page.getByRole('dialog');
        await expect(
            rangeDialog.getByText('Board Range', { exact: true }),
        ).toBeVisible();

        // 4. [1.2.2.6] Switch to a numeric board range.
        const numericRange = rangeDialog.getByRole('button', {
            name: 'Numeric',
            exact: true,
        });
        await numericRange.click();
        await expect(numericRange).toHaveAttribute('aria-pressed', 'true');
        await expect(
            rangeDialog.getByLabel('From', { exact: true }),
        ).toBeVisible();
        await expect(
            rangeDialog.getByLabel('To', { exact: true }),
        ).toBeVisible();

        // 5. [1.2.2.2] Close Board Range.
        await rangeDialog
            .getByRole('button', { name: 'Cancel', exact: true })
            .click();
        await expect(rangeDialog).toHaveCount(0);
    });
});
