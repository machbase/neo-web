import { expect, test } from '@playwright/test';
import { createTimeRangePanel } from '../../support/tagAnalyzerRange';

const EXPECTED_START = '2023-04-01 00:00:00';
const EXPECTED_END = '2023-04-05 00:00:00';

test.describe('Tag Analyzer navigator range input', () => {
    test('applies and retains an exact datetime navigator range', async ({
        page,
    }) => {
        const panel = await createTimeRangePanel(page);

        await panel.getByTestId('navigator-range-start').click();
        const dialog = page.getByTestId('tag-analyzer-range-dialog');
        await expect(dialog).toBeVisible();
        await dialog
            .getByTestId('tag-analyzer-range-from-input')
            .fill(EXPECTED_START);
        await dialog
            .getByTestId('tag-analyzer-range-to-input')
            .fill(EXPECTED_END);
        await dialog
            .getByTestId('tag-analyzer-range-apply-button')
            .click();
        await expect(dialog).toHaveCount(0);

        await expect(
            panel.getByTestId('navigator-range-start'),
        ).toHaveText(EXPECTED_START);
        await expect(
            panel.getByTestId('navigator-range-end'),
        ).toHaveText(EXPECTED_END);

        await panel.getByTestId('navigator-range-end').click();
        await expect(
            dialog.getByTestId('tag-analyzer-range-from-input'),
        ).toHaveValue(EXPECTED_START);
        await expect(
            dialog.getByTestId('tag-analyzer-range-to-input'),
        ).toHaveValue(EXPECTED_END);
    });
});
