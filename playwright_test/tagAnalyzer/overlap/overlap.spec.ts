import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

test.describe('Tag Analyzer overlap', () => {
    test('opens the overlap chart', async ({ page }) => {
        // 1. Open a saved board.
        await login(page);
        await page.getByText('TAG ANALYZER.taz', { exact: true }).click();
        await expect(
            page.getByRole('button', {
                name: 'TAG ANALYZER.taz',
                exact: true,
            }),
        ).toBeVisible();

        // 2. Select a loaded panel.
        const loadedPanel = page
            .getByRole('region', { name: / panel$/ })
            .filter({
                has: page.getByRole('button', {
                    name: 'Set current visible main chart range',
                    exact: true,
                    disabled: false,
                }),
            });
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

        // 3. Open Overlap Chart.
        const openOverlap = page.getByRole('button', {
            name: 'Open overlap chart',
            exact: true,
        });
        await expect(openOverlap).toBeEnabled();
        await openOverlap.click();

        // 4. Check and close it.
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
        await expect(
            overlapDialog.getByRole('region', {
                name: 'Overlap chart',
                exact: true,
            }),
        ).toBeVisible();
        await overlapDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await expect(overlapDialog).toHaveCount(0);
    });
});
