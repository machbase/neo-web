import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import {
    createMachrollPanel,
    openNewTagAnalyzerBoard,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer FFT', () => {
    test('opens FFT from a selected range', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create a pneumatic MACHROLL chart.
        await openNewTagAnalyzerBoard(page);
        const loadedPanel = await createMachrollPanel(
            page,
            'FFT pneumatic chart',
        );

        // 3. [1.4.4.4.1] Enable range selection.
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

        // 5. [1.4.4.5.1, 1.4.4.5.4] Open FFT and wait for its chart.
        const fftResponsePromise = page.waitForResponse((response) => {
            const request = response.request();
            return request.method() === 'POST' &&
                new URL(response.url()).pathname === '/web/api/tql' &&
                request.postData()?.includes('FFT(') === true;
        });
        await page
            .getByRole('button', { name: 'Open FFT chart', exact: true })
            .click();
        const fftResponse = await fftResponsePromise;
        expect(fftResponse.ok()).toBe(true);

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
        await expect(
            fftDialog.locator('.chart_container canvas'),
        ).toBeVisible({ timeout: 30_000 });

        // 6. [1.4.4.5.2] Close FFT.
        await fftDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await expect(fftDialog).toHaveCount(0);
    });
});
