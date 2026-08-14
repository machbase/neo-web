import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import {
    rangeSpan,
    readMainRange,
    readNavigatorRange,
    type DisplayedRange,
} from '../../support/tagAnalyzerRange';
import { getFileTreeItemTestId } from '../../support/testIds';
import { setCheckbox } from '../../support/controls';

const DISPLAY_PRECISION_MS = 1_000;
const ONE_HOUR_MS = 60 * 60 * 1_000;
const INVALID_TIME_RANGES = [
    {
        behavior: 'an unrecognized range expression',
        start: 'not-a-range',
        end: 'last',
    },
    {
        behavior: 'a reversed range',
        start: 'last',
        end: 'first',
    },
    {
        behavior: 'an equal range',
        start: 'first',
        end: 'first',
    },
] as const;

test.describe('Tag Analyzer panel editor Main Range tab', () => {
    test.describe.configure({ timeout: 120_000 });

    test('shows the Data validation message without a compatible series', async ({
        page,
    }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const panel = await createLoadedTagAnalyzerPanel(page, board);
        await panel.getByTestId('action-toggle-edit').click();
        const editor = panel.getByTestId('editor');
        await expect(editor).toBeVisible();
        await editor.getByTestId('editor-tab-data').click();
        await editor
            .getByRole('button', { name: 'Click to add a new series' })
            .click();
        const seriesDialog = page.getByTestId('editor-series-dialog');
        await seriesDialog.getByRole('button', { name: 'Clear all' }).click();
        await seriesDialog
            .getByRole('button', { name: 'Apply', exact: true })
            .click();
        await editor.getByTestId('editor-tab-main-range').click();

        await expect(
            editor.getByText('Add at least one series.', { exact: true }),
        ).toBeVisible();
    });

    test('labels the range as Time for the TAG fixture', async ({ page }) => {
        const { editor } = await createMainRangeEditor(page, 'time');

        await expect(editor.getByText('Time', { exact: true })).toBeVisible();
    });

    test('labels the range as Numeric for the DISTANCE_SENSOR fixture', async ({
        page,
    }) => {
        const { editor } = await createMainRangeEditor(page, 'numeric');

        await expect(editor.getByText('Numeric', { exact: true })).toBeVisible();
    });

    test('blank range fields leave the current range unchanged', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const before = await readMainRange(panel);
        const { from, to } = getRangeInputs(editor);
        await expect(from).toHaveValue('');
        await expect(to).toHaveValue('');

        await editor.getByTestId('editor-tab-general').click();
        await editor
            .getByTestId('editor-title-input')
            .fill('Blank range keeps current view');
        await editor.getByTestId('editor-apply').click();

        await expectRangeClose(await readMainRange(panel), before);
    });

    test('a blank From keeps the current start while applying To', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const before = await readMainRange(panel);
        const fullRange = await readNavigatorRange(panel);

        await applyRange(editor, '', 'last');

        const applied = await readMainRange(panel);
        expect(Math.abs(applied.start - before.start)).toBeLessThanOrEqual(
            DISPLAY_PRECISION_MS,
        );
        expect(Math.abs(applied.end - fullRange.end)).toBeLessThanOrEqual(
            DISPLAY_PRECISION_MS,
        );
    });

    test('applies an absolute time range to the chart', async ({ page }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const startText = '2024-03-01 12:00:00';
        const endText = '2024-03-01 13:00:00';
        const expected = {
            start: new Date(2024, 2, 1, 12, 0, 0).getTime(),
            end: new Date(2024, 2, 1, 13, 0, 0).getTime(),
        };

        await applyRange(editor, startText, endText);

        await expectRangeClose(await readMainRange(panel), expected);
    });

    test('resolves a now offset when applying the range', async ({ page }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const beforeApply = Date.now();

        await applyRange(editor, 'now-1h', 'now');

        const applied = await readMainRange(panel);
        const afterApply = Date.now();
        expect(Math.abs(rangeSpan(applied) - ONE_HOUR_MS)).toBeLessThanOrEqual(
            DISPLAY_PRECISION_MS,
        );
        expect(applied.end).toBeGreaterThanOrEqual(
            beforeApply - DISPLAY_PRECISION_MS,
        );
        expect(applied.end).toBeLessThanOrEqual(
            afterApply + DISPLAY_PRECISION_MS,
        );
    });

    test('resolves a first offset against the TAG data range', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const fullRange = await readNavigatorRange(panel);

        await applyRange(editor, 'first', 'first+1h');

        await expectRangeClose(await readMainRange(panel), {
            start: fullRange.start,
            end: fullRange.start + ONE_HOUR_MS,
        });
    });

    test('resolves a last offset against the TAG data range', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        const fullRange = await readNavigatorRange(panel);

        await applyRange(editor, 'last-1h', 'last');

        await expectRangeClose(await readMainRange(panel), {
            start: fullRange.end - ONE_HOUR_MS,
            end: fullRange.end,
        });
    });

    test('applies numeric literals to the chart', async ({ page }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'numeric');

        await applyRange(editor, '100', '200');

        expect(await readNumericMainRange(panel)).toEqual({
            start: 100,
            end: 200,
        });
    });

    test('resolves a first offset against the numeric data range', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'numeric');

        await applyRange(editor, 'first', 'first-100');

        await expectNumericMainRange(panel, {
            start: 0,
            end: 100,
        });
    });

    test('resolves a last offset against the numeric data range', async ({
        page,
    }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'numeric');

        await applyRange(editor, 'last-100', 'last');

        await expectNumericMainRange(panel, {
            start: 999_890,
            end: 999_990,
        });
    });

    test('a time quick range writes its expressions into the inputs', async ({
        page,
    }) => {
        const { editor } = await createMainRangeEditor(page, 'time');

        await editor
            .getByRole('button', {
                name: 'Last 1 hour of data',
                exact: true,
            })
            .click();

        const { from, to } = getRangeInputs(editor);
        await expect(from).toHaveValue('last-1h');
        await expect(to).toHaveValue('last');
    });

    test('a numeric quick range writes its expressions into the inputs', async ({
        page,
    }) => {
        const { editor } = await createMainRangeEditor(page, 'numeric');

        await editor
            .getByRole('button', { name: 'First 100', exact: true })
            .click();

        const { from, to } = getRangeInputs(editor);
        await expect(from).toHaveValue('first');
        await expect(to).toHaveValue('first-100');
    });

    for (const { behavior, start, end } of INVALID_TIME_RANGES) {
        test(`rejects ${behavior}`, async ({ page }) => {
            const { editor } = await createMainRangeEditor(page, 'time');

            await setRangeInputs(editor, start, end);

            await expect(
                editor.getByText(
                    'Enter both range boundaries in a valid order.',
                    { exact: true },
                ),
            ).toBeVisible();
            await expect(editor.getByTestId('editor-apply')).toBeDisabled();
        });
    }

    test('Clear empties a configured range', async ({ page }) => {
        const { editor } = await createMainRangeEditor(page, 'time');
        await setRangeInputs(editor, 'first', 'first+1h');

        await editor.getByRole('button', { name: 'Clear', exact: true }).click();

        const { from, to } = getRangeInputs(editor);
        await expect(from).toHaveValue('');
        await expect(to).toHaveValue('');
    });

    test('Clear is disabled when the range is already empty', async ({
        page,
    }) => {
        const { editor } = await createMainRangeEditor(page, 'time');

        await expect(
            editor.getByRole('button', { name: 'Clear', exact: true }),
        ).toBeDisabled();
    });

    test('closing the editor discards an unapplied range', async ({ page }) => {
        const { panel, editor } = await createMainRangeEditor(page, 'time');
        await setRangeInputs(editor, 'first', 'first+1h');

        await editor.getByTestId('editor-close').click();
        await expect(editor).not.toBeVisible();
        await panel.getByTestId('action-toggle-edit').click();
        await expect(editor).toBeVisible();
        await editor.getByTestId('editor-tab-main-range').click();
        const reopenedEditor = editor;

        const { from, to } = getRangeInputs(reopenedEditor);
        await expect(from).toHaveValue('');
        await expect(to).toHaveValue('');
    });

    test('a changed configured range replaces the saved visible range', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-range-changed-${Date.now()}.taz`;
        let shouldCleanUp = false;

        try {
            const { board, panel, editor } = await createMainRangeEditor(
                page,
                'time',
            );
            const fullRange = await readNavigatorRange(panel);
            await enableSavedVisibleRange(editor);
            await editor.getByTestId('editor-close').click();
            await panel.getByTestId('navigator-zoom-in-large').click();
            await panel.getByTestId('navigator-zoom-in-large').click();
            const savedVisibleRange = await readMainRange(panel);
            shouldCleanUp = true;
            await saveBoardAs(page, board, fileName);

            const rangeEditor = await openMainRangeEditor(panel);
            await applyRange(rangeEditor, 'first', 'first+1h');
            const appliedRange = await readMainRange(panel);

            await expectRangeClose(appliedRange, {
                start: fullRange.start,
                end: fullRange.start + ONE_HOUR_MS,
            });
            expect(appliedRange).not.toEqual(savedVisibleRange);
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });

    test('an unchanged configured range keeps the saved visible range', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-range-unchanged-${Date.now()}.taz`;
        let shouldCleanUp = false;

        try {
            const { board, panel, editor } = await createMainRangeEditor(
                page,
                'time',
            );
            await enableSavedVisibleRange(editor);
            await editor.getByTestId('editor-close').click();
            await panel.getByTestId('navigator-zoom-in-large').click();
            await panel.getByTestId('navigator-zoom-in-large').click();
            const savedVisibleRange = await readMainRange(panel);
            shouldCleanUp = true;
            await saveBoardAs(page, board, fileName);

            const reopenedEditor = await openMainRangeEditor(panel);
            await reopenedEditor.getByTestId('editor-tab-general').click();
            await reopenedEditor
                .getByTestId('editor-title-input')
                .fill('Unchanged configured range');
            await reopenedEditor.getByTestId('editor-apply').click();

            await expectRangeClose(
                await readMainRange(panel),
                savedVisibleRange,
            );
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });

    test('the applied configured range persists after reopening the saved board', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-main-range-${Date.now()}.taz`;
        let shouldCleanUp = false;

        try {
            const { board, editor } = await createMainRangeEditor(page, 'time');
            await applyRange(editor, 'first', 'first+1h');
            shouldCleanUp = true;
            await saveBoardAs(page, board, fileName);

            const reopenedPanel = await reopenSavedPanel(page, fileName);
            const reopenedEditor = await openMainRangeEditor(reopenedPanel);
            const { from, to } = getRangeInputs(reopenedEditor);

            await expect(from).toHaveValue('first');
            await expect(to).toHaveValue('first+1h');
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });
});

async function createMainRangeEditor(
    page: Page,
    axisKind: 'time' | 'numeric',
): Promise<{ board: Locator; panel: Locator; editor: Locator }> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board, { axisKind });
    await expect(panel.getByTestId('chart')).toHaveAttribute(
        'aria-busy',
        'false',
        { timeout: 30_000 },
    );
    const editor = await openMainRangeEditor(panel);
    return { board, panel, editor };
}

async function openMainRangeEditor(panel: Locator): Promise<Locator> {
    const editor = panel.getByTestId('editor');
    if (!(await editor.isVisible())) {
        await panel.getByTestId('action-toggle-edit').click();
    }
    await expect(editor).toBeVisible();
    await editor.getByTestId('editor-tab-main-range').click();
    return editor;
}

function getRangeInputs(editor: Locator): {
    from: Locator;
    to: Locator;
} {
    return {
        from: editor.getByLabel('From', { exact: true }),
        to: editor.getByLabel('To', { exact: true }),
    };
}

async function setRangeInputs(
    editor: Locator,
    start: string,
    end: string,
): Promise<void> {
    const { from, to } = getRangeInputs(editor);
    await from.fill(start);
    await to.fill(end);
}

async function applyRange(
    editor: Locator,
    start: string,
    end: string,
): Promise<void> {
    await setRangeInputs(editor, start, end);
    await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    await editor.getByTestId('editor-apply').click();
    await expect(editor.getByTestId('editor-status')).toContainText(
        'Changes applied to this session.',
    );
}

async function enableSavedVisibleRange(editor: Locator): Promise<void> {
    await editor.getByTestId('editor-tab-general').click();
    await setCheckbox(
        editor.getByTestId('editor-save-visible-range-checkbox'),
        true,
    );
    await editor.getByTestId('editor-apply').click();
}

async function expectRangeClose(
    actual: DisplayedRange,
    expected: DisplayedRange,
): Promise<void> {
    expect(Math.abs(actual.start - expected.start)).toBeLessThanOrEqual(
        DISPLAY_PRECISION_MS,
    );
    expect(Math.abs(actual.end - expected.end)).toBeLessThanOrEqual(
        DISPLAY_PRECISION_MS,
    );
}

async function expectNumericMainRange(
    panel: Locator,
    expected: DisplayedRange,
): Promise<void> {
    await expect
        .poll(() => readNumericMainRange(panel), { timeout: 30_000 })
        .toEqual(expected);
}

async function readNumericMainRange(
    panel: Locator,
): Promise<DisplayedRange> {
    const text = await panel.getByTestId('main-range-button').innerText();
    const [start, end] = text.trim().split(' ~ ');
    if (!start || !end) throw new Error(`Unexpected numeric range: ${text}`);
    return {
        start: parseCompactNumber(start),
        end: parseCompactNumber(end),
    };
}

function parseCompactNumber(value: string): number {
    const text = value.trim().replaceAll(',', '');
    const match = /^(-?\d+(?:\.\d+)?)([KMBT])?$/.exec(text);
    if (!match) throw new Error(`Unexpected numeric range value: ${value}`);
    const multiplier = {
        K: 1_000,
        M: 1_000_000,
        B: 1_000_000_000,
        T: 1_000_000_000_000,
    }[match[2] as 'K' | 'M' | 'B' | 'T'] ?? 1;
    return Number(match[1]) * multiplier;
}

async function saveBoardAs(
    page: Page,
    board: Locator,
    fileName: string,
): Promise<void> {
    await board.getByTestId('save-as-button').click();
    const dialog = page.getByTestId('tag-analyzer-save-as-dialog');
    await dialog
        .getByTestId('tag-analyzer-save-as-file-name-input')
        .fill(fileName);
    await dialog.getByTestId('tag-analyzer-save-as-submit-button').click();
    await expect(page.getByTestId('tag-analyzer-save-success-toast')).toHaveText(
        'TAZ file saved successfully.',
        { timeout: 15_000 },
    );
    await expect(dialog).toHaveCount(0);
}

async function reopenSavedPanel(
    page: Page,
    fileName: string,
): Promise<Locator> {
    await page.reload();
    const savedFile = page.getByTestId(getFileTreeItemTestId('/', fileName));
    await expect(savedFile).toBeVisible({ timeout: 20_000 });
    await savedFile.click();
    const panel = page
        .getByTestId('tag-analyzer-board')
        .getByTestId(/^panel-/);
    await expect(panel).toHaveCount(1, { timeout: 30_000 });
    await expect(panel.getByTestId('main-range-button')).toBeEnabled({
        timeout: 30_000,
    });
    return panel;
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
