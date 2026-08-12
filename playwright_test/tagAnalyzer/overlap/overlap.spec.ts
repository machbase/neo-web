import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import {
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer overlap', () => {
    test('opens the overlap chart', async ({ page }) => {
        // 1. Create a fresh board with its own data-backed panel.
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const loadedPanel = await createLoadedTagAnalyzerPanel(page, board);

        // 2. Select the fresh panel.
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
