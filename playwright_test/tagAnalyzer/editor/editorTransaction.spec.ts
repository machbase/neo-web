import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer panel editor lifecycle', () => {
    test.describe.configure({ timeout: 180_000 });

    let board: Locator;
    let panel: Locator;
    let editor: Locator;

    test.beforeEach(async ({ page }) => {
        await login(page);
        board = await createTagAnalyzerBoard(page);
        panel = await createLoadedTagAnalyzerPanel(page, board, {
            title: 'Editor lifecycle setup',
        });
        editor = panel.getByTestId('editor');
    });

    test('keeps the editor visually closed before it is opened', async () => {
        await expect(editor).toBeHidden();
    });

    test('opens the editor on the General tab', async () => {
        await openEditor(panel);

        await expect(editor.getByTestId('editor-title-input')).toBeVisible();
        await expect(editor.getByTestId('editor-tab-general')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('disables Apply when the draft has no changes', async () => {
        await openEditor(panel);

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('reports an unapplied draft change', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Draft title');

        await expect(editor.getByTestId('editor-status')).toContainText(
            'You have unapplied changes.',
        );
    });

    test('preserves a draft while switching tabs', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Preserved draft');
        await editor.getByTestId('editor-tab-data').click();
        await editor.getByTestId('editor-tab-general').click();

        await expect(editor.getByTestId('editor-title-input')).toHaveValue(
            'Preserved draft',
        );
    });

    test('renders controls only for the selected tab', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-tab-data').click();

        await expect(editor.getByTestId('editor-title-input')).toHaveCount(0);
        await expect(
            editor.getByRole('button', { name: 'Click to add a new series' }),
        ).toBeVisible();
    });

    test('marks an invalid background tab and blocks Apply', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('');
        await editor.getByTestId('editor-tab-data').click();

        await expect(
            editor.getByRole('button', {
                name: 'General, invalid settings',
                exact: true,
            }),
        ).toBeVisible();
        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
    });

    test('keeps the editor open after Apply', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Applied draft');
        await editor.getByTestId('editor-apply').click();

        await expect(editor).toBeVisible();
    });

    test('reports when changes are applied to the session', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Applied draft');
        await editor.getByTestId('editor-apply').click();

        await expect(editor.getByTestId('editor-status')).toContainText(
            'Changes applied to this session.',
        );
    });

    test('discards a draft through the editor Close button', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Discarded draft');
        await editor.getByTestId('editor-close').click();
        await openEditor(panel);

        await expect(editor.getByTestId('editor-title-input')).toHaveValue(
            'Editor lifecycle setup',
        );
    });

    test('discards a draft through the panel editor toggle', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Discarded draft');
        await panel.getByTestId('action-toggle-edit').click();
        await openEditor(panel);

        await expect(editor.getByTestId('editor-title-input')).toHaveValue(
            'Editor lifecycle setup',
        );
    });

    test('reopens on General with the last applied value', async () => {
        await openEditor(panel);
        await editor.getByTestId('editor-title-input').fill('Applied value');
        await editor.getByTestId('editor-apply').click();
        await editor.getByTestId('editor-tab-data').click();
        await editor.getByTestId('editor-close').click();
        await openEditor(panel);

        await expect(editor.getByTestId('editor-tab-general')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await expect(editor.getByTestId('editor-title-input')).toHaveValue(
            'Applied value',
        );
    });

    test('preserves an applied title after saving and reopening the board', async ({
        page,
    }) => {
        const fileName = `pw-editor-title-${Date.now()}.taz`;

        try {
            await openEditor(panel);
            await editor
                .getByTestId('editor-title-input')
                .fill('Persisted editor title');
            await editor.getByTestId('editor-apply').click();
            await editor.getByTestId('editor-close').click();
            await saveBoardAs(page, board, fileName);

            await page.reload();
            const savedFile = page.getByTestId(
                getFileTreeItemTestId('/', fileName),
            );
            await expect(savedFile).toBeVisible({ timeout: 20_000 });
            await savedFile.click();
            const reopenedPanel = board.getByTestId(/^panel-/);
            await expect(reopenedPanel).toHaveCount(1, { timeout: 30_000 });
            await expect(reopenedPanel.getByTestId('main-range-button')).toBeEnabled({
                timeout: 30_000,
            });

            await expect(reopenedPanel.getByTestId('title-button')).toHaveText(
                'Persisted editor title',
            );
        } finally {
            await deleteSavedBoard(page, fileName);
        }
    });
});

async function openEditor(panel: Locator): Promise<Locator> {
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    return editor;
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
    await dialog
        .getByTestId('tag-analyzer-save-as-submit-button')
        .click();
    await expect(page.getByTestId('tag-analyzer-save-success-toast')).toHaveText(
        'TAZ file saved successfully.',
        { timeout: 15_000 },
    );
    await expect(dialog).toHaveCount(0);
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
