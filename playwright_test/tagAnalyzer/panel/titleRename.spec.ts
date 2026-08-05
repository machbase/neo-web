import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer panel', () => {
    test('renames a chart', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await page.getByText('TAG ANALYZER', { exact: true }).click();

        // 3. [1.3.1.1, 1.3.1.3, 1.3.3.3] Create an empty chart.
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

        // 4. [1.4.1.3, 1.4.1.4] Rename the chart with Enter.
        await page
            .getByRole('button', { name: 'Rename smoke', exact: true })
            .click();
        const titleInput = page.getByLabel('Chart title', { exact: true });
        await titleInput.fill('Renamed chart');
        await titleInput.press('Enter');

        // 5. [1.4.1.4] Verify the committed title.
        await expect(
            page.getByRole('button', {
                name: 'Renamed chart',
                exact: true,
            }),
        ).toBeVisible();
        await expect(titleInput).toHaveCount(0);
    });
});
