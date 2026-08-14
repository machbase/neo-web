import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';
import { setCheckbox } from '../../support/controls';

test.describe('Tag Analyzer panel editor Data Setting tab', () => {
    test.describe.configure({ timeout: 120_000 });

    test('shows calculated main-chart prefetch as enabled', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const calculated = section(editor, 'Calculation Mode');

        await expect(
            calculated.getByText('Prefetch main chart').locator('..'),
        ).toContainText('Enabled');
    });

    test('shows raw main-chart prefetch as disabled in raw mode', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page, { raw: true });
        const rawMode = section(editor, 'Raw Mode');

        await expect(
            rawMode.getByText('Prefetch main chart').locator('..'),
        ).toContainText('Disabled');
    });

    test('accepts automatic main-chart density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points, pixels] = densityInputs(editor, 'main');

        await points.fill('');
        await pixels.fill('');

        await expect(section(editor, 'Calculation Mode')).toContainText(
            'Automatic density',
        );
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts a positive main-chart density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points, pixels] = densityInputs(editor, 'main');

        await points.fill('2');
        await pixels.fill('8');

        await expect(section(editor, 'Calculation Mode')).toContainText(
            '0.25 points/pixel',
        );
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts automatic navigator density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points, pixels] = densityInputs(editor, 'navigator');

        await points.fill('');
        await pixels.fill('');

        await expect(section(editor, 'Calculation Mode')).toContainText(
            'Automatic density',
        );
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('accepts a positive navigator density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points, pixels] = densityInputs(editor, 'navigator');

        await points.fill('3');
        await pixels.fill('12');

        await expect(section(editor, 'Calculation Mode')).toContainText(
            '0.25 points/pixel',
        );
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('rejects a zero density value', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points] = densityInputs(editor, 'main');

        await points.fill('0');

        await expect(editor.getByText('Points and pixels must be greater than 0.')).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('rejects a negative density value', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [, pixels] = densityInputs(editor, 'main');

        await pixels.fill('-1');

        await expect(editor.getByText('Points and pixels must be greater than 0.')).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('rejects a partially blank density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points] = densityInputs(editor, 'main');

        await points.fill('');

        await expect(editor.getByText('Points and pixels must be greater than 0.')).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('rejects an invalid navigator density', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const [, pixels] = densityInputs(editor, 'navigator');

        await pixels.fill('0');

        await expect(
            editor.getByText('Points and pixels must be greater than 0.'),
        ).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('configures main-chart database sampling', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');
        const sampling = samplingCheckbox(rawMode, 'main');
        const sampleCount = samplingInput(rawMode, 'main');

        await setCheckbox(sampling, true);
        await sampleCount.fill('0.125');

        await expect(sampling).toBeChecked();
        await expect(sampleCount).toHaveValue('0.125');
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('rejects an enabled main-chart sampling value of zero', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');

        await setCheckbox(
            samplingCheckbox(rawMode, 'main'),
            true,
        );
        await samplingInput(rawMode, 'main').fill('0');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('shows Average when navigator sampling is disabled', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');

        await expect(samplingCheckbox(rawMode, 'navigator')).not.toBeChecked();
        await expect(rawMode).toContainText('Average');
    });

    test('shows Sampled when navigator sampling is enabled', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');

        await setCheckbox(
            samplingCheckbox(rawMode, 'navigator'),
            true,
        );

        await expect(rawMode).toContainText('Sampled');
    });

    test('configures navigator database sampling', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');
        const sampling = samplingCheckbox(rawMode, 'navigator');
        const sampleCount = samplingInput(rawMode, 'navigator');

        await setCheckbox(sampling, true);
        await sampleCount.fill('0.25');

        await expect(sampling).toBeChecked();
        await expect(sampleCount).toHaveValue('0.25');
        await expect(editor.getByTestId('editor-apply')).toBeEnabled();
    });

    test('restores the default navigator sample count when enabling it', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');
        const sampleCount = samplingInput(rawMode, 'navigator');

        await sampleCount.fill('');
        await setCheckbox(
            samplingCheckbox(rawMode, 'navigator'),
            true,
        );

        await expect(sampleCount).toHaveValue('0.01');
    });

    test('rejects a blank enabled navigator sample count', async ({ page }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');

        await setCheckbox(
            samplingCheckbox(rawMode, 'navigator'),
            true,
        );
        await samplingInput(rawMode, 'navigator').fill('');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('marks the Data Setting tab when one of its values is invalid', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page);
        const [points] = densityInputs(editor, 'main');

        await points.fill('0');

        await expect(editor.getByTestId('editor-tab-data-setting')).toHaveAttribute(
            'aria-invalid',
            'true',
        );
    });

    test('blocks Apply while Data Setting contains an invalid value', async ({
        page,
    }) => {
        const { editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');

        await setCheckbox(
            samplingCheckbox(rawMode, 'main'),
            true,
        );
        await samplingInput(rawMode, 'main').fill('-2');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('uses the applied sample count in raw database queries', async ({
        page,
    }) => {
        const { panel, editor } = await openDataSettingEditor(page);
        const rawMode = section(editor, 'Raw Mode');
        await setCheckbox(
            samplingCheckbox(rawMode, 'main'),
            true,
        );
        await samplingInput(rawMode, 'main').fill('0.125');
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-close').click();
        const sampledRequest = page.waitForRequest((request) => {
            const query = new URL(request.url()).searchParams.get('q');
            return query?.includes('SAMPLING(0.125)') === true;
        });

        await panel.getByTestId('action-toggle-raw').click();

        await sampledRequest;
    });

    test('persists an applied density after saving and reopening the board', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const fileName = `pw-editor-data-setting-${Date.now()}.taz`;
        const { board, editor } = await openDataSettingEditor(page);
        const [points, pixels] = densityInputs(editor, 'main');

        try {
            await points.fill('2');
            await pixels.fill('8');
            await editor.getByTestId('editor-apply').click();
            const reopenedPanel = await saveAndReopen(page, board, fileName);
            const reopenedEditor = await openEditor(reopenedPanel, 'data-setting');
            const [savedPoints, savedPixels] = densityInputs(
                reopenedEditor,
                'main',
            );

            await expect(savedPoints).toHaveValue('1');
            await expect(savedPixels).toHaveValue('4');
        } finally {
            await deleteSavedBoard(page, fileName);
        }
    });
});

async function openDataSettingEditor(
    page: Page,
    options: { raw?: boolean } = {},
): Promise<{ board: Locator; panel: Locator; editor: Locator }> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board);
    if (options.raw) {
        await panel.getByTestId('action-toggle-raw').click();
        await expect(panel.getByTestId('action-toggle-raw')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    }
    const editor = await openEditor(panel, 'data-setting');
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

function densityInputs(
    editor: Locator,
    target: 'main' | 'navigator',
): [Locator, Locator] {
    const inputs = section(editor, 'Calculation Mode').locator(
        'input[type="number"]',
    );
    const offset = target === 'main' ? 0 : 2;
    return [inputs.nth(offset), inputs.nth(offset + 1)];
}

function samplingCheckbox(
    rawMode: Locator,
    target: 'main' | 'navigator',
): Locator {
    return samplingRow(rawMode, target).getByRole('checkbox');
}

function samplingInput(
    rawMode: Locator,
    target: 'main' | 'navigator',
): Locator {
    return samplingRow(rawMode, target).getByRole('spinbutton');
}

function samplingRow(
    rawMode: Locator,
    target: 'main' | 'navigator',
): Locator {
    const label = target === 'main'
        ? 'Use main chart sampling'
        : 'Use navigation sampling';
    return rawMode.getByText(label, { exact: true }).locator('..');
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
