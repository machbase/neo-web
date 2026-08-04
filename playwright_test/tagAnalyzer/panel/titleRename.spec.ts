import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer panel', () => {
    test('renames a chart', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 2. Create an empty chart.
        await page
            .getByRole('button', { name: 'New Chart', exact: true })
            .click();
        const createDialog = page.getByRole('dialog');
        await createDialog
            .getByLabel('Chart name', { exact: true })
            .fill('Rename smoke');
        await createDialog
            .getByRole('button', { name: 'Apply', exact: true })
            .click();

        // 3. Rename the chart.
        await page
            .getByRole('button', { name: 'Rename smoke', exact: true })
            .click();
        const titleInput = page.getByLabel('Chart title', { exact: true });
        await titleInput.fill('Renamed chart');
        await titleInput.press('Enter');

        // 4. Check the new title.
        await expect(
            page.getByRole('button', {
                name: 'Renamed chart',
                exact: true,
            }),
        ).toBeVisible();
        await expect(titleInput).toHaveCount(0);
    });
});
