import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';
import { setCheckbox } from '../../support/controls';

const DISPLAY_PRESETS = [
    {
        type: 'Line',
        showPoint: true,
        pointRadius: '0',
        fill: '0',
        stroke: '1',
    },
    {
        type: 'Zone',
        showPoint: false,
        pointRadius: '0',
        fill: '0.15',
        stroke: '1',
    },
    {
        type: 'Dot',
        showPoint: true,
        pointRadius: '2',
        fill: '0',
        stroke: '0',
    },
] as const;

const CUSTOM_NUMBER_FIELDS = [
    ['Point Radius', '7'],
    ['Opacity Of Fill Area', '0.6'],
    ['Line Thickness', '4'],
] as const;

test.describe('Tag Analyzer panel editor Display tab', () => {
    test.describe.configure({ timeout: 120_000 });

    for (const preset of DISPLAY_PRESETS) {
        test(`${preset.type} applies its visible chart preset`, async ({
            page,
        }) => {
            const { editor } = await createDisplayEditor(page);
            await selectChartType(
                editor,
                preset.type === 'Line' ? 'Zone' : 'Line',
            );

            await selectChartType(editor, preset.type);

            await expectChartTypeSelected(editor, preset.type);
            await expect(
                editor.getByLabel('Display data points in the line chart'),
            ).toBeChecked({ checked: preset.showPoint });
            await expect(editor.getByLabel('Point Radius')).toHaveValue(
                preset.pointRadius,
            );
            await expect(
                editor.getByLabel('Opacity Of Fill Area'),
            ).toHaveValue(preset.fill);
            await expect(editor.getByLabel('Line Thickness')).toHaveValue(
                preset.stroke,
            );
        });
    }

    test('Custom preserves the style values already shown', async ({ page }) => {
        const { editor } = await createDisplayEditor(page);
        await selectChartType(editor, 'Zone');

        await selectChartType(editor, 'Custom');

        await expectChartTypeSelected(editor, 'Custom');
        await expect(editor.getByLabel('Point Radius')).toHaveValue('0');
        await expect(editor.getByLabel('Opacity Of Fill Area')).toHaveValue(
            '0.15',
        );
        await expect(editor.getByLabel('Line Thickness')).toHaveValue('1');
    });

    test('changing point visibility selects Custom', async ({ page }) => {
        const { editor } = await createDisplayEditor(page);
        await selectChartType(editor, 'Line');

        await setCheckbox(
            editor.getByLabel('Display data points in the line chart'),
            false,
        );

        await expectChartTypeSelected(editor, 'Custom');
    });

    for (const [label, value] of CUSTOM_NUMBER_FIELDS) {
        test(`changing ${label} selects Custom`, async ({ page }) => {
            const { editor } = await createDisplayEditor(page);
            await selectChartType(editor, 'Line');

            await editor.getByLabel(label).fill(value);

            await expectChartTypeSelected(editor, 'Custom');
        });
    }

    test('changing legend visibility keeps the selected preset', async ({
        page,
    }) => {
        const { editor } = await createDisplayEditor(page);
        await selectChartType(editor, 'Line');

        await setCheckbox(editor.getByLabel('Display legend'), false);

        await expectChartTypeSelected(editor, 'Line');
    });

    test('changing gap connection keeps the selected preset', async ({
        page,
    }) => {
        const { editor } = await createDisplayEditor(page);
        await selectChartType(editor, 'Line');

        await setCheckbox(
            editor.getByLabel('Connect gaps between missing data points'),
            true,
        );

        await expectChartTypeSelected(editor, 'Line');
    });

    test('a blank optional display number remains valid', async ({ page }) => {
        const { editor } = await createDisplayEditor(page);
        const radius = editor.getByLabel('Point Radius');

        await radius.fill('3');
        await radius.fill('');

        await expect(radius).toHaveValue('');
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('a finite display number remains valid', async ({ page }) => {
        const { editor } = await createDisplayEditor(page);

        await editor.getByLabel('Line Thickness').fill('2.5');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
        await expect(editor.getByTestId('editor-tab-display')).toHaveAttribute(
            'aria-label',
            'Display',
        );
    });

    test('keeps chart configuration inputs inside the card padding', async ({
        page,
    }) => {
        const { editor } = await createDisplayEditor(page);
        const config = editor.getByTestId('editor-display-chart-config');
        const configBox = await config.boundingBox();
        if (!configBox) throw new Error('Chart Config is not visible.');

        for (const [label] of CUSTOM_NUMBER_FIELDS) {
            const inputBox = await editor
                .getByLabel(label)
                .locator('..')
                .boundingBox();
            if (!inputBox) throw new Error(`${label} is not visible.`);
            const rightPadding =
                configBox.x + configBox.width - inputBox.x - inputBox.width;
            expect(rightPadding).toBeGreaterThanOrEqual(12);
        }
    });

    test('applied display values visibly change the chart', async ({ page }) => {
        const { panel, editor } = await createDisplayEditor(page);
        const chart = panel.getByTestId('chart');
        const before = await chart.screenshot();

        await setCheckbox(
            editor.getByLabel('Display data points in the line chart'),
            true,
        );
        await editor.getByLabel('Point Radius').fill('8');
        await editor.getByLabel('Opacity Of Fill Area').fill('0.8');
        await editor.getByLabel('Line Thickness').fill('8');
        await editor.getByTestId('editor-apply').click();
        await expect(chart).toHaveAttribute('aria-busy', 'false');
        await expect
            .poll(async () => (await chart.screenshot()).equals(before))
            .toBe(false);
    });

    test('applied display settings persist after reopening the saved board', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-display-${Date.now()}.taz`;
        let shouldCleanUp = false;

        try {
            const { board, editor } = await createDisplayEditor(page);
            await editor.getByLabel('Point Radius').fill('6');
            await editor.getByLabel('Opacity Of Fill Area').fill('0.4');
            await editor.getByLabel('Line Thickness').fill('3');
            await setCheckbox(editor.getByLabel('Display legend'), false);
            await setCheckbox(
                editor.getByLabel('Connect gaps between missing data points'),
                true,
            );
            await editor.getByTestId('editor-apply').click();
            shouldCleanUp = true;
            await saveBoardAs(page, board, fileName);

            const reopenedPanel = await reopenSavedPanel(page, fileName);
            const reopenedEditor = await openEditorTab(
                reopenedPanel,
                'display',
            );

            await expectChartTypeSelected(reopenedEditor, 'Custom');
            await expect(reopenedEditor.getByLabel('Point Radius')).toHaveValue(
                '6',
            );
            await expect(
                reopenedEditor.getByLabel('Opacity Of Fill Area'),
            ).toHaveValue('0.4');
            await expect(
                reopenedEditor.getByLabel('Line Thickness'),
            ).toHaveValue('3');
            await expect(
                reopenedEditor.getByLabel('Display legend'),
            ).not.toBeChecked();
            await expect(
                reopenedEditor.getByLabel(
                    'Connect gaps between missing data points',
                ),
            ).toBeChecked();
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });
});

async function createDisplayEditor(page: Page): Promise<{
    board: Locator;
    panel: Locator;
    editor: Locator;
}> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board);
    await expect(panel.getByTestId('chart')).toHaveAttribute(
        'aria-busy',
        'false',
        { timeout: 30_000 },
    );
    const editor = await openEditorTab(panel, 'display');
    return { board, panel, editor };
}

async function openEditorTab(
    panel: Locator,
    tab: 'display',
): Promise<Locator> {
    const editor = panel.getByTestId('editor');
    if (!(await editor.isVisible())) {
        await panel.getByTestId('action-toggle-edit').click();
    }
    await expect(editor).toBeVisible();
    await editor.getByTestId(`editor-tab-${tab}`).click();
    await expect(editor.getByTestId('editor-display-preset')).toContainText(
        'Preset',
    );
    await expect(
        editor.getByTestId('editor-display-chart-config'),
    ).toContainText('Chart Config');
    return editor;
}

async function selectChartType(
    editor: Locator,
    type: 'Line' | 'Zone' | 'Dot' | 'Custom',
): Promise<void> {
    const control = type === 'Custom'
        ? editor.getByRole('button', { name: 'Custom', exact: true })
        : editor.getByAltText(`${type} Chart`, { exact: true });
    await control.click();
}

async function expectChartTypeSelected(
    editor: Locator,
    type: 'Line' | 'Zone' | 'Dot' | 'Custom',
): Promise<void> {
    const control = type === 'Custom'
        ? editor.getByRole('button', { name: 'Custom', exact: true })
        : editor.getByAltText(`${type} Chart`, { exact: true });
    await expect(control).toHaveClass(/chartTypeOptionActive/);
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
