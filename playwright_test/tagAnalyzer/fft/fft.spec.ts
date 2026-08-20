import { expect, test, type Page } from '@playwright/test';
import {
    closeFft,
    createFftSelection,
    expectFftRenderedChart,
    expectFftRerenderedChart,
    expectFftUnavailable,
    getFftChart,
    getFftChartHostId,
    is3dFftRequest,
    isFftRequest,
    openFft,
    selectFftDimension,
    waitForFftIdle,
} from './fftTestHelpers';

test.describe('Tag Analyzer FFT', () => {
    test.describe.configure({ timeout: 120_000 });

    test('renders the selected range as a real default 2D spectrum', async ({
        page,
    }) => {
        const selection = await createFftSelection(page);
        await expect(selection).toContainText('Name');
        await expect(selection).toContainText('Min');
        await expect(selection).toContainText('Max');
        await expect(selection).toContainText('Avg');
        await expect(selection).toContainText('use');

        const dialog = await openFft(selection);
        const chart = getFftChart(dialog);
        await expectFftRenderedChart(chart, {
            seriesType: 'line',
            xAxisName: 'Hz',
            yAxisName: 'Amplitude',
        });
        await expect(dialog.getByTestId('tag-analyzer-fft-2d')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-2d')).toHaveRole(
            'button',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-2d')).toHaveAccessibleName(
            'Show 2D FFT chart',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-3d')).toHaveAccessibleName(
            'Show 3D FFT chart',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-min-hz')).toHaveValue(
            '0',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-max-hz')).toHaveValue(
            '0',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-interval')).toHaveCount(
            0,
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-summary-min')).toHaveText(
            /-?\d+\.\d{5}/,
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-summary-max')).toHaveText(
            /-?\d+\.\d{5}/,
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-summary-avg')).toHaveText(
            /-?\d+\.\d{5}/,
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-summary-range')).toContainText(
            '~',
        );

        await closeFft(dialog);
    });

    test('applies 2D bounds and retains them when switching series', async ({
        page,
    }) => {
        const selection = await createFftSelection(page, {
            tags: ['use', 'barn'],
        });
        await expect(selection).toContainText('use');
        await expect(selection).toContainText('barn');
        const dialog = await openFft(selection);
        const chart = getFftChart(dialog);
        let chartHostId = await getFftChartHostId(chart);
        await dialog.getByTestId('tag-analyzer-fft-min-hz').fill('');
        await dialog.getByTestId('tag-analyzer-fft-max-hz').fill('');
        const blankRequest = page.waitForRequest(
            (request) => isFftRequest(request) && !is3dFftRequest(request),
        );
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const blankBody = (await blankRequest).postData() ?? '';
        expect(blankBody).toContain('\nFFT()');
        await waitForFftIdle(dialog);
        chartHostId = await expectFftRerenderedChart(
            chart,
            chartHostId,
            { seriesType: 'line' },
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-min-hz')).toHaveValue('0');
        await expect(dialog.getByTestId('tag-analyzer-fft-max-hz')).toHaveValue('0');

        await dialog.getByTestId('tag-analyzer-fft-min-hz').fill('0');
        await dialog.getByTestId('tag-analyzer-fft-max-hz').fill('10');

        const requestPromise = page.waitForRequest(
            (request) => isFftRequest(request) && !is3dFftRequest(request),
        );
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const body = (await requestPromise).postData() ?? '';

        expect(body).toContain('FFT(minHz(0), maxHz(10))');
        chartHostId = await expectFftRerenderedChart(
            chart,
            chartHostId,
            { seriesType: 'line' },
        );

        const series = dialog.getByTestId('tag-analyzer-fft-series');
        await expect(series).toContainText('use / VALUE (TAG)');
        const barnRequest = page.waitForRequest(
            (request) => {
                const requestBody = request.postData() ?? '';
                return isFftRequest(request) &&
                    requestBody.includes("IN ('barn')") &&
                    requestBody.includes('FFT(minHz(0), maxHz(10))');
            },
        );
        await series.click();
        const barnOption = page.getByTestId(
            'tag-analyzer-fft-series-option-barn',
        );
        await expect(barnOption).toHaveText('barn / VALUE (TAG)');
        await barnOption.click();
        await barnRequest;
        await expect(series).toContainText('barn / VALUE (TAG)');
        await expectFftRerenderedChart(chart, chartHostId, {
            seriesType: 'line',
        });
    });

    test('explains a short 3D window and renders a valid seconds window', async ({
        page,
    }) => {
        const dialog = await openFft(await createFftSelection(page));
        const chart = getFftChart(dialog);
        await expectFftRenderedChart(chart, { seriesType: 'line' });
        await selectFftDimension(dialog, '3D');

        await expect(dialog.getByTestId('tag-analyzer-fft-interval')).toHaveValue(
            '100',
        );
        await expect(dialog.getByTestId('tag-analyzer-fft-interval-unit')).toHaveText(
            'ms',
        );
        const warning = dialog.getByTestId('tag-analyzer-fft-warning');
        await expect(warning).toBeVisible();
        await expect(warning).toHaveRole(
            'alert',
        );
        await expect(warning).toContainText(
            'fewer than 16 samples',
        );
        await expect(chart.locator('canvas')).toHaveCount(0);

        await page.setViewportSize({ width: 700, height: 900 });
        await expect(dialog.getByTestId('tag-analyzer-fft-interval')).toBeInViewport();
        await expect(dialog.getByTestId('tag-analyzer-fft-apply')).toBeInViewport();

        await dialog.getByTestId('tag-analyzer-fft-interval').fill('100');
        await dialog.getByTestId('tag-analyzer-fft-interval-unit').click();
        for (const [unit, label] of [
            ['millisecond', 'ms'],
            ['sec', 's'],
            ['min', 'm'],
            ['hour', 'h'],
        ]) {
            const option = page.getByTestId(
                `tag-analyzer-fft-interval-unit-option-${unit}`,
            );
            await expect(option).toBeVisible();
            await expect(option).toHaveText(label);
        }
        await page.getByTestId(
            'tag-analyzer-fft-interval-unit-option-sec',
        ).click();
        const requestPromise = page.waitForRequest(is3dFftRequest);
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const body = (await requestPromise).postData() ?? '';

        expect(body).toContain("roundTime(value(0), '100000ms')");
        await waitForFftIdle(dialog);
        await expect(dialog.getByTestId('tag-analyzer-fft-warning')).toHaveCount(0);
        await expectFftRenderedChart(chart, {
            seriesType: 'bar3D',
            xAxis3DName: 'time',
            yAxis3DName: 'Hz',
            zAxis3DName: 'Amp',
        });

        const twoDimensionalRequest = page.waitForRequest(
            (request) => isFftRequest(request) && !is3dFftRequest(request),
        );
        await selectFftDimension(dialog, '2D');
        await twoDimensionalRequest;
        await expectFftRenderedChart(chart, {
            seriesType: 'line',
            xAxisName: 'Hz',
            yAxisName: 'Amplitude',
        });
    });

    test('explains when the selected range has fewer than 16 samples', async ({
        page,
    }) => {
        const selection = await createFftSelection(page, {
            mainRange: { from: 'last-5s', to: 'last' },
        });
        const dialog = await openFft(selection);
        const chart = getFftChart(dialog);
        await expect(chart.locator('canvas')).toBeVisible({ timeout: 30_000 });
        let threeDimensionalRequestCount = 0;
        await page.route('**/web/api/tql', async (route) => {
            if (is3dFftRequest(route.request())) {
                threeDimensionalRequestCount += 1;
            }
            await route.fallback();
        });

        await selectFftDimension(dialog, '3D');
        const warning = dialog.getByTestId('tag-analyzer-fft-warning');
        await expect(warning).toBeVisible();
        await expect(warning).toContainText(
            'requires at least 16 samples in the selected range',
        );
        await expect(chart.locator('canvas')).toHaveCount(0);
        await nextBrowserPaint(page);
        expect(threeDimensionalRequestCount).toBe(0);
    });

    test('disables FFT outside Raw mode with an explanation', async ({ page }) => {
        const selection = await createFftSelection(page, { raw: false });

        await expectFftUnavailable(
            selection,
            'FFT is only allowed during raw mode',
        );
        await expect(page.getByTestId('tag-analyzer-fft-dialog')).toHaveCount(0);
    });

    test('disables FFT for a numeric x-axis panel', async ({ page }) => {
        const selection = await createFftSelection(page, {
            axisKind: 'numeric',
        });

        await expectFftUnavailable(
            selection,
            'Numeric cannot be used to generate FFT.',
        );
        await expect(page.getByTestId('tag-analyzer-fft-dialog')).toHaveCount(0);
    });

    test('rejects negative and reversed frequency bounds without requesting FFT', async ({
        page,
    }) => {
        const dialog = await openFft(await createFftSelection(page));
        let fftRequestCount = 0;
        await page.route('**/web/api/tql', async (route) => {
            if (isFftRequest(route.request())) fftRequestCount += 1;
            await route.fallback();
        });

        await dialog.getByTestId('tag-analyzer-fft-min-hz').fill('-1');
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const frequencyError = page.getByTestId(
            'tag-analyzer-fft-frequency-error',
        );
        await expect(frequencyError).toBeVisible();
        await expect(frequencyError).toHaveText(
            'FFT frequencies must be finite, non-negative numbers.',
        );
        await nextBrowserPaint(page);
        expect(fftRequestCount).toBe(0);

        await dialog.getByTestId('tag-analyzer-fft-min-hz').fill('11');
        await dialog.getByTestId('tag-analyzer-fft-max-hz').fill('10');
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const frequencyRangeError = page.getByTestId(
            'tag-analyzer-fft-frequency-range-error',
        );
        await expect(frequencyRangeError).toBeVisible();
        await expect(frequencyRangeError).toHaveText(
            'Min Hz cannot be greater than Max Hz.',
        );
        await nextBrowserPaint(page);
        expect(fftRequestCount).toBe(0);
    });

    test('rejects zero and overflowing 3D window values without requesting FFT', async ({
        page,
    }) => {
        const dialog = await openFft(await createFftSelection(page));
        await selectFftDimension(dialog, '3D');
        let fftRequestCount = 0;
        await page.route('**/web/api/tql', async (route) => {
            if (isFftRequest(route.request())) fftRequestCount += 1;
            await route.fallback();
        });

        await dialog.getByTestId('tag-analyzer-fft-interval').fill('0');
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const intervalError = page.getByTestId(
            'tag-analyzer-fft-interval-error',
        );
        await expect(intervalError).toBeVisible();
        await expect(intervalError).toHaveText(
            'FFT interval must be a positive number.',
        );
        await nextBrowserPaint(page);
        expect(fftRequestCount).toBe(0);

        await dialog.getByTestId('tag-analyzer-fft-interval').fill('1e308');
        await dialog.getByTestId('tag-analyzer-fft-interval-unit').click();
        await page.getByTestId(
            'tag-analyzer-fft-interval-unit-option-hour',
        ).click();
        await dialog.getByTestId('tag-analyzer-fft-apply').click();
        const intervalRangeError = page.getByTestId(
            'tag-analyzer-fft-interval-range-error',
        );
        await expect(intervalRangeError).toBeVisible();
        await expect(intervalRangeError).toHaveText(
            'FFT interval is outside the supported range.',
        );
        await nextBrowserPaint(page);
        expect(fftRequestCount).toBe(0);
    });
});

async function nextBrowserPaint(page: Page): Promise<void> {
    await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
}
