import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer FFT', () => {
    test('opens FFT from a selected range', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.4] Open an existing TagAnalyzer board.
        await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
        await expect(
            page.getByRole('button', {
                name: 'TAG ANALYZER.taz',
                exact: true,
            }),
        ).toBeVisible();

        // 3. [1.4.4.4.1] Enable range selection.
        const loadedPanel = page.locator(
            '.panel-form:has(button[title="Set current visible main chart range"]:enabled)',
        );
        await expect(loadedPanel).toHaveCount(1);
        await loadedPanel.scrollIntoViewIfNeeded();
        const selectRange = loadedPanel.getByRole('button', {
            name: 'Select data range',
            exact: true,
        });
        await selectRange.click();
        await expect(selectRange).toHaveClass(/button--active/);

        // 4. [1.4.4.4.3, 1.4.4.4.4] Select chart data and open its summary.
        const chart = loadedPanel.locator('.chart-body');
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
        await expect(
            page.getByText('Selection Summary', { exact: true }),
        ).toBeVisible();

        // 5. [1.4.4.5.1] Open FFT.
        await page
            .getByRole('button', { name: 'Open FFT chart', exact: true })
            .click();
        const fftDialog = page.getByRole('dialog');
        await expect(fftDialog.getByText('FFT', { exact: true })).toBeVisible();
        await expect(
            fftDialog.getByRole('button', {
                name: 'Show 2D FFT chart',
                exact: true,
            }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(
            fftDialog.getByLabel('Min Hz', { exact: true }),
        ).toHaveValue('0');
        await expect(
            fftDialog.getByLabel('Max Hz', { exact: true }),
        ).toHaveValue('0');

        // 6. [1.4.4.5.2] Close FFT.
        await fftDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await expect(fftDialog).toHaveCount(0);
    });
});
