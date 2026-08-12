import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer Save As', () => {
    test('opens the Save As dialog', async ({ page }) => {
        // 1. Open Tag Analyzer.
        await login(page);
        await page.getByTestId('new-board-taz').click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Open Save As.
        await board.getByTestId('save-as-button').click();
        const saveDialog = page.getByTestId('tag-analyzer-save-as-dialog');
        const saveTitle = saveDialog.getByTestId('tag-analyzer-save-as-title');
        await expect(saveTitle).toBeVisible();
        await expect(saveTitle).toHaveText('Save As');

        // 3. Check the file name.
        await expect(
            saveDialog.getByTestId('tag-analyzer-save-as-file-name-input'),
        ).toHaveValue(/\.taz$/);

        // 4. Cancel without saving.
        await saveDialog
            .getByTestId('tag-analyzer-save-as-cancel-button')
            .click();
        await expect(saveDialog).toHaveCount(0);
    });
});
