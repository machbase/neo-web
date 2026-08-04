import { expect, test } from '@playwright/test';
import { login } from '../../support/login';

const SERIES_NAMES = ['SENSOR_01', 'SENSOR_02', 'SENSOR_03'];

test.describe('Tag Analyzer basic flow', () => {
    test('creates a chart with several mnemonic series', async ({ page }) => {
        // 1. Create Tag Analyzer.
        await login(page);

        await page.getByText('TAG ANALYZER', { exact: true }).click();
        await expect(
            page.getByRole('button', { name: 'TAG ANALYZER', exact: true }),
        ).toBeVisible();

        // 2. Open New Chart.
        await page
            .getByRole('button', { name: 'New Chart', exact: true })
            .click();
        const setup = page.getByRole('dialog');
        await expect(setup).toBeVisible();

        // 3. Add mnemonic series.
        await setup.getByLabel('Tag', { exact: true }).fill('SENSOR');
        await setup
            .getByRole('button', { name: 'Search tags', exact: true })
            .click();

        for (const seriesName of SERIES_NAMES) {
            await setup
                .getByRole('button', { name: seriesName, exact: true })
                .click();
        }

        await expect(
            setup.getByText(`${SERIES_NAMES.length} / 12`, { exact: true }),
        ).toBeVisible();

        // 4. Apply and close setup.
        await setup
            .getByRole('button', { name: 'Apply', exact: true })
            .click();

        await expect(setup).toHaveCount(0);
        await expect(
            page.getByRole('button', { name: 'New chart', exact: true }),
        ).toBeVisible();
    });
});
