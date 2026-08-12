import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer overlap', () => {
    test('opens the overlap chart', async ({ page }) => {
        // 1. Open a saved board.
        await login(page);
        await page
            .getByTestId(
                getFileTreeItemTestId('/', 'TAG ANALYZER.taz'),
            )
            .click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Select a loaded panel.
        const loadedPanel = board
            .getByTestId(/^panel-/)
            .filter({
                has: page.locator(
                    '[data-testid="main-range-button"]:not(:disabled)',
                ),
            });
        await expect(loadedPanel).toHaveCount(1, { timeout: 30_000 });
        await loadedPanel.scrollIntoViewIfNeeded();
        const overlapToggle = loadedPanel.getByTestId('overlap-toggle');
        await overlapToggle.click();
        await expect(overlapToggle).toHaveAttribute('aria-pressed', 'true');

        // 3. Open Overlap Chart.
        const openOverlap = board.getByTestId('overlap-button');
        await expect(openOverlap).toBeEnabled();
        await openOverlap.click();

        // 4. Check and close it.
        const overlapDialog = page.getByTestId('tag-analyzer-overlap-dialog');
        await expect(overlapDialog).toBeVisible();
        await expect(
            overlapDialog.getByTestId('tag-analyzer-overlap-refresh'),
        ).toBeVisible();
        await expect(
            overlapDialog.getByTestId('tag-analyzer-overlap-chart'),
        ).toBeVisible();
        await overlapDialog.getByTestId('tag-analyzer-overlap-close').click();
        await expect(overlapDialog).toHaveCount(0);
    });
});
