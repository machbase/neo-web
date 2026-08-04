import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);

        await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
        await expect(
            page.getByRole('button', { name: 'TAG ANALYZER.taz', exact: true }),
        ).toBeVisible();
    });

    test.describe('Help popup', () => {
        test('opens from Tag Analyzer', async ({ page }) => {
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
