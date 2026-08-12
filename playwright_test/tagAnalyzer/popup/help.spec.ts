import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { createTagAnalyzerBoard } from '../../support/tagAnalyzer';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await createTagAnalyzerBoard(page);
    });

    test.describe('Help popup', () => {
        test('opens from Tag Analyzer', async ({ page }) => {
            const board = page.getByTestId('tag-analyzer-board');
            await board.getByTestId('help-button').click();

            const popup = page.getByTestId('tag-analyzer-help-dialog');

            await expect(popup).toBeVisible();
            const boardHeaderHeading = popup.getByTestId(
                'tag-analyzer-help-board-header-heading',
            );
            await expect(boardHeaderHeading).toBeVisible();
            await expect(boardHeaderHeading).toHaveRole('heading');
            await expect(boardHeaderHeading).toHaveText('Board Header');

            const closeButton = popup.getByTestId(
                'tag-analyzer-help-close-button',
            );
            await expect(closeButton).toBeVisible();
            await expect(closeButton).toHaveRole('button');
            await expect(closeButton).toHaveAccessibleName('Close modal');
        });
    });
});
