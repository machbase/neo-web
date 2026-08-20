import { expect, test } from '@playwright/test';
import {
    closeFft,
    createFftSelection,
    expectFftRenderedChart,
    expectFftUnavailable,
    getFftChart,
    isFftRequest,
    openFft,
    waitForFftIdle,
} from './fftTestHelpers';

function deferred(): { promise: Promise<void>; resolve: () => void } {
    let resolve!: () => void;
    const promise = new Promise<void>((complete) => {
        resolve = () => complete();
    });
    return { promise, resolve };
}

test.describe('Tag Analyzer FFT lifecycle', () => {
    test.describe.configure({ timeout: 120_000 });

    test('recovers from an initial request failure with real chart data', async ({
        page,
    }) => {
        const selection = await createFftSelection(page);
        let shouldFailFft = true;
        await page.route('**/web/api/tql', async (route) => {
            if (shouldFailFft && isFftRequest(route.request())) {
                shouldFailFft = false;
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Injected FFT failure' }),
                });
                return;
            }
            await route.fallback();
        });

        const dialog = await openFft(selection);
        const chart = getFftChart(dialog);
        const loadError = page.getByTestId('tag-analyzer-fft-load-error');
        await expect(loadError).toBeVisible();
        await expect(loadError).toHaveText(
            'Failed to load FFT chart.',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-apply')).toBeEnabled();
        await expect(chart.locator('canvas')).toHaveCount(0);
        expect(shouldFailFft).toBe(false);

        const retryRequest = page.waitForRequest(isFftRequest);
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        await retryRequest;
        await waitForFftIdle(dialog);
        await expectFftRenderedChart(chart, { seriesType: 'line' });
    });

    test('locks reopening until a request that outlives the dialog finishes', async ({
        page,
    }) => {
        const selection = await createFftSelection(page);
        const pendingStarted = deferred();
        const releasePending = deferred();
        let holdNextFft = false;
        await page.route('**/web/api/tql', async (route) => {
            if (holdNextFft && isFftRequest(route.request())) {
                holdNextFft = false;
                pendingStarted.resolve();
                await releasePending.promise;
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    headers: { 'x-chart-type': 'echarts' },
                    body: JSON.stringify({
                        chartID: 'released-pending-fft',
                        jsAssets: [],
                        jsCodeAssets: [],
                        style: { width: '100%', height: '100%' },
                        theme: 'dark',
                    }),
                });
                return;
            }
            await route.fallback();
        });

        const dialog = await openFft(selection);
        holdNextFft = true;
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        await pendingStarted.promise;
        try {
            await expect(getFftChart(dialog)).toHaveAttribute('aria-busy', 'true');
            await expect(dialog.getByTestId('tag-analyzer-fft-series')).toBeDisabled();
            await expect(dialog.getByTestId('tag-analyzer-fft-2d')).toBeDisabled();
            await expect(dialog.getByTestId('tag-analyzer-fft-3d')).toBeDisabled();
            await expect(dialog.getByTestId('tag-analyzer-fft-apply')).toBeDisabled();
            await expect(dialog.getByTestId('tag-analyzer-fft-min-hz')).toBeEnabled();

            const restoredSelection = await closeFft(dialog);
            await expectFftUnavailable(
                restoredSelection,
                'Wait for the current FFT request to finish.',
            );

            releasePending.resolve();
            const openButton = restoredSelection.getByTestId(
                'tag-analyzer-selection-open-fft',
            );
            await expect(openButton).toBeEnabled({ timeout: 30_000 });

            const reopenedDialog = await openFft(restoredSelection);
            await expectFftRenderedChart(getFftChart(reopenedDialog), {
                seriesType: 'line',
            });
        } finally {
            releasePending.resolve();
        }
    });
});
