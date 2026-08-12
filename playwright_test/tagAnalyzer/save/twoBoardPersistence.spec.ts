import { expect, test, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';
import { getFileTreeItemTestId } from '../../support/testIds';

test.describe('Tag Analyzer multi-board persistence', () => {
    test('keeps two differently titled TAZ files isolated while switching and deletes both', async ({
        page,
    }) => {
        test.setTimeout(240_000);

        const runId = `${Date.now()}-${test.info().parallelIndex}`;
        const firstFile = `pw-persistence-first-${runId}.taz`;
        const secondFile = `pw-persistence-second-${runId}.taz`;
        const firstTitle = `First persisted title ${runId}`;
        const secondTitle = `Second persisted title ${runId}`;

        try {
            await login(page);
            const board = await createTagAnalyzerBoard(page);
            const panel = await createLoadedTagAnalyzerPanel(page, board, {
                title: firstTitle,
            });

            await saveBoardAs(page, board, firstFile);
            await expect(fileTreeItem(page, firstFile)).toBeVisible({
                timeout: 20_000,
            });

            await renamePanel(panel, secondTitle);
            await saveBoardAs(page, board, secondFile);
            await expect(fileTreeItem(page, secondFile)).toBeVisible({
                timeout: 20_000,
            });

            for (const expected of [
                { fileName: firstFile, title: firstTitle },
                { fileName: secondFile, title: secondTitle },
                { fileName: firstFile, title: firstTitle },
                { fileName: secondFile, title: secondTitle },
            ]) {
                await fileTreeItem(page, expected.fileName).click();
                await expectActivePanelTitle(page, expected.title);
            }

            await deleteFileThroughUi(page, firstFile);
            await deleteFileThroughUi(page, secondFile);
        } finally {
            await deleteFileThroughApi(page, firstFile);
            await deleteFileThroughApi(page, secondFile);
        }
    });
});

async function saveBoardAs(
    page: Page,
    board: Locator,
    fileName: string,
): Promise<void> {
    await board.getByTestId('save-as-button').click();
    const dialog = page.getByTestId('tag-analyzer-save-as-dialog');
    await expect(dialog).toBeVisible();
    await dialog
        .getByTestId('tag-analyzer-save-as-file-name-input')
        .fill(fileName);
    await dialog.getByTestId('tag-analyzer-save-as-submit-button').click();
    await expect(dialog).toHaveCount(0);
    await expect(
        page.getByTestId('tag-analyzer-save-success-toast').last(),
    ).toHaveText('TAZ file saved successfully.', { timeout: 15_000 });
}

async function renamePanel(panel: Locator, title: string): Promise<void> {
    await panel.getByTestId('title-button').click();
    const input = panel.getByTestId('title-input');
    await input.fill(title);
    await input.press('Enter');
    await expect(panel.getByTestId('title-button')).toHaveText(title);
}

async function expectActivePanelTitle(
    page: Page,
    title: string,
): Promise<void> {
    const board = page.getByTestId('tag-analyzer-board');
    await expect(board).toBeVisible();
    const panel = board.getByTestId(/^panel-/);
    await expect(panel).toHaveCount(1, { timeout: 30_000 });
    await expect(panel.getByTestId('title-button')).toHaveText(title, {
        timeout: 30_000,
    });
}

async function deleteFileThroughUi(
    page: Page,
    fileName: string,
): Promise<void> {
    const item = fileTreeItem(page, fileName);
    await item.click({ button: 'right' });
    await page
        .getByRole('button', { name: 'Delete', exact: true })
        .click();

    const dialog = page.getByTestId('file-delete-dialog');
    await expect(dialog).toContainText(fileName);
    await dialog.getByTestId('file-delete-confirm').click();
    await expect(item).toHaveCount(0, { timeout: 20_000 });
}

async function deleteFileThroughApi(
    page: Page,
    fileName: string,
): Promise<void> {
    const status = await page.evaluate(async (name) => {
        const headers: Record<string, string> = {};
        const accessToken = localStorage.getItem('accessToken');
        const consoleId = localStorage.getItem('consoleId');
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        if (consoleId) headers['X-Console-Id'] = consoleId;

        return (
            await fetch(`/web/api/files/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers,
            })
        ).status;
    }, fileName);

    expect([200, 204, 404]).toContain(status);
}

function fileTreeItem(page: Page, fileName: string): Locator {
    return page.getByTestId(getFileTreeItemTestId('/', fileName));
}
