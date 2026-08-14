import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';
import { setCheckbox } from '../../support/controls';

test.describe('Tag Analyzer panel editor Axes tab', () => {
    test.describe.configure({ timeout: 120_000 });

    test('applies the X-axis tick-mark setting', async ({ page }) => {
        const { panel, editor } = await openAxesEditor(page);
        const xTicks = section(editor, 'X axis').getByLabel(
            'Show X-axis tick marks',
        );

        await setCheckbox(xTicks, false);
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const reopenedEditor = await openEditor(panel, 'axes');

        await expect(
            section(reopenedEditor, 'X axis').getByLabel(
                'Show X-axis tick marks',
            ),
        ).not.toBeChecked();
    });

    test('changes the left zero base without changing its tick marks', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Start the Y-axis at zero'), true);

        await expect(left.getByLabel('Start the Y-axis at zero')).toBeChecked();
        await expect(left.getByLabel('Show Y-axis tick marks')).toBeChecked();
    });

    test('changes the left tick marks without changing its zero base', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Show Y-axis tick marks'), false);

        await expect(left.getByLabel('Show Y-axis tick marks')).not.toBeChecked();
        await expect(left.getByLabel('Start the Y-axis at zero')).not.toBeChecked();
    });

    test('uses automatic scaling when both custom-scale values are blank', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const [minimum, maximum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await expect(minimum).toHaveValue('');
        await expect(maximum).toHaveValue('');
        await expect(minimum).toHaveAttribute('placeholder', 'Auto');
        await expect(maximum).toHaveAttribute('placeholder', 'Auto');
        await expect(
            section(editor, 'Left Y axis').getByText(
                'Minimum must be less than maximum.',
            ),
        ).toHaveCount(0);
    });

    test('accepts an increasing custom scale', async ({ page }) => {
        const { panel, editor } = await openAxesEditor(page);
        const [minimum, maximum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await minimum.fill('10');
        await maximum.fill('20');
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const reopenedEditor = await openEditor(panel, 'axes');
        const [savedMinimum, savedMaximum] = rangeInputs(
            reopenedEditor,
            'Left Y axis',
            'calculated',
        );

        await expect(savedMinimum).toHaveValue('10');
        await expect(savedMaximum).toHaveValue('20');
    });

    test('rejects a partially blank custom scale', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const [minimum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await minimum.fill('10');

        await expect(
            section(editor, 'Left Y axis').getByText(
                'Minimum must be less than maximum.',
            ),
        ).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('rejects equal custom-scale boundaries', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const [minimum, maximum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await minimum.fill('10');
        await maximum.fill('10');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('rejects reversed custom-scale boundaries', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const [minimum, maximum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await minimum.fill('20');
        await maximum.fill('10');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('accepts an increasing raw-data custom scale', async ({ page }) => {
        const { panel, editor } = await openAxesEditor(page);
        const [minimum, maximum] = rangeInputs(editor, 'Left Y axis', 'raw');

        await minimum.fill('-25');
        await maximum.fill('25');
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const reopenedEditor = await openEditor(panel, 'axes');
        const [savedMinimum, savedMaximum] = rangeInputs(
            reopenedEditor,
            'Left Y axis',
            'raw',
        );

        await expect(savedMinimum).toHaveValue('-25');
        await expect(savedMaximum).toHaveValue('25');
    });

    test('rejects a partially blank raw-data custom scale', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const [, maximum] = rangeInputs(editor, 'Left Y axis', 'raw');

        await maximum.fill('25');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('accepts a finite lower control limit', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Use LCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'lower').fill('5');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts a finite upper control limit', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Use UCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'upper').fill('50');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts a negative control limit', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Use LCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'lower').fill('-5');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('rejects a blank enabled control limit', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');

        await setCheckbox(left.getByLabel('Use LCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'lower').fill('');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('ignores a blank control limit after that limit is disabled', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');
        const useLcl = left.getByLabel('Use LCL');

        await setCheckbox(useLcl, true);
        await thresholdInput(editor, 'Left Y axis', 'lower').fill('');
        await setCheckbox(useLcl, false);

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('hides right-axis settings while the right axis is disabled', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');

        await expect(right).toContainText(
            'Enable the right Y axis to configure it.',
        );
        await expect(right.getByLabel('Start the Y-axis at zero')).toHaveCount(0);
    });

    test('reveals right-axis settings when the right axis is enabled', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');

        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await expect(right.getByLabel('Start the Y-axis at zero')).toBeVisible();
        await expect(right.getByLabel('Show Y-axis tick marks')).toBeVisible();
    });

    test('changes the right zero base without changing its tick marks', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await setCheckbox(right.getByLabel('Start the Y-axis at zero'), false);

        await expect(right.getByLabel('Start the Y-axis at zero')).not.toBeChecked();
        await expect(right.getByLabel('Show Y-axis tick marks')).toBeChecked();
    });

    test('changes the right tick marks without changing its zero base', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await setCheckbox(right.getByLabel('Show Y-axis tick marks'), false);

        await expect(right.getByLabel('Show Y-axis tick marks')).not.toBeChecked();
        await expect(right.getByLabel('Start the Y-axis at zero')).toBeChecked();
    });

    test('accepts an increasing custom scale on the right axis', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await fillRange(editor, 'Right Y axis', 'calculated', '10', '20');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('validates a custom scale on the enabled right axis', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);
        const [minimum, maximum] = rangeInputs(
            editor,
            'Right Y axis',
            'calculated',
        );

        await minimum.fill('20');
        await maximum.fill('10');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('ignores dormant invalid values when the right axis is disabled', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        const enableRight = right.getByLabel('Enable right Y-axis');

        await setCheckbox(enableRight, true);
        await setCheckbox(right.getByLabel('Use UCL'), true);
        await thresholdInput(editor, 'Right Y axis', 'upper').fill('');
        await setCheckbox(enableRight, false);

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts a finite control limit on the right axis', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await setCheckbox(right.getByLabel('Use UCL'), true);
        await thresholdInput(editor, 'Right Y axis', 'upper').fill('50');

        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('marks the Axes tab when an axis value is invalid', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const [minimum] = rangeInputs(editor, 'Left Y axis', 'calculated');

        await minimum.fill('10');

        await expect(editor.getByTestId('editor-tab-axes')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    test('copies every left-axis setting to the right axis', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const left = section(editor, 'Left Y axis');
        const right = section(editor, 'Right Y axis');
        await setCheckbox(left.getByLabel('Start the Y-axis at zero'), true);
        await setCheckbox(left.getByLabel('Show Y-axis tick marks'), false);
        await fillRange(editor, 'Left Y axis', 'calculated', '10', '20');
        await fillRange(editor, 'Left Y axis', 'raw', '-10', '30');
        await setCheckbox(left.getByLabel('Use LCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'lower').fill('-5');
        await setCheckbox(left.getByLabel('Use UCL'), true);
        await thresholdInput(editor, 'Left Y axis', 'upper').fill('25');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);

        await right.getByRole('button', { name: 'Copy left Y-axis settings' }).click();

        await expect(right.getByLabel('Start the Y-axis at zero')).toBeChecked();
        await expect(right.getByLabel('Show Y-axis tick marks')).not.toBeChecked();
        await expectRange(editor, 'Right Y axis', 'calculated', '10', '20');
        await expectRange(editor, 'Right Y axis', 'raw', '-10', '30');
        await expect(right.getByLabel('Use LCL')).toBeChecked();
        await expect(thresholdInput(editor, 'Right Y axis', 'lower')).toHaveValue('-5');
        await expect(right.getByLabel('Use UCL')).toBeChecked();
        await expect(thresholdInput(editor, 'Right Y axis', 'upper')).toHaveValue('25');
    });

    test('assigns a series to the right axis', async ({ page }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);
        const seriesName = await assignFirstSeriesToRight(page, right);

        await expect(assignedSeriesItem(right, seriesName)).toBeVisible();
    });

    test('moves a right-axis series back to the left axis when clicked', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);
        const seriesName = await assignFirstSeriesToRight(page, right);

        await assignedSeriesItem(right, seriesName).click();
        await expect(assignedSeriesItem(right, seriesName)).toHaveCount(0);
        await rightAxisSeriesDropdown(right).click();

        await expect(
            rightAxisSeriesOption(page, seriesName),
        ).toBeVisible();
    });

    test('moves right-axis series back to the left when the axis is disabled', async ({
        page,
    }) => {
        const { editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        const enableRight = right.getByLabel('Enable right Y-axis');
        await setCheckbox(enableRight, true);
        const seriesName = await assignFirstSeriesToRight(page, right);

        await setCheckbox(enableRight, false);
        await setCheckbox(enableRight, true);
        await rightAxisSeriesDropdown(right).click();

        await expect(rightAxisSeriesOption(page, seriesName)).toBeVisible();
    });

    test('keeps a series on the left after right-axis removal is applied', async ({
        page,
    }) => {
        const { panel, editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        const enableRight = right.getByLabel('Enable right Y-axis');
        await setCheckbox(enableRight, true);
        const seriesName = await assignFirstSeriesToRight(page, right);
        await editor.getByTestId('editor-apply').click();
        await setCheckbox(enableRight, false);
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const reopenedEditor = await openEditor(panel, 'axes');
        const reopenedRight = section(reopenedEditor, 'Right Y axis');

        await setCheckbox(
            reopenedRight.getByLabel('Enable right Y-axis'),
            true,
        );
        await rightAxisSeriesDropdown(reopenedRight).click();

        await expect(
            rightAxisSeriesOption(page, seriesName),
        ).toBeVisible();
    });

    test('retains an applied right-axis series assignment in the editor', async ({
        page,
    }) => {
        const { panel, editor } = await openAxesEditor(page);
        const right = section(editor, 'Right Y axis');
        await setCheckbox(right.getByLabel('Enable right Y-axis'), true);
        const seriesName = await assignFirstSeriesToRight(page, right);
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const reopenedEditor = await openEditor(panel, 'axes');
        const reopenedRight = section(reopenedEditor, 'Right Y axis');

        await expect(reopenedRight.getByLabel('Enable right Y-axis')).toBeChecked();
        await expect(assignedSeriesItem(reopenedRight, seriesName)).toBeVisible();
    });

    test('persists an applied custom scale after saving and reopening the board', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-axes-${Date.now()}.taz`;
        const { board, editor } = await openAxesEditor(page);

        try {
            await fillRange(editor, 'Left Y axis', 'calculated', '10', '20');
            await editor.getByTestId('editor-apply').click();
            const reopenedPanel = await saveAndReopen(page, board, fileName);
            const reopenedEditor = await openEditor(reopenedPanel, 'axes');

            await expectRange(
                reopenedEditor,
                'Left Y axis',
                'calculated',
                '10',
                '20',
            );
        } finally {
            await deleteSavedBoard(page, fileName);
        }
    });
});

async function openAxesEditor(
    page: Page,
): Promise<{ board: Locator; panel: Locator; editor: Locator }> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board);
    const editor = await openEditor(panel, 'axes');
    return { board, panel, editor };
}

async function openEditor(panel: Locator, tab: string): Promise<Locator> {
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    await editor.getByTestId(`editor-tab-${tab}`).click();
    return editor;
}

function section(editor: Locator, title: string): Locator {
    return editor
        .getByRole('heading', { name: title, exact: true })
        .locator('xpath=ancestor::section');
}

function rangeInputs(
    editor: Locator,
    axis: 'Left Y axis' | 'Right Y axis',
    range: 'calculated' | 'raw',
): [Locator, Locator] {
    const inputs = section(editor, axis).locator('input[type="number"]');
    const offset = range === 'calculated' ? 0 : 2;
    return [inputs.nth(offset), inputs.nth(offset + 1)];
}

function thresholdInput(
    editor: Locator,
    axis: 'Left Y axis' | 'Right Y axis',
    threshold: 'lower' | 'upper',
): Locator {
    return section(editor, axis)
        .locator('input[type="number"]')
        .nth(threshold === 'lower' ? 4 : 5);
}

async function fillRange(
    editor: Locator,
    axis: 'Left Y axis' | 'Right Y axis',
    range: 'calculated' | 'raw',
    minimum: string,
    maximum: string,
): Promise<void> {
    const [minimumInput, maximumInput] = rangeInputs(editor, axis, range);
    await minimumInput.fill(minimum);
    await maximumInput.fill(maximum);
}

async function expectRange(
    editor: Locator,
    axis: 'Left Y axis' | 'Right Y axis',
    range: 'calculated' | 'raw',
    minimum: string,
    maximum: string,
): Promise<void> {
    const [minimumInput, maximumInput] = rangeInputs(editor, axis, range);
    await expect(minimumInput).toHaveValue(minimum);
    await expect(maximumInput).toHaveValue(maximum);
}

async function assignFirstSeriesToRight(
    page: Page,
    rightAxis: Locator,
): Promise<string> {
    await rightAxisSeriesDropdown(rightAxis).click();
    const option = page.getByRole('listbox').getByRole('option').first();
    const seriesName = (await option.textContent())?.trim();
    if (!seriesName) throw new Error('The right-axis series option has no name.');
    await option.click();
    return seriesName;
}

function rightAxisSeriesDropdown(rightAxis: Locator): Locator {
    return rightAxis.locator('button[aria-haspopup="listbox"]');
}

function rightAxisSeriesOption(page: Page, seriesName: string): Locator {
    return page
        .getByRole('listbox')
        .getByRole('option', { name: seriesName, exact: true });
}

function assignedSeriesItem(rightAxis: Locator, seriesName: string): Locator {
    return rightAxis
        .locator('div > span')
        .filter({ hasText: exactText(seriesName) })
        .locator('..');
}

function exactText(value: string): RegExp {
    return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

async function saveAndReopen(
    page: Page,
    board: Locator,
    fileName: string,
): Promise<Locator> {
    await board.getByTestId('save-as-button').click();
    const dialog = page.getByTestId('tag-analyzer-save-as-dialog');
    await dialog
        .getByTestId('tag-analyzer-save-as-file-name-input')
        .fill(fileName);
    await dialog
        .getByTestId('tag-analyzer-save-as-submit-button')
        .click();
    await expect(page.getByTestId('tag-analyzer-save-success-toast')).toHaveText(
        'TAZ file saved successfully.',
        { timeout: 15_000 },
    );

    await page.reload();
    const savedFile = page.getByTestId(getFileTreeItemTestId('/', fileName));
    await expect(savedFile).toBeVisible({ timeout: 20_000 });
    await savedFile.click();
    const reopenedPanel = board.getByTestId(/^panel-/);
    await expect(reopenedPanel).toHaveCount(1, { timeout: 30_000 });
    await expect(reopenedPanel.getByTestId('main-range-button')).toBeEnabled({
        timeout: 30_000,
    });
    return reopenedPanel;
}

async function deleteSavedBoard(page: Page, fileName: string): Promise<void> {
    const status = await page.evaluate(async (name) => {
        const headers: Record<string, string> = {};
        const accessToken = localStorage.getItem('accessToken');
        const consoleId = localStorage.getItem('consoleId');
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        if (consoleId) headers['X-Console-Id'] = consoleId;
        const response = await fetch(`/web/api/files/${encodeURIComponent(name)}`, {
            method: 'DELETE',
            headers,
        });
        return response.status;
    }, fileName);

    expect([200, 204, 404]).toContain(status);
}
