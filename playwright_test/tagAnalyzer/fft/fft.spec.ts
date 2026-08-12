import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import {
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer FFT', () => {
    test('opens FFT from a selected range', async ({ page }) => {
        // 1. Create a fresh board with its own data-backed panel.
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const loadedPanel = await createLoadedTagAnalyzerPanel(page, board);

        // 2. Enable raw data and range selection.
        await loadedPanel.scrollIntoViewIfNeeded();
        const rawData = loadedPanel.getByTestId('action-toggle-raw');
        await rawData.click();
        await expect(rawData).toHaveAttribute('aria-pressed', 'true');
        await expect(loadedPanel.getByTestId('chart')).toHaveAttribute(
            'aria-busy',
            'false',
            { timeout: 30_000 },
        );
        const selectRange = loadedPanel.getByTestId(
            'action-toggle-drag-select',
        );
        await selectRange.click();
        await expect(selectRange).toHaveAttribute('aria-pressed', 'true');

        // 3. Select chart data.
        const chart = loadedPanel.getByTestId('chart');
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
