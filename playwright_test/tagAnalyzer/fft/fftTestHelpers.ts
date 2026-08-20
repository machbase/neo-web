import {
    expect,
    type Locator,
    type Page,
    type Request,
} from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';

const FFT_LOAD_TIMEOUT_MS = 30_000;

type FftSelectionOptions = {
    axisKind?: 'numeric' | 'time';
    mainRange?: { from: string; to: string };
    raw?: boolean;
    tags?: readonly string[];
};

type EChartsOption = {
    series?: Array<{ data?: unknown; type?: string }>;
    xAxis?: Array<{ name?: string }>;
    yAxis?: Array<{ name?: string }>;
    xAxis3D?: Array<{ name?: string }>;
    yAxis3D?: Array<{ name?: string }>;
    zAxis3D?: Array<{ name?: string }>;
};

type FftRenderedChartState = {
    dataLength: number;
    hostId?: string;
    seriesType?: string;
    xAxisName?: string;
    yAxisName?: string;
    xAxis3DName?: string;
    yAxis3DName?: string;
    zAxis3DName?: string;
};

type EChartsApi = {
    getInstanceByDom?: (
        element: HTMLElement,
    ) => { getOption?: () => EChartsOption } | undefined;
};

type WindowWithECharts = Window & { echarts?: EChartsApi };

export function isFftRequest(request: Request): boolean {
    return request.method() === 'POST' &&
        new URL(request.url()).pathname === '/web/api/tql' &&
        /(?:^|\n)FFT\(/.test(request.postData() ?? '');
}

export function is3dFftRequest(request: Request): boolean {
    return isFftRequest(request) &&
        (request.postData() ?? '').includes("PUSHKEY('fft')");
}

export async function createFftSelection(
    page: Page,
    options: FftSelectionOptions = {},
): Promise<Locator> {
    const { axisKind = 'time', raw = true } = options;

    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board, {
        axisKind,
        tags: options.tags,
    });
    const sourceTable = axisKind === 'numeric' ? 'DISTANCE_SENSOR' : 'TAG';
    await panel.scrollIntoViewIfNeeded();
    const chart = panel.getByTestId('chart');
    await waitForPanelChartData(chart);
    if (options.mainRange) {
        const rangeButton = panel.getByTestId('main-range-button');
        const previousRangeText = await rangeButton.textContent();
        await rangeButton.click();
        const rangeDialog = page.getByTestId('tag-analyzer-range-dialog');
        await rangeDialog
            .getByTestId('tag-analyzer-range-from-input')
            .fill(options.mainRange.from);
        await rangeDialog
            .getByTestId('tag-analyzer-range-to-input')
            .fill(options.mainRange.to);
        await rangeDialog
            .getByTestId('tag-analyzer-range-apply-button')
            .click();
        await expect(rangeDialog).toHaveCount(0);
        await expect.poll(
            () => rangeButton.textContent(),
            { timeout: FFT_LOAD_TIMEOUT_MS },
        ).not.toBe(previousRangeText);
        await waitForPanelChartData(chart);
    }

    if (raw) {
        const rawData = panel.getByTestId('action-toggle-raw');
        await waitForRawPanelRefresh(
            page,
            chart,
            sourceTable,
            () => rawData.click(),
        );
        await expect(rawData).toHaveAttribute('aria-pressed', 'true');
    }

    const selectRange = panel.getByTestId('action-toggle-drag-select');
    await selectRange.click();
    await expect(selectRange).toHaveAttribute('aria-pressed', 'true');

    await chart.scrollIntoViewIfNeeded();
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

async function waitForRawPanelRefresh(
    page: Page,
    chart: Locator,
    table: string,
    action: () => Promise<void>,
): Promise<void> {
    const requestPromise = page.waitForRequest(
        (request) => isRawMainSeriesRequest(request, table),
    );
    await action();
    const request = await requestPromise;
    const response = await request.response();
    if (!response?.ok()) throw new Error('Raw panel request failed.');
    await expect(chart).toHaveAttribute('aria-busy', 'false', {
        timeout: FFT_LOAD_TIMEOUT_MS,
    });
    await waitForPaint(chart);
}

function isRawMainSeriesRequest(request: Request, table: string): boolean {
    const requestUrl = new URL(request.url());
    const sql = requestUrl.searchParams.get('q') ?? '';
    return request.method() === 'GET' &&
        requestUrl.pathname.endsWith('/api/query') &&
        new RegExp(`\\b${table}\\b`, 'i').test(sql) &&
        sql.includes('SCAN_FORWARD') &&
        sql.includes('LIMIT 20001') &&
        !sql.includes('SAMPLING(');
}

async function waitForPanelChartData(chart: Locator): Promise<void> {
    await expect(chart).toHaveAttribute('aria-busy', 'false', {
        timeout: FFT_LOAD_TIMEOUT_MS,
    });
    await expect(chart.locator('canvas').first()).toBeVisible({
        timeout: FFT_LOAD_TIMEOUT_MS,
    });
    await waitForPaint(chart);
}

async function waitForPaint(locator: Locator): Promise<void> {
    await locator.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
}

function getFftDialog(page: Page): Locator {
    return page.getByTestId('tag-analyzer-fft-dialog');
}

export function getFftChart(fftDialog: Locator): Locator {
    return fftDialog.getByTestId('tag-analyzer-fft-chart');
}

export async function waitForFftIdle(fftDialog: Locator): Promise<Locator> {
    const chart = getFftChart(fftDialog);
    await expect(chart).toHaveAttribute('aria-busy', 'false', {
        timeout: FFT_LOAD_TIMEOUT_MS,
    });
    return chart;
}

export async function openFft(selectionSummary: Locator): Promise<Locator> {
    const initialRequest = selectionSummary.page().waitForRequest(
        (request) => isFftRequest(request) && !is3dFftRequest(request),
    );
    const fftDialog = await openFftWithoutWaiting(selectionSummary);
    await initialRequest;
    await waitForFftIdle(fftDialog);
    return fftDialog;
}

async function openFftWithoutWaiting(
    selectionSummary: Locator,
): Promise<Locator> {
    const openFftButton = selectionSummary.getByTestId(
        'tag-analyzer-selection-open-fft',
    );
    await expect(openFftButton).toBeEnabled();
    await openFftButton.click();

    const fftDialog = getFftDialog(selectionSummary.page());
    await expect(fftDialog).toBeVisible();
    return fftDialog;
}

export async function closeFft(fftDialog: Locator): Promise<Locator> {
    const page = fftDialog.page();
    await fftDialog.getByTestId('tag-analyzer-fft-close').click();
    await expect(fftDialog).toHaveCount(0);

    const selectionSummary = page.getByTestId(
        'tag-analyzer-selection-summary',
    );
    await expect(selectionSummary).toBeVisible();
    return selectionSummary;
}

export async function expectFftUnavailable(
    selectionSummary: Locator,
    reason: string,
): Promise<void> {
    const openFftButton = selectionSummary.getByTestId(
        'tag-analyzer-selection-open-fft',
    );
    await expect(openFftButton).toBeDisabled();
    await expect(selectionSummary.getByTitle(reason)).toHaveCount(1);
}

export async function selectFftDimension(
    fftDialog: Locator,
    dimension: '2D' | '3D',
): Promise<Locator> {
    const dimensionButton = fftDialog.getByTestId(
        `tag-analyzer-fft-${dimension.toLowerCase()}`,
    );
    await dimensionButton.click();
    await expect(dimensionButton).toHaveAttribute('aria-pressed', 'true');
    return waitForFftIdle(fftDialog);
}

async function getFftRenderedChartState(
    chart: Locator,
): Promise<FftRenderedChartState> {
    return chart.evaluate((root) => {
        const host = root.querySelector<HTMLElement>(
            '.chart_container > div:last-child',
        );
        const echarts = (window as WindowWithECharts).echarts;
        const option = host
            ? echarts?.getInstanceByDom?.(host)?.getOption?.()
            : undefined;
        const data = option?.series?.[0]?.data;
        return {
            dataLength: Array.isArray(data) ? data.length : 0,
            hostId: host?.id,
            seriesType: option?.series?.[0]?.type,
            xAxisName: option?.xAxis?.[0]?.name,
            yAxisName: option?.yAxis?.[0]?.name,
            xAxis3DName: option?.xAxis3D?.[0]?.name,
            yAxis3DName: option?.yAxis3D?.[0]?.name,
            zAxis3DName: option?.zAxis3D?.[0]?.name,
        };
    });
}

export async function expectFftRenderedChart(
    chart: Locator,
    expected: Partial<FftRenderedChartState>,
): Promise<void> {
    await expectFftChartState(chart, expected);
}

export async function getFftChartHostId(chart: Locator): Promise<string> {
    await expect.poll(
        async () => (await getFftRenderedChartState(chart)).hostId,
        { timeout: FFT_LOAD_TIMEOUT_MS },
    ).toBeTruthy();
    const hostId = (await getFftRenderedChartState(chart)).hostId;
    if (!hostId) throw new Error('FFT chart host is unavailable.');
    return hostId;
}

export async function expectFftRerenderedChart(
    chart: Locator,
    previousHostId: string,
    expected: Partial<FftRenderedChartState>,
): Promise<string> {
    await expectFftChartState(chart, expected, previousHostId);
    return getFftChartHostId(chart);
}

async function expectFftChartState(
    chart: Locator,
    expected: Partial<FftRenderedChartState>,
    previousHostId?: string,
): Promise<void> {
    await expect.poll(
        async () => {
            const state = await getFftRenderedChartState(chart);
            return state.dataLength > 0 &&
                (previousHostId === undefined || state.hostId !== previousHostId)
                ? state
                : undefined;
        },
        {
            timeout: FFT_LOAD_TIMEOUT_MS,
            message: 'FFT chart should render the expected spectrum',
        },
    ).toMatchObject(expected);
}
