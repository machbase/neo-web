import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

const SERIES_OPTION_TEST_IDS = [
    'tag-analyzer-series-option-SENSOR_01',
    'tag-analyzer-series-option-SENSOR_02',
    'tag-analyzer-series-option-SENSOR_03',
];

test.describe('Tag Analyzer basic flow', () => {
    test('creates a chart with several mnemonic series', async ({ page }) => {
        // 1. Create Tag Analyzer.
        await login(page);

        await page.getByTestId('new-board-taz').click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Open New Chart.
        await board.getByTestId('create-panel-button').click();
        const setup = page.getByTestId('tag-analyzer-create-panel-dialog');
        await expect(setup).toBeVisible();

        // 3. Add mnemonic series.
        await setup
            .getByTestId('tag-analyzer-series-search-input')
            .fill('SENSOR');
        await setup.getByTestId('tag-analyzer-series-search-button').click();

        for (const testId of SERIES_OPTION_TEST_IDS) {
            await setup.getByTestId(testId).click();
        }

        await expect(
            setup.getByTestId('tag-analyzer-selected-series-count'),
        ).toContainText(`${SERIES_OPTION_TEST_IDS.length} / 12`);

        // 4. Apply and close setup.
        await setup.getByTestId('tag-analyzer-create-panel-apply-button').click();

        await expect(setup).toHaveCount(0);
        const panel = board.getByTestId(/^panel-/);
        await expect(panel).toHaveCount(1);
        const panelTitle = panel.getByTestId('title-button');
        await expect(panelTitle).toBeVisible();
        await expect(panelTitle).toHaveText('New chart');
    });
});
