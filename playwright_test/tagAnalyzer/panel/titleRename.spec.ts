import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer panel', () => {
    test('renames a chart', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByTestId('new-board-taz').click();

        // 2. Create an empty chart.
        await page.getByTestId('tag-analyzer-create-panel-button').click();
        const createDialog = page.getByTestId(
            'tag-analyzer-create-panel-dialog',
        );
        await createDialog
            .getByTestId('tag-analyzer-create-panel-name-input')
            .fill('Rename smoke');
        await createDialog
            .getByTestId('tag-analyzer-create-panel-apply-button')
            .click();

        // 3. Rename the chart.
        await page.getByTestId('tag-analyzer-panel-title-button').click();
        const titleInput = page.getByTestId('tag-analyzer-panel-title-input');
        await titleInput.fill('Renamed chart');
        await titleInput.press('Enter');

        // 4. Check the new title.
        const titleButton = page.getByTestId('tag-analyzer-panel-title-button');
        await expect(titleButton).toBeVisible();
        await expect(titleButton).toHaveText('Renamed chart');
        await expect(titleInput).toHaveCount(0);
    });
});
