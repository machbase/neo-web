import { expect, test, type Page } from '@playwright/test';
import { login } from '../../support/login';

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
            // 1. [M.1, 1.1.4] Open a saved board with one loaded panel.
            await login(page);
            await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
            await expect(
                page.getByRole('button', {
                    name: 'TAG ANALYZER.taz',
                    exact: true,
                }),
            ).toBeVisible();

            const panel = page.getByRole('region', { name: / panel$/ });
            await expect(panel).toHaveCount(1);
            await expect(
                panel.getByRole('button', {
                    name: 'Set current visible main chart range',
                    exact: true,
                }),
            ).toBeEnabled({ timeout: 30_000 });

            // 2. [1.4.3.1.1] Open the editor and change its draft title.
            await panel
                .getByRole('button', { name: 'Open editor', exact: true })
                .click();
            await expect(
                panel.getByRole('heading', {
                    name: 'Edit panel',
                    exact: true,
                }),
            ).toBeVisible();

            const titleInput = panel.getByLabel('Chart title', { exact: true });
            const originalTitle = await titleInput.inputValue();
            await titleInput.fill(appliedTitle);

            // 3. [1.4.3.2.1] Draft edits do not change the live panel.
            await expect(panel).toHaveAttribute(
                'aria-label',
                `${originalTitle} panel`,
            );
            await expect(
                panel.getByText('You have unapplied changes.', { exact: true }),
            ).toBeVisible();

            // 4. [1.4.3.1.3] Apply updates the current session.
            await panel
                .getByRole('button', { name: 'Apply', exact: true })
                .click();
            await expect(panel).toHaveAttribute(
                'aria-label',
                `${appliedTitle} panel`,
            );
            await expect(
                panel.getByText('Changes applied to this session.', {
                    exact: true,
                }),
            ).toBeVisible();

            // 5. [1.4.3.1.2] Closing discards a later unapplied draft.
            await titleInput.fill(discardedTitle);
            await expect(panel).toHaveAttribute(
                'aria-label',
                `${appliedTitle} panel`,
            );
            await panel
                .getByRole('button', { name: 'Close', exact: true })
                .click();
            await expect(
                panel.getByRole('heading', {
                    name: 'Edit panel',
                    exact: true,
                }),
            ).toHaveCount(0);
            await expect(panel).toHaveAttribute(
                'aria-label',
                `${appliedTitle} panel`,
            );

            // 6. [1.2.3.3, 1.2.3.8] Save the applied session as a new file.
            await page
                .getByRole('button', { name: 'Open Save As', exact: true })
                .click();
            const saveDialog = page.getByRole('dialog');
            await saveDialog
                .getByLabel('File name', { exact: true })
                .fill(fileName);
            shouldCleanUp = true;
            await saveDialog
                .getByRole('button', { name: 'Save', exact: true })
                .click();
            await expect(
                page.getByRole('status').filter({
                    hasText: 'TAZ file saved successfully.',
                }),
            ).toBeVisible({ timeout: 15_000 });
            await expect(saveDialog).toHaveCount(0);

            // 7. [1.4.3.1.5] Reopen and verify only the applied title persisted.
            await page.reload();
            const savedFile = page.locator(
                `span[data-tooltip-content="${fileName}"]`,
            );
            await expect(savedFile).toBeVisible({ timeout: 20_000 });
            await savedFile.click();

            const reopenedPanel = page.getByRole('region', {
                name: `${appliedTitle} panel`,
                exact: true,
            });
            await expect(
                reopenedPanel.getByRole('button', {
                    name: 'Set current visible main chart range',
                    exact: true,
                }),
            ).toBeEnabled({ timeout: 30_000 });
            await reopenedPanel
                .getByRole('button', { name: 'Open editor', exact: true })
                .click();
            await expect(
                reopenedPanel.getByLabel('Chart title', { exact: true }),
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
