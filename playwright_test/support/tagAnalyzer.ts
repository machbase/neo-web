import { expect, type Locator, type Page } from '@playwright/test';

type CreateLoadedPanelOptions = {
    axisKind?: 'numeric' | 'time';
    title?: string;
};

const PANEL_SOURCE = {
    numeric: {
        table: 'DISTANCE_SENSOR',
        search: 'SENSOR_01',
        tag: 'SENSOR_01',
    },
    time: {
        table: 'MACHROLL',
        search: 'pneumatic',
        tag: 'pneumatic',
    },
} as const;

export async function createTagAnalyzerBoard(page: Page): Promise<Locator> {
    await page.getByTestId('new-board-taz').click();

    const board = page.getByTestId('tag-analyzer-board');
    await expect(board).toBeVisible();
    return board;
}

export async function createLoadedTagAnalyzerPanel(
    page: Page,
    board: Locator,
    options: CreateLoadedPanelOptions = {},
): Promise<Locator> {
    const panels = board.getByTestId(/^panel-/);
    const panelCount = await panels.count();
    const panelTitle = options.title ?? 'New chart';
    const source = PANEL_SOURCE[options.axisKind ?? 'time'];

    await board.getByTestId('create-panel-button').click();
    const dialog = page.getByTestId('tag-analyzer-create-panel-dialog');
    await expect(dialog).toBeVisible();

    if (options.title !== undefined) {
        await dialog
            .getByTestId('tag-analyzer-create-panel-name-input')
            .fill(options.title);
    }

    const sourceTable = dialog.getByLabel('Table', { exact: true });
    await sourceTable.fill(source.table);
    await page
        .getByRole('option', { name: source.table, exact: true })
        .click();
    await expect(sourceTable).toHaveValue(source.table);

    await dialog
        .getByTestId('tag-analyzer-series-search-input')
        .fill(source.search);
    await dialog
        .getByTestId('tag-analyzer-series-search-button')
        .click();
    await dialog
        .getByTestId(
            `tag-analyzer-series-option-${encodeURIComponent(source.tag)}`,
        )
        .click();

    await dialog
        .getByTestId('tag-analyzer-create-panel-apply-button')
        .click();
    await expect(dialog).toHaveCount(0);
    await expect(panels).toHaveCount(panelCount + 1);

    const panel = await getCreatedPanel(page, board, panels, panelTitle);
    await expect(panel.getByTestId('main-range-button')).toBeEnabled({
        timeout: 30_000,
    });
    return panel;
}

export async function createEmptyTagAnalyzerPanel(
    page: Page,
    board: Locator,
    title: string,
): Promise<Locator> {
    const panels = board.getByTestId(/^panel-/);
    const panelCount = await panels.count();

    await board.getByTestId('create-panel-button').click();
    const dialog = page.getByTestId('tag-analyzer-create-panel-dialog');
    await dialog
        .getByTestId('tag-analyzer-create-panel-name-input')
        .fill(title);
    await dialog
        .getByTestId('tag-analyzer-create-panel-apply-button')
        .click();
    await expect(dialog).toHaveCount(0);
    await expect(panels).toHaveCount(panelCount + 1);

    return getCreatedPanel(page, board, panels, title);
}

async function getCreatedPanel(
    page: Page,
    board: Locator,
    panels: Locator,
    title: string,
): Promise<Locator> {
    const createdPanel = panels.filter({
        has: page
            .getByTestId('title-button')
            .filter({ hasText: title }),
    });
    await expect(createdPanel).toHaveCount(1);
    const panelTestId = await createdPanel.getAttribute('data-testid');
    if (!panelTestId) throw new Error('Created panel has no stable test ID.');

    return board.getByTestId(panelTestId);
}
