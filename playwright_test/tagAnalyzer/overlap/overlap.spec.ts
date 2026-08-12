import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createEmptyTagAnalyzerPanel,
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';

type AxisKind = 'numeric' | 'time';

type OverlapSetup = {
    chart: Locator;
    dialog: Locator;
    panels: Locator[];
    rows: Locator;
    surface: Locator;
};

test.describe('Tag Analyzer overlap', () => {
    test('opens one numeric panel', async ({ page }) => {
        const overlap = await openOverlap(page, 'numeric', 1);

        await expect(overlap.rows).toHaveCount(1);
        await closeOverlap(overlap.dialog);
    });

    test('opens one time panel', async ({ page }) => {
        const overlap = await openOverlap(page, 'time', 1);

        await expect(overlap.rows).toHaveCount(1);
        await closeOverlap(overlap.dialog);
    });

    test('opens multiple numeric panels', async ({ page }) => {
        const overlap = await openOverlap(page, 'numeric', 2);

        await expect(overlap.rows).toHaveCount(2);
        await expect(overlap.rows).toContainText([
            'Numeric overlap 1',
            'Numeric overlap 2',
        ]);
        await closeOverlap(overlap.dialog);
    });

    test('opens multiple time panels', async ({ page }) => {
        const overlap = await openOverlap(page, 'time', 2);

        await expect(overlap.rows).toHaveCount(2);
        await expect(overlap.rows).toContainText([
            'Time overlap 1',
            'Time overlap 2',
        ]);
        await closeOverlap(overlap.dialog);
    });

    test('pans the numeric chart by dragging', async ({ page }) => {
        const overlap = await openOverlap(page, 'numeric', 1);

        await zoomChart(page, overlap, 'in');
        await panChart(page, overlap);
        await closeOverlap(overlap.dialog);
    });

    test('pans the time chart by dragging', async ({ page }) => {
        const overlap = await openOverlap(page, 'time', 1);

        await zoomChart(page, overlap, 'in');
        await panChart(page, overlap);
        await closeOverlap(overlap.dialog);
    });

    test('zooms the numeric chart in and out', async ({ page }) => {
        const overlap = await openOverlap(page, 'numeric', 1);

        await zoomChart(page, overlap, 'in');
        await zoomChart(page, overlap, 'out');
        await closeOverlap(overlap.dialog);
    });

    test('zooms the time chart in and out', async ({ page }) => {
        const overlap = await openOverlap(page, 'time', 1);

        await zoomChart(page, overlap, 'in');
        await zoomChart(page, overlap, 'out');
        await closeOverlap(overlap.dialog);
    });

    test('shifts a time range and closes the overlap chart', async ({ page }) => {
        const overlap = await openOverlap(page, 'time', 1);
        const row = await getPanelRow(overlap.dialog, overlap.panels[0]);
        const alteredRange = row.getByTestId('altered-range');
        const originalAlteredRange = await alteredRange.textContent();

        await row.getByTestId('shift-amount').fill('60');
        await row.getByTestId('shift-right').click();
        await expect(alteredRange).not.toHaveText(originalAlteredRange ?? '');

        await row.getByTestId('shift-left').click();
        await expect(alteredRange).toHaveText(originalAlteredRange ?? '');

        await closeOverlap(overlap.dialog);
    });

    test('rejects a time panel when a numeric panel is selected', async ({ page }) => {
        const { board, firstPanel, secondPanel } = await createMixedAxisBoard(
            page,
            'numeric',
        );

        await assertMixedSelectionRejected(page, board, firstPanel, secondPanel);
    });

    test('rejects a numeric panel when a time panel is selected', async ({ page }) => {
        const { board, firstPanel, secondPanel } = await createMixedAxisBoard(
            page,
            'time',
        );

        await assertMixedSelectionRejected(page, board, firstPanel, secondPanel);
    });

    test('rejects a panel without a loaded chart range', async ({ page }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const panel = await createEmptyTagAnalyzerPanel(
            page,
            board,
            'Empty overlap panel',
        );
        const toggle = panel.getByTestId('overlap-toggle');

        await toggle.click();

        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(
            page.getByText('Overlap requires a loaded chart range.', {
                exact: true,
            }),
        ).toBeVisible();
        await expect(board.getByTestId('overlap-button')).toBeDisabled();
        await expect(
            page.getByTestId('tag-analyzer-overlap-dialog'),
        ).toHaveCount(0);
    });

    test('disables opening after the last panel is deselected', async ({ page }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const panel = await createLoadedTagAnalyzerPanel(page, board, {
            axisKind: 'time',
            title: 'Overlap deselection',
        });
        const toggle = panel.getByTestId('overlap-toggle');
        const openButton = board.getByTestId('overlap-button');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await expect(openButton).toBeEnabled();

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(openButton).toBeDisabled();
    });
});

async function createMixedAxisBoard(
    page: Page,
    firstAxisKind: AxisKind,
): Promise<{
    board: Locator;
    firstPanel: Locator;
    secondPanel: Locator;
}> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const secondAxisKind = firstAxisKind === 'numeric' ? 'time' : 'numeric';
    const firstPanel = await createLoadedTagAnalyzerPanel(page, board, {
        axisKind: firstAxisKind,
        title: `Selected ${firstAxisKind} panel`,
    });
    const secondPanel = await createLoadedTagAnalyzerPanel(page, board, {
        axisKind: secondAxisKind,
        title: `Rejected ${secondAxisKind} panel`,
    });

    return { board, firstPanel, secondPanel };
}

async function assertMixedSelectionRejected(
    page: Page,
    board: Locator,
    firstPanel: Locator,
    secondPanel: Locator,
): Promise<void> {
    const firstToggle = firstPanel.getByTestId('overlap-toggle');
    const secondToggle = secondPanel.getByTestId('overlap-toggle');

    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute('aria-pressed', 'true');

    await secondToggle.click();
    await expect(secondToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(firstToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(
        page.getByText(
            'Overlap can only compare panels with the same x-axis type.',
            { exact: true },
        ),
    ).toBeVisible();

    const openButton = board.getByTestId('overlap-button');
    await expect(openButton).toBeEnabled();
    await openButton.click();
    const dialog = page.getByTestId('tag-analyzer-overlap-dialog');
    await expect(
        dialog.getByTestId(/^tag-analyzer-overlap-panel-/),
    ).toHaveCount(1);
    await closeOverlap(dialog);
}

async function openOverlap(
    page: Page,
    axisKind: AxisKind,
    panelCount: number,
): Promise<OverlapSetup> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panels: Locator[] = [];

    for (let index = 0; index < panelCount; index += 1) {
        const panel = await createLoadedTagAnalyzerPanel(page, board, {
            axisKind,
            title: `${axisKind === 'numeric' ? 'Numeric' : 'Time'} overlap ${index + 1}`,
        });
        const toggle = panel.getByTestId('overlap-toggle');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        panels.push(panel);
    }

    const openButton = board.getByTestId('overlap-button');
    await expect(openButton).toBeEnabled();
    await openButton.click();

    const dialog = page.getByTestId('tag-analyzer-overlap-dialog');
    const chart = dialog.getByTestId('tag-analyzer-overlap-chart');
    const surface = chart.getByTestId('viewport-surface');
    const rows = dialog.getByTestId(/^tag-analyzer-overlap-panel-/);
    await expect(dialog).toBeVisible();
    await expect(chart).toHaveAttribute('aria-busy', 'false', {
        timeout: 30_000,
    });
    await expect(surface).toBeVisible();

    return { chart, dialog, panels, rows, surface };
}

async function closeOverlap(dialog: Locator): Promise<void> {
    await dialog.getByTestId('tag-analyzer-overlap-close').click();
    await expect(dialog).toHaveCount(0);
}

async function getPanelRow(
    dialog: Locator,
    panel: Locator,
): Promise<Locator> {
    const panelTestId = await panel.getAttribute('data-testid');
    if (!panelTestId) throw new Error('Panel has no stable test ID.');

    return dialog.getByTestId(`tag-analyzer-overlap-${panelTestId}`);
}

async function zoomChart(
    page: Page,
    overlap: OverlapSetup,
    direction: 'in' | 'out',
): Promise<void> {
    const canvas = overlap.surface.locator('canvas');
    const before = await readCanvas(canvas);
    const box = await overlap.surface.boundingBox();
    if (!box) throw new Error('Overlap chart surface is not visible.');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, direction === 'in' ? -600 : 600);

    await expect.poll(() => readCanvas(canvas)).not.toBe(before);
}

async function panChart(page: Page, overlap: OverlapSetup): Promise<void> {
    const canvas = overlap.surface.locator('canvas');
    const before = await readCanvas(canvas);
    const box = await overlap.surface.boundingBox();
    if (!box) throw new Error('Overlap chart surface is not visible.');

    const y = box.y + box.height * 0.6;
    await page.mouse.move(box.x + box.width * 0.65, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.35, y, { steps: 12 });
    await page.mouse.up();

    await expect.poll(() => readCanvas(canvas)).not.toBe(before);
}

async function readCanvas(canvas: Locator): Promise<string> {
    return canvas.evaluate((element) =>
        (element as HTMLCanvasElement).toDataURL(),
    );
}
