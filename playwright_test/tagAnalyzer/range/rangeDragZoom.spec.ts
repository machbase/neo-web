import { expect, test } from '@playwright/test';
import {
    createTimeRangePanel,
    expectMinimumNavigatorSelection,
    rangeSpan,
    readMainRange,
} from '../../support/tagAnalyzerRange';

test.describe('Tag Analyzer range drag zoom', () => {
    test('zooms to a narrow drag while enforcing the navigator selection minimum', async ({
        page,
    }) => {
        const panel = await createTimeRangePanel(page);
        const initialRange = await readMainRange(panel);
        const chart = panel.getByTestId('chart');
        const chartBox = await chart.boundingBox();
        if (!chartBox) throw new Error('Panel chart is not visible.');

        const dragY = chartBox.y + chartBox.height * 0.45;
        await page.mouse.move(chartBox.x + chartBox.width * 0.48, dragY);
        await page.mouse.down();
        await page.mouse.move(
            chartBox.x + chartBox.width * 0.52,
            dragY,
            { steps: 8 },
        );
        await page.mouse.up();

        await expect
            .poll(async () => rangeSpan(await readMainRange(panel)))
            .toBeLessThan(rangeSpan(initialRange));
        await expectMinimumNavigatorSelection(panel);
    });
});
