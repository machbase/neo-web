import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';

type FftSelectionOptions = {
    axisKind?: 'numeric' | 'time';
    raw?: boolean;
};

async function createFftSelection(
    page: Page,
    options: FftSelectionOptions = {},
): Promise<Locator> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board, {
        axisKind: options.axisKind ?? 'time',
    });

    await panel.scrollIntoViewIfNeeded();
    if (options.raw ?? true) {
        const rawData = panel.getByTestId('action-toggle-raw');
        await rawData.click();
        await expect(rawData).toHaveAttribute('aria-pressed', 'true');
        await expect(panel.getByTestId('chart')).toHaveAttribute(
            'aria-busy',
            'false',
            { timeout: 30_000 },
        );
    }

    const selectRange = panel.getByTestId('action-toggle-drag-select');
    await selectRange.click();
    await expect(selectRange).toHaveAttribute('aria-pressed', 'true');

    const chart = panel.getByTestId('chart');
    await chart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const chartBox = await chart.boundingBox();
    if (!chartBox) throw new Error('Tag Analyzer chart is not visible.');

    const selectionY = chartBox.y + 110;
    await page.mouse.move(chartBox.x + chartBox.width * 0.2, selectionY);
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
    return selectionSummary;
}

async function openFft(selectionSummary: Locator): Promise<Locator> {
    const openFft = selectionSummary.getByTestId(
        'tag-analyzer-selection-open-fft',
    );
    await expect(openFft).toBeEnabled();
    await openFft.click();

    const fftDialog = selectionSummary.page().getByTestId(
        'tag-analyzer-fft-dialog',
    );
    await expect(fftDialog).toBeVisible();
    await expect(
        fftDialog.getByTestId('tag-analyzer-fft-chart'),
    ).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });
    return fftDialog;
}

async function expectFftUnavailable(
    selectionSummary: Locator,
    reason: string,
): Promise<void> {
    const openFft = selectionSummary.getByTestId(
        'tag-analyzer-selection-open-fft',
    );
    await expect(openFft).toBeDisabled();
    await expect(selectionSummary.getByTitle(reason)).toHaveCount(1);
}

test.describe('Tag Analyzer FFT', () => {
    test('renders the default 2D FFT and closes it', async ({ page }) => {
        const selectionSummary = await createFftSelection(page);
        const fftDialog = await openFft(selectionSummary);

        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-chart').locator('canvas'),
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

        await fftDialog.getByTestId('tag-analyzer-fft-close').click();
        await expect(fftDialog).toHaveCount(0);
    });

    test('applies a valid 2D frequency range', async ({ page }) => {
        const fftDialog = await openFft(await createFftSelection(page));
        const chart = fftDialog.getByTestId('tag-analyzer-fft-chart');

        await fftDialog.getByLabel('Min Hz', { exact: true }).fill('0');
        await fftDialog.getByLabel('Max Hz', { exact: true }).fill('10');
        await fftDialog
            .getByRole('button', { name: 'Apply values', exact: true })
            .click();

        await expect(chart).toHaveAttribute('aria-busy', 'false', {
            timeout: 30_000,
        });
        await expect(chart.locator('canvas').first()).toBeVisible();
        await expect(
            fftDialog.getByLabel('Max Hz', { exact: true }),
        ).toHaveValue('10');
    });

    test('renders 3D FFT and applies its interval unit', async ({ page }) => {
        const fftDialog = await openFft(await createFftSelection(page));
        const chart = fftDialog.getByTestId('tag-analyzer-fft-chart');
        const show3d = fftDialog.getByRole('button', {
            name: 'Show 3D FFT chart',
            exact: true,
        });

        await show3d.click();
        await expect(show3d).toHaveAttribute('aria-pressed', 'true');
        await expect(chart).toHaveAttribute('aria-busy', 'false', {
            timeout: 30_000,
        });

        await fftDialog.getByLabel('Interval', { exact: true }).fill('1');
        await fftDialog
            .getByRole('button', { name: 'ms', exact: true })
            .click();
        await page.getByRole('option', { name: 's', exact: true }).click();
        await fftDialog
            .getByRole('button', { name: 'Apply values', exact: true })
            .click();

        await expect(chart).toHaveAttribute('aria-busy', 'false', {
            timeout: 30_000,
        });
        await expect(chart.locator('canvas').first()).toBeVisible();
        await expect(
            fftDialog.getByRole('button', { name: 's', exact: true }),
        ).toBeVisible();
    });

    test('disables FFT outside raw mode', async ({ page }) => {
        const selectionSummary = await createFftSelection(page, {
            raw: false,
        });

        await expectFftUnavailable(
            selectionSummary,
            'FFT is only allowed during raw mode',
        );
        await expect(
            page.getByTestId('tag-analyzer-fft-dialog'),
        ).toHaveCount(0);
    });

    test('disables FFT for a numeric x-axis panel', async ({ page }) => {
        const selectionSummary = await createFftSelection(page, {
            axisKind: 'numeric',
        });

        await expectFftUnavailable(
            selectionSummary,
            'Numeric cannot be used to generate FFT.',
        );
        await expect(
            page.getByTestId('tag-analyzer-fft-dialog'),
        ).toHaveCount(0);
    });

    test('rejects a negative frequency', async ({ page }) => {
        const fftDialog = await openFft(await createFftSelection(page));

        await fftDialog.getByLabel('Min Hz', { exact: true }).fill('-1');
        await fftDialog
            .getByRole('button', { name: 'Apply values', exact: true })
            .click();

        await expect(
            page.getByText(
                'FFT frequencies must be finite, non-negative numbers.',
                { exact: true },
            ),
        ).toBeVisible();
        await expect(fftDialog).toBeVisible();
    });

    test('rejects a minimum frequency above the maximum', async ({
        page,
    }) => {
        const fftDialog = await openFft(await createFftSelection(page));

        await fftDialog.getByLabel('Min Hz', { exact: true }).fill('11');
        await fftDialog.getByLabel('Max Hz', { exact: true }).fill('10');
        await fftDialog
            .getByRole('button', { name: 'Apply values', exact: true })
            .click();

        await expect(
            page.getByText('Min Hz cannot be greater than Max Hz.', {
                exact: true,
            }),
        ).toBeVisible();
        await expect(fftDialog).toBeVisible();
    });

    test('rejects a non-positive 3D interval', async ({ page }) => {
        const fftDialog = await openFft(await createFftSelection(page));
        const show3d = fftDialog.getByRole('button', {
            name: 'Show 3D FFT chart',
            exact: true,
        });
        await show3d.click();
        await expect(show3d).toHaveAttribute('aria-pressed', 'true');
        await expect(
            fftDialog.getByTestId('tag-analyzer-fft-chart'),
        ).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });

        await fftDialog.getByLabel('Interval', { exact: true }).fill('0');
        await fftDialog
            .getByRole('button', { name: 'Apply values', exact: true })
            .click();

        await expect(
            page.getByText('FFT interval must be a positive number.', {
                exact: true,
            }),
        ).toBeVisible();
        await expect(fftDialog).toBeVisible();
    });
});
