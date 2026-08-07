import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import {
    createMachrollPanel,
    openNewTagAnalyzerBoard,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer overlap', () => {
    test('opens the overlap chart', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create a pneumatic MACHROLL chart.
        await openNewTagAnalyzerBoard(page);
        const loadedPanel = await createMachrollPanel(
            page,
            'Overlap pneumatic chart',
        );

        // 3. [1.4.1.17] Add a loaded panel to the overlap selection.
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
