import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer panel', () => {
    test('renames a chart', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByTestId('new-board-taz').click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Create an empty chart.
        await board.getByTestId('create-panel-button').click();
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
        const panel = board.getByTestId(/^panel-/);
        await expect(panel).toHaveCount(1);
        await panel.getByTestId('title-button').click();
        const titleInput = panel.getByTestId('title-input');
        await titleInput.fill('Renamed chart');
        await titleInput.press('Enter');

        // 4. Check the new title.
        const titleButton = panel.getByTestId('title-button');
        await expect(titleButton).toBeVisible();
        await expect(titleButton).toHaveText('Renamed chart');
        await expect(titleInput).toHaveCount(0);
    });
});
