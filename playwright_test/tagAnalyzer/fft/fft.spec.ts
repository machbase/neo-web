import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer FFT', () => {
    test('opens FFT from a selected range', async ({ page }) => {
        // 1. Open a saved board.
        await login(page);
        await page
            .getByTestId(
                getFileTreeItemTestId('/', 'TAG ANALYZER.taz'),
            )
            .click();
        await expect(page.getByTestId('tag-analyzer-board')).toBeVisible();

        // 2. Enable range selection.
        const loadedPanel = page.getByTestId('tag-analyzer-panel').filter({
            has: page.locator(
                '[data-testid="tag-analyzer-panel-main-range-button"]:not(:disabled)',
            ),
        });
        await expect(loadedPanel).toHaveCount(1, { timeout: 30_000 });
        await loadedPanel.scrollIntoViewIfNeeded();
        const selectRange = loadedPanel.getByTestId(
            'tag-analyzer-panel-action-toggle-drag-select',
        );
        await selectRange.click();
        await expect(selectRange).toHaveAttribute('aria-pressed', 'true');

        // 3. Select chart data.
        const chart = loadedPanel.getByTestId('tag-analyzer-panel-chart');
        await chart.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        const chartBox = await chart.boundingBox();
        if (!chartBox) throw new Error('FFT chart area is not visible.');
        const selectionY = chartBox.y + 110;
        await page.mouse.move(
            chartBox.x + chartBox.width * 0.2,
            selectionY,
        );
        await page.mouse.down();
        await page.mouse.move(
            chartBox.x + chartBox.width * 0.8,
            selectionY,
            { steps: 12 },
        );
        await page.mouse.up();
        const selectionSummary = page.getByTestId(
            'tag-analyzer-selection-summary',
        );
        await expect(selectionSummary).toBeVisible();

        // 4. Open FFT.
        await selectionSummary
            .getByTestId('tag-analyzer-selection-open-fft')
            .click();
        const fftDialog = page.getByTestId('tag-analyzer-fft-dialog');
        await expect(fftDialog).toBeVisible();
        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-chart'),
        ).toBeVisible();
        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-2d'),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-min-hz'),
        ).toHaveValue('0');
        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-max-hz'),
        ).toHaveValue('0');

        // 5. Close FFT.
        await fftDialog.getByTestId('tag-analyzer-fft-close').click();
        await expect(fftDialog).toHaveCount(0);
    });
});
