import {
    expect,
    type Locator,
    type Page,
    type Response,
} from '@playwright/test';

type CreateLoadedPanelOptions = {
    axisKind?: 'numeric' | 'time';
    tags?: readonly string[];
    title?: string;
};

export const TAG_ANALYZER_FIXTURE_SOURCE = {
    numeric: {
        table: 'DISTANCE_SENSOR',
        tag: 'SENSOR_01',
    },
    time: {
        table: 'TAG',
        tag: 'use',
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
    const source = TAG_ANALYZER_FIXTURE_SOURCE[options.axisKind ?? 'time'];

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
    await expect(dialog.getByLabel('Time', { exact: true })).not.toHaveValue('');
    await expect(dialog.getByLabel('Value', { exact: true })).not.toHaveValue('');

    for (const [index, tag] of (options.tags ?? [source.tag]).entries()) {
        await dialog
            .getByTestId('tag-analyzer-series-search-input')
            .fill(tag);
        const tagSearch = waitForTagSearch(page, source.table, tag);
        await dialog
            .getByTestId('tag-analyzer-series-search-button')
            .click();
        await tagSearch;
        const tagOption = dialog.getByTestId(
            `tag-analyzer-series-option-${encodeURIComponent(tag)}`,
        );
        await expect(tagOption).toBeVisible();
        await tagOption.click();
        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText(`${index + 1} /`);
    }

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

function waitForTagSearch(
    page: Page,
    table: string,
    searchText?: string,
): Promise<void> {
    const waits = ['ORDER BY', 'COUNT(*)'].map((queryMarker) =>
        page.waitForResponse((response) =>
            isTagSearchResponse(
                response,
                table,
                searchText,
                queryMarker,
            ),
        ),
    );
    return Promise.all(waits).then(() => undefined);
}

function isTagSearchResponse(
    response: Response,
    table: string,
    searchText: string | undefined,
    queryMarker: string,
): boolean {
    const requestUrl = new URL(response.url());
    const sql = requestUrl.searchParams.get('q') ?? '';
    const escapedSearchText = searchText?.replaceAll("'", "''");
    const matchesSearch = escapedSearchText === undefined
        ? !sql.includes(' LIKE ')
        : sql.includes(`%${escapedSearchText}%`);
    return response.ok() &&
        requestUrl.pathname.endsWith('/api/query') &&
        sql.toUpperCase().includes(`_${table.toUpperCase()}_META`) &&
        sql.includes(queryMarker) &&
        matchesSearch;
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
