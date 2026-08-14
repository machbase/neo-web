import {
    expect,
    test,
    type Locator,
    type Page,
} from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';

const TIME_TABLE = 'TAG';
const NUMERIC_TABLE = 'DISTANCE_SENSOR';
const SECOND_TIME_TAG = 'barn';

test.describe('Tag Analyzer panel editor Data tab', () => {
    test.describe.configure({ timeout: 120_000 });

    test('shows the source tag for the current series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const row = getSeriesRow(editor, 'use', TIME_TABLE);

        await expect(row.getByTitle('use (TAG)')).toHaveText('use');
    });

    test('does not repeat the source table under the series name', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const row = getSeriesRow(editor, 'use', TIME_TABLE);

        await expect(row).toBeVisible();
        await expect(
            row.getByText(TIME_TABLE, {
                exact: true,
            }),
        ).toHaveCount(0);
    });

    test('shows the calculation mode for the current series', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);

        await expect(
            getSeriesRow(editor, 'use', TIME_TABLE).getByRole('button', {
                name: 'AVG',
                exact: true,
            }),
        ).toBeVisible();
    });

    test('shows the alias for the current series', async ({ page }) => {
        const { editor } = await openDataEditor(page);

        await expect(
            getSeriesRow(editor, 'use', TIME_TABLE).getByLabel('Alias'),
        ).toHaveValue('use / VALUE (TAG)');
    });

    test('shows the color for the current series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const colorButton = getSeriesColorButton(
            getSeriesRow(editor, 'use', TIME_TABLE),
        );

        await expect(colorButton.locator('[style*="background-color"]')).toHaveCount(
            1,
        );
    });

    test('applies an edited series alias', async ({ page }) => {
        const { editor, panel } = await openDataEditor(page);
        const alias = 'Applied data alias';

        await getSeriesRow(editor, 'use', TIME_TABLE)
            .getByLabel('Alias')
            .fill(alias);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenDataEditor(panel);

        await expect(
            getSeriesRow(editor, 'use', TIME_TABLE).getByLabel('Alias'),
        ).toHaveValue(alias);
    });

    test('applies an edited series calculation mode', async ({ page }) => {
        const { editor, panel } = await openDataEditor(page);
        const row = getSeriesRow(editor, 'use', TIME_TABLE);

        await row.getByRole('button', { name: 'AVG', exact: true }).click();
        await page.getByRole('option', { name: 'SUM', exact: true }).click();
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenDataEditor(panel);

        await expect(
            getSeriesRow(editor, 'use', TIME_TABLE).getByRole('button', {
                name: 'SUM',
                exact: true,
            }),
        ).toBeVisible();
    });

    test('preserves a custom alias when calculation mode changes', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const row = getSeriesRow(editor, 'use', TIME_TABLE);
        const alias = 'Custom alias';

        await row.getByLabel('Alias').fill(alias);
        await row.getByRole('button', { name: 'AVG', exact: true }).click();
        await page.getByRole('option', { name: 'MAX', exact: true }).click();

        await expect(row.getByLabel('Alias')).toHaveValue(alias);
    });

    test('applies an edited series color', async ({ page }) => {
        const { editor, panel } = await openDataEditor(page);
        const selectedColor = '#F44E3B';

        await getSeriesColorButton(
            getSeriesRow(editor, 'use', TIME_TABLE),
        ).click();
        await page.locator(`[title="${selectedColor}"]`).click();
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenDataEditor(panel);

        await expect
            .poll(() =>
                getSeriesColor(
                    getSeriesColorButton(
                        getSeriesRow(editor, 'use', TIME_TABLE),
                    ),
                ),
            )
            .toBe('rgb(244, 78, 59)');
    });

    test('does not offer inline removal for the only series', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const row = getSeriesRow(editor, 'use', TIME_TABLE);

        await expect(getSeriesRemoveButton(row)).toHaveCount(0);
    });

    test('opens Edit Series with the current selection', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await expect(
            dialog.getByTitle(/Tag: use\nTable: TAG/),
        ).toBeVisible();
    });

    test('discards dialog changes when Cancel is clicked', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        let dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await addTag(page, dialog, SECOND_TIME_TAG);
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        dialog = await openSeriesDialog(page, editor);

        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText('1 / 12');
    });

    test('discards dialog changes when the modal close button is clicked', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        let dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await addTag(page, dialog, SECOND_TIME_TAG);
        await dialog.getByRole('button', { name: 'Close modal' }).click();
        dialog = await openSeriesDialog(page, editor);

        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText('1 / 12');
    });

    test('loads available source tables', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);
        const table = dialog.getByLabel('Table', { exact: true });

        await table.fill(TIME_TABLE);

        await expect(
            page.getByRole('option', { name: TIME_TABLE, exact: true }),
        ).toBeVisible();
    });

    test('loads the default time column after selecting a table', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);

        await expect(dialog.getByLabel('Time', { exact: true })).toHaveValue(
            'TIME (DateTime)',
        );
    });

    test('loads the default value column after selecting a table', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);

        await expect(
            dialog.getByLabel('Value', { exact: true }),
        ).toHaveValue(/VALUE/);
    });

    test('searches tags from the Search button', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await dialog.getByTestId('tag-analyzer-series-search-input').fill('use');
        await dialog.getByTestId('tag-analyzer-series-search-button').click();

        await expect(
            dialog.getByTestId('tag-analyzer-series-option-use'),
        ).toBeVisible();
    });

    test('searches tags by pressing Enter', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await dialog
            .getByTestId('tag-analyzer-series-search-input')
            .fill('wine_cellar');
        await dialog.getByTestId('tag-analyzer-series-search-input').press('Enter');

        await expect(
            dialog.getByTestId('tag-analyzer-series-option-wine_cellar'),
        ).toBeVisible();
    });

    test('loads the selected tag-result page', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await expect(dialog.getByText('/ 2', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Next page' }).click();

        await expect(
            dialog.getByTestId('tag-analyzer-series-option-use'),
        ).toBeVisible();
    });

    test('resets tag pagination when a new search starts', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await expect(dialog.getByText('/ 2', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Next page' }).click();
        await dialog.getByTestId('tag-analyzer-series-search-input').fill('use');
        await dialog.getByTestId('tag-analyzer-series-search-button').click();

        await expect(dialog.getByLabel('Current page number')).toHaveValue('1');
    });

    test('requires a time field before adding a series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        await mockSeriesSource(page, 'PW_MISSING_TIME', [
            ['NAME', 5, 0],
            ['VALUE', 20, 0],
        ]);
        const dialog = await openSeriesDialog(page, editor);

        await expect(
            dialog.getByTestId('tag-analyzer-series-option-PW_TAG'),
        ).toBeVisible();
        await dialog.getByTestId('tag-analyzer-series-option-PW_TAG').click();

        await expect(dialog.getByRole('status')).toHaveText(
            'Select a time field.',
        );
    });

    test('requires a value field before adding a series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        await mockSeriesSource(page, 'PW_MISSING_VALUE', [
            ['NAME', 5, 0],
            ['TIME', 6, 0],
        ]);
        const dialog = await openSeriesDialog(page, editor);

        await expect(
            dialog.getByTestId('tag-analyzer-series-option-PW_TAG'),
        ).toBeVisible();
        await dialog.getByTestId('tag-analyzer-series-option-PW_TAG').click();

        await expect(dialog.getByRole('status')).toHaveText(
            'Select a value field.',
        );
    });

    test('requires a JSON key before adding a JSON series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        await mockSeriesSource(page, 'PW_JSON', [
            ['NAME', 5, 0],
            ['TIME', 6, 0],
            ['PAYLOAD', 61, 0],
        ]);
        const dialog = await openSeriesDialog(page, editor);

        await expect(dialog.getByLabel('JSON key')).toBeVisible();
        await dialog.getByTestId('tag-analyzer-series-option-PW_TAG').click();

        await expect(dialog.getByRole('status')).toHaveText(
            'Select a JSON key.',
        );
    });

    test('limits a panel to twelve series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await fillSeriesSelectionToLimit(page, dialog);
        await dialog
            .getByTestId('tag-analyzer-series-option-living_room')
            .click();

        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText('12 / 12');
    });

    test('shows a warning when the series limit is exceeded', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await fillSeriesSelectionToLimit(page, dialog);
        await dialog
            .getByTestId('tag-analyzer-series-option-living_room')
            .click();

        await expect(dialog.getByRole('status')).toHaveText(
            'The maximum number of tags in a chart is 12.',
        );
    });

    test('does not add a duplicate source series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await addTag(page, dialog, 'use');

        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText('1 / 12');
    });

    test('keeps dialog Apply changes in the outer editor draft', async ({
        page,
    }) => {
        const { editor, panel } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await addTag(page, dialog, SECOND_TIME_TAG);
        await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
        await editor.getByTestId('editor-close').click();
        await reopenDataEditor(panel);

        await expect(editor.getByTitle('barn (TAG)')).toHaveCount(0);
    });

    test('applies a newly added series', async ({ page }) => {
        const { editor, panel } = await openDataEditor(page);

        await addSeriesToEditor(page, editor, SECOND_TIME_TAG);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenDataEditor(panel);

        await expect(editor.getByTitle('barn (TAG)')).toBeVisible();
    });

    test('marks Data invalid when every series is cleared', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await dialog.getByRole('button', { name: 'Clear all' }).click();
        await dialog.getByRole('button', { name: 'Apply', exact: true }).click();

        await expect(editor.getByTestId('editor-tab-data')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    test('blocks main Apply when every series is cleared', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await dialog.getByRole('button', { name: 'Clear all' }).click();
        await dialog.getByRole('button', { name: 'Apply', exact: true }).click();

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('shows a warning when an established panel changes x-axis type', async ({
        page,
    }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await dialog.getByRole('button', { name: 'Clear all' }).click();
        await selectTable(page, dialog, NUMERIC_TABLE);
        await addTag(page, dialog, 'SENSOR_01');

        await expect(dialog.getByRole('status')).toHaveText(
            'The panel x-axis type cannot be changed.',
        );
    });

    test('does not add an incompatible x-axis series', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await dialog.getByRole('button', { name: 'Clear all' }).click();
        await selectTable(page, dialog, NUMERIC_TABLE);
        await addTag(page, dialog, 'SENSOR_01');

        await expect(
            dialog.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText('0 / 12');
    });

    test('applies removal of a series', async ({ page }) => {
        const { editor, panel } = await openDataEditor(page);
        await addSeriesToEditor(page, editor, SECOND_TIME_TAG);
        await editor.getByTestId('editor-apply').click();
        const barnRow = getSeriesRow(editor, SECOND_TIME_TAG, TIME_TABLE);

        await getSeriesRemoveButton(barnRow).click();
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenDataEditor(panel);

        await expect(editor.getByTitle('barn (TAG)')).toHaveCount(0);
    });

    test('shows a table-metadata error in the series dialog', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        await page.route('**/web/api/tables', async (route) => {
            await route.fulfill({
                status: 500,
                json: {
                    success: false,
                    reason: 'Table metadata unavailable.',
                },
            });
        });
        const dialog = await openSeriesDialog(page, editor);

        await expect(dialog.getByRole('status')).toHaveText(
            'Table metadata unavailable.',
        );
    });

    test('shows a tag-search error in the series dialog', async ({ page }) => {
        const { editor } = await openDataEditor(page);
        const dialog = await openSeriesDialog(page, editor);

        await selectTable(page, dialog, TIME_TABLE);
        await page.route('**/web/api/query?*', async (route) => {
            const sql = getSqlFromRequest(route.request().url());
            if (sql.includes('_TAG_META') && sql.includes(' LIKE ')) {
                await route.fulfill({
                    json: {
                        success: false,
                        reason: 'Tag search unavailable.',
                    },
                });
                return;
            }
            await route.continue();
        });
        await dialog.getByTestId('tag-analyzer-series-search-input').fill('use');
        await dialog.getByTestId('tag-analyzer-series-search-button').click();

        await expect(dialog.getByRole('status')).toHaveText(
            'Tag search unavailable.',
        );
    });

    test('persists an applied series alias in a saved board', async ({ page }) => {
        test.setTimeout(180_000);
        const runId = Date.now();
        const fileName = `pw-editor-data-${runId}.taz`;
        const alias = `Saved data alias ${runId}`;
        const { board, editor } = await openDataEditor(page);

        try {
            await getSeriesRow(editor, 'use', TIME_TABLE)
                .getByLabel('Alias')
                .fill(alias);
            await editor.getByTestId('editor-apply').click();
            await board.getByTestId('save-as-button').click();
            const saveDialog = page.getByTestId('tag-analyzer-save-as-dialog');
            await saveDialog
                .getByTestId('tag-analyzer-save-as-file-name-input')
                .fill(fileName);
            await saveDialog
                .getByTestId('tag-analyzer-save-as-submit-button')
                .click();
            await expect(
                page.getByTestId('tag-analyzer-save-success-toast'),
            ).toHaveText('TAZ file saved successfully.', { timeout: 15_000 });

            await page.reload();
            const savedFile = page.getByTestId(
                getFileTreeItemTestId('/', fileName),
            );
            await expect(savedFile).toBeVisible({ timeout: 20_000 });
            await savedFile.click();
            const reopenedPanel = board.getByTestId(/^panel-/);
            await expect(reopenedPanel).toHaveCount(1, { timeout: 30_000 });
            await expect(
                reopenedPanel.getByTestId('main-range-button'),
            ).toBeEnabled({ timeout: 30_000 });
            await reopenedPanel.getByTestId('action-toggle-edit').click();
            const reopenedEditor = reopenedPanel.getByTestId('editor');
            await reopenedEditor.getByTestId('editor-tab-data').click();

            await expect(
                getSeriesRow(reopenedEditor, 'use', TIME_TABLE).getByLabel(
                    'Alias',
                ),
            ).toHaveValue(alias);
        } finally {
            await deleteSavedBoard(page, fileName);
        }
    });
});

async function openDataEditor(page: Page): Promise<{
    board: Locator;
    panel: Locator;
    editor: Locator;
}> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board);
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    await editor.getByTestId('editor-tab-data').click();
    return { board, panel, editor };
}

async function reopenDataEditor(panel: Locator): Promise<void> {
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    await editor.getByTestId('editor-tab-data').click();
}

async function closeAndReopenDataEditor(panel: Locator): Promise<void> {
    await panel.getByTestId('editor-close').click();
    await reopenDataEditor(panel);
}

async function openSeriesDialog(
    page: Page,
    editor: Locator,
): Promise<Locator> {
    await editor
        .getByRole('button', { name: 'Click to add a new series' })
        .click();
    const dialog = page.getByTestId('editor-series-dialog');
    await expect(dialog).toBeVisible();
    return dialog;
}

function getSeriesRow(
    editor: Locator,
    sourceTag: string,
    table: string,
): Locator {
    return editor.getByRole('group', {
        name: `${sourceTag} (${table}) series`,
        exact: true,
    });
}

function getSeriesColorButton(row: Locator): Locator {
    return row
        .getByText('Color', { exact: true })
        .locator('..')
        .getByRole('button');
}

function getSeriesRemoveButton(row: Locator): Locator {
    return row.locator('button[class*="editorSeriesRemoveButton"]');
}

async function getSeriesColor(colorButton: Locator): Promise<string> {
    return colorButton
        .locator('[style*="background-color"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor);
}

async function selectTable(
    page: Page,
    dialog: Locator,
    tableName: string,
): Promise<void> {
    const table = dialog.getByLabel('Table', { exact: true });
    await table.fill(tableName);
    await page
        .getByRole('option', { name: tableName, exact: true })
        .click();
    await expect(table).toHaveValue(tableName);
    await expect(dialog.getByLabel('Time', { exact: true })).toHaveValue(/.+/);
    await expect(dialog.getByLabel('Value', { exact: true })).toHaveValue(/.+/);
}

async function addTag(
    page: Page,
    dialog: Locator,
    tagName: string,
): Promise<void> {
    await dialog.getByTestId('tag-analyzer-series-search-input').fill(tagName);
    await dialog.getByTestId('tag-analyzer-series-search-button').click();
    const option = dialog.getByTestId(
        `tag-analyzer-series-option-${encodeURIComponent(tagName)}`,
    );
    await expect(option).toBeVisible();
    await option.click();
}

async function fillSeriesSelectionToLimit(
    page: Page,
    dialog: Locator,
): Promise<void> {
    await selectTable(page, dialog, TIME_TABLE);
    await expect(dialog.getByText('/ 2', { exact: true })).toBeVisible();
    for (const tag of [
        'barn',
        'dew_point',
        'dishwasher',
        'fridge',
        'furnace',
        'garage_door',
        'gen',
        'home_office',
        'house_overall',
        'humidity',
    ]) {
        await dialog
            .getByTestId(`tag-analyzer-series-option-${tag}`)
            .click();
    }
    await dialog.getByRole('button', { name: 'Next page' }).click();
    await dialog.getByTestId('tag-analyzer-series-option-kitchen').click();
}

async function addSeriesToEditor(
    page: Page,
    editor: Locator,
    tagName: string,
): Promise<void> {
    const dialog = await openSeriesDialog(page, editor);
    await selectTable(page, dialog, TIME_TABLE);
    await addTag(page, dialog, tagName);
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(dialog).toHaveCount(0);
}

async function mockSeriesSource(
    page: Page,
    tableName: string,
    columns: Array<[name: string, type: number, flag: number]>,
): Promise<void> {
    await page.route('**/web/api/tables', async (route) => {
        await route.fulfill({
            json: {
                success: true,
                data: {
                    columns: ['DB', 'USER', 'NAME', 'ID', 'TYPE'],
                    rows: [
                        ['MACHBASEDB', 'SYS', tableName, 1, 'Tag Table'],
                    ],
                },
            },
        });
    });
    await page.route('**/web/api/query?*', async (route) => {
        const sql = getSqlFromRequest(route.request().url());
        if (sql.includes('M$SYS_TABLES') && sql.includes(tableName)) {
            await fulfillQuery(route, columns);
            return;
        }
        if (sql.includes(`_${tableName}_META`)) {
            await fulfillQuery(
                route,
                sql.includes('COUNT(*)') ? [[1]] : [['PW_TAG']],
            );
            return;
        }
        if (sql.includes(`from ${tableName}`) && sql.includes('PAYLOAD')) {
            await fulfillQuery(route, [['{"value": 1}']]);
            return;
        }
        await route.continue();
    });
}

async function fulfillQuery(
    route: Parameters<Parameters<Page['route']>[1]>[0],
    rows: unknown[],
): Promise<void> {
    await route.fulfill({
        json: {
            success: true,
            data: { columns: [], rows },
        },
    });
}

function getSqlFromRequest(requestUrl: string): string {
    return new URL(requestUrl).searchParams.get('q') ?? '';
}

async function deleteSavedBoard(page: Page, fileName: string): Promise<void> {
    const status = await page.evaluate(async (name) => {
        const headers: Record<string, string> = {};
        const accessToken = localStorage.getItem('accessToken');
        const consoleId = localStorage.getItem('consoleId');
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        if (consoleId) headers['X-Console-Id'] = consoleId;

        const response = await fetch(
            `/web/api/files/${encodeURIComponent(name)}`,
            { method: 'DELETE', headers },
        );
        return response.status;
    }, fileName);

    expect([200, 204, 404]).toContain(status);
}
