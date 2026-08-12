import { expect, test } from '@playwright/test';
import {
    createTimeRangePanel,
    expectMinimumNavigatorSelection,
    rangeSpan,
    readMainRange,
} from '../../support/tagAnalyzerRange';

test.describe('Tag Analyzer range button zoom', () => {
    test('zooms in and out while enforcing the navigator selection minimum', async ({
        page,
    }) => {
        const panel = await createTimeRangePanel(page);
        const initialRange = await readMainRange(panel);
        const zoomIn = panel.getByTestId('navigator-zoom-in-large');

        for (let index = 0; index < 6; index += 1) {
            await zoomIn.click();
        }

        const zoomedInRange = await readMainRange(panel);
        expect(rangeSpan(zoomedInRange)).toBeLessThan(
            rangeSpan(initialRange),
        );
        await expectMinimumNavigatorSelection(panel);

        await panel.getByTestId('navigator-zoom-out-large').click();
        const zoomedOutRange = await readMainRange(panel);
        expect(rangeSpan(zoomedOutRange)).toBeGreaterThan(
            rangeSpan(zoomedInRange),
        );
        await expectMinimumNavigatorSelection(panel);
    });
});
