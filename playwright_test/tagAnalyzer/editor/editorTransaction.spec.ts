import { expect, test, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer panel editor', () => {
    test('applies editor drafts, discards unapplied changes, and persists the applied value', async ({
        page,
    }) => {
        test.setTimeout(180_000);

        const runId = Date.now();
        const appliedTitle = `Editor transaction ${runId}`;
        const discardedTitle = `Discarded editor transaction ${runId}`;
        const fileName = `pw-editor-transaction-${runId}.taz`;
        let shouldCleanUp = false;

        try {
            // 1. [M.1, 1.1.3, 1.3.1.1] Create a fresh board and panel.
            await login(page);
            const board = await createTagAnalyzerBoard(page);
            const panel = await createLoadedTagAnalyzerPanel(page, board, {
                title: 'Editor transaction setup',
            });
            await expect(panel).toBeVisible();

            // 2. [1.4.3.1.1] Open the editor and change its draft title.
            await panel
                .getByTestId('action-toggle-edit')
                .click();
            await expect(
                panel.getByTestId('editor'),
            ).toBeVisible();

            const titleInput = panel.getByTestId(
                'editor-title-input',
            );
            const originalTitle = await titleInput.inputValue();
            await titleInput.fill(appliedTitle);

            // 3. [1.4.3.2.1] Draft edits do not change the live panel.
            await expect(
                panel.getByTestId('title-button'),
            ).toHaveText(originalTitle);
            await expect(
                panel.getByTestId('editor-status'),
            ).toContainText('You have unapplied changes.');

            // 4. [1.4.3.1.3] Apply updates the current session.
            await panel
                .getByTestId('editor-apply')
                .click();
            await expect(
                panel.getByTestId('title-button'),
            ).toHaveText(appliedTitle);
            await expect(
                panel.getByTestId('editor-status'),
            ).toContainText('Changes applied to this session.');

            // 5. [1.4.3.1.2] Closing discards a later unapplied draft.
            await titleInput.fill(discardedTitle);
            await expect(
                panel.getByTestId('title-button'),
            ).toHaveText(appliedTitle);
            await panel
                .getByTestId('editor-close')
                .click();
            await expect(
                panel.getByTestId('editor'),
            ).toHaveCount(0);
            await expect(
                panel.getByTestId('title-button'),
            ).toHaveText(appliedTitle);

            // 6. [1.2.3.3, 1.2.3.8] Save the applied session as a new file.
            await board
                .getByTestId('save-as-button')
                .click();
            const saveDialog = page.getByTestId(
                'tag-analyzer-save-as-dialog',
            );
            await saveDialog
                .getByTestId('tag-analyzer-save-as-file-name-input')
                .fill(fileName);
            shouldCleanUp = true;
            await saveDialog
                .getByTestId('tag-analyzer-save-as-submit-button')
                .click();
            await expect(
                page.getByTestId('tag-analyzer-save-success-toast'),
            ).toHaveText(
                'TAZ file saved successfully.',
                { timeout: 15_000 },
            );
            await expect(saveDialog).toHaveCount(0);

            // 7. [1.4.3.1.5] Reopen and verify only the applied title persisted.
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
            await reopenedPanel
                .getByTestId('action-toggle-edit')
                .click();
            await expect(
                reopenedPanel.getByTestId(
                    'editor-title-input',
                ),
            ).toHaveValue(appliedTitle);
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });
});

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
