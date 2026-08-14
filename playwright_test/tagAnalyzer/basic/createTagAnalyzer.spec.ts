import { expect, test } from '@playwright/test';
import { login } from '../../support/login';
import { TAG_ANALYZER_FIXTURE_SOURCE } from '../../support/tagAnalyzer';

const SERIES_OPTION_TEST_IDS = [
    'tag-analyzer-series-option-SENSOR_01',
    'tag-analyzer-series-option-SENSOR_02',
    'tag-analyzer-series-option-SENSOR_03',
];

test.describe('Tag Analyzer basic flow', () => {
    test('creates a chart with seeded distance series', async ({ page }) => {
        // 1. Create Tag Analyzer.
        await login(page);

        await page.getByTestId('new-board-taz').click();
        const board = page.getByTestId('tag-analyzer-board');
        await expect(board).toBeVisible();

        // 2. Open New Chart.
        await board.getByTestId('create-panel-button').click();
        const setup = page.getByTestId('tag-analyzer-create-panel-dialog');
        await expect(setup).toBeVisible();

        // 3. Select the table populated by the test database initializer.
        const sourceTable = setup.getByLabel('Table', { exact: true });
        await sourceTable.fill(TAG_ANALYZER_FIXTURE_SOURCE.numeric.table);
        await page
            .getByRole('option', {
                name: TAG_ANALYZER_FIXTURE_SOURCE.numeric.table,
                exact: true,
            })
            .click();
        await expect(sourceTable).toHaveValue(
            TAG_ANALYZER_FIXTURE_SOURCE.numeric.table,
        );

        // 4. Add distance-series tags from the seeded fixture.
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

        // 5. Apply and close setup.
        await setup.getByTestId('tag-analyzer-create-panel-apply-button').click();

        await expect(setup).toHaveCount(0);
        const panel = board.getByTestId(/^panel-/);
        await expect(panel).toHaveCount(1);
        const panelTitle = panel.getByTestId('title-button');
        await expect(panelTitle).toBeVisible();
        await expect(panelTitle).toHaveText('New chart');
    });
});
