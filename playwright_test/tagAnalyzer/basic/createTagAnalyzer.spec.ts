import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import {
    MACHROLL_TAG,
    addMachrollTag,
    applyNewChart,
    getPanelByTitle,
    openNewChartDialog,
    openNewTagAnalyzerBoard,
    selectMachrollTable,
    waitForLoadedPanel,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer basic flow', () => {
    test('creates a chart with the pneumatic MACHROLL series', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await openNewTagAnalyzerBoard(page);

        // 3. [1.3.1.1] Open New Chart.
        const title = 'Basic pneumatic chart';
        const setup = await openNewChartDialog(page, title);

        // 4. [1.3.2.1] Select MACHROLL.
        await selectMachrollTable(page, setup);

        // 5. [1.3.2.3, 1.3.2.6] Search for and add pneumatic.
        await addMachrollTag(setup);

        // 6. [1.3.3.3] Apply the modal and create the panel.
        await applyNewChart(setup);

        // 7. [1.4.2.1.1, 1.4.2.1.2] Check the loaded MACHROLL chart.
        const panel = getPanelByTitle(page, title);
        await waitForLoadedPanel(panel);
        await panel
            .getByRole('button', { name: 'Open editor', exact: true })
            .click();
        await panel.getByText('Data', { exact: true }).click();
        await expect(
            panel.getByTitle(new RegExp(`${MACHROLL_TAG}.*MACHROLL`, 'i')),
        ).toBeVisible();
    });
});
