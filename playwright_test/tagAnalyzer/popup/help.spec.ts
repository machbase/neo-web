import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);

        await page
            .getByTestId(
                getFileTreeItemTestId('/', 'TAG ANALYZER.taz'),
            )
            .click();
        await expect(page.getByTestId('tag-analyzer-board')).toBeVisible();
    });

    test.describe('Help popup', () => {
        test('opens from Tag Analyzer', async ({ page }) => {
            await page.getByTestId('tag-analyzer-help-button').click();

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
