import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer overlap', () => {
    test('opens the overlap chart', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.4] Open an existing TagAnalyzer board.
        await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
        await expect(
            page.getByRole('button', {
                name: 'TAG ANALYZER.taz',
                exact: true,
            }),
        ).toBeVisible();

        // 3. [1.4.1.17] Add a loaded panel to the overlap selection.
        const loadedPanel = page.locator(
            '.panel-form:has(button[title="Set current visible main chart range"]:enabled)',
        );
        await expect(loadedPanel).toHaveCount(1);
        await loadedPanel.scrollIntoViewIfNeeded();
        await loadedPanel
            .getByRole('button', {
                name: 'Add to overlap chart',
                exact: true,
            })
            .click();
        await expect(
            loadedPanel.getByRole('button', {
                name: 'Remove from overlap chart',
                exact: true,
            }),
        ).toHaveAttribute('aria-pressed', 'true');

        // 4. [1.2.4.3] Open the Overlap modal.
        const openOverlap = page.getByRole('button', {
            name: 'Open overlap chart',
            exact: true,
        });
        await expect(openOverlap).toBeEnabled();
        await openOverlap.click();

        // 5. [1.2.4.4] Check and close the Overlap modal.
        const overlapDialog = page.getByRole('dialog');
        await expect(
            overlapDialog.getByText('Overlap Chart', { exact: true }),
        ).toBeVisible();
        await expect(
            overlapDialog.getByRole('button', {
                name: 'Refresh data',
                exact: true,
            }),
        ).toBeVisible();
        await overlapDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await expect(overlapDialog).toHaveCount(0);
    });
});
