import { expect, test } from '@playwright/test';
import {
    createTimeRangePanel,
    rangeSpan,
    readMainRange,
    readNavigatorRange,
} from '../../support/tagAnalyzerRange';

const DISPLAY_PRECISION_MS = 1_000;

test.describe('Tag Analyzer panel range shifting', () => {
    test('moves main and navigator ranges without changing their spans', async ({
        page,
    }) => {
        const panel = await createTimeRangePanel(page);

        const initialMain = await readMainRange(panel);
        await panel
            .getByRole('button', { name: 'Move range backward' })
            .click();
        const backwardMain = await readMainRange(panel);
        expect(backwardMain.start).toBeLessThan(initialMain.start);
        expect(backwardMain.end).toBeLessThan(initialMain.end);
        expect(
            Math.abs(rangeSpan(backwardMain) - rangeSpan(initialMain)),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);

        await panel
            .getByRole('button', { name: 'Move range forward' })
            .click();
        const restoredMain = await readMainRange(panel);
        expect(
            Math.abs(restoredMain.start - initialMain.start),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);
        expect(
            Math.abs(restoredMain.end - initialMain.end),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);

        const initialNavigator = await readNavigatorRange(panel);
        await panel.getByTestId('navigator-shift-backward').click();
        const backwardNavigator = await readNavigatorRange(panel);
        expect(backwardNavigator.start).toBeLessThan(initialNavigator.start);
        expect(backwardNavigator.end).toBeLessThan(initialNavigator.end);
        expect(
            Math.abs(
                rangeSpan(backwardNavigator) - rangeSpan(initialNavigator),
            ),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);

        await panel.getByTestId('navigator-shift-forward').click();
        const restoredNavigator = await readNavigatorRange(panel);
        expect(
            Math.abs(restoredNavigator.start - initialNavigator.start),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);
        expect(
            Math.abs(restoredNavigator.end - initialNavigator.end),
        ).toBeLessThanOrEqual(DISPLAY_PRECISION_MS);
    });
});
