import {
    expect,
    test,
    type Locator,
    type Page,
} from '@playwright/test';
import { login } from '../../support/login';
import {
    MACHROLL_TAG,
    addMachrollTag,
    applyNewChart,
    createMachrollPanel,
    getPanelByTitle,
    openNewChartDialog,
    openNewTagAnalyzerBoard,
    selectMachrollTable,
    waitForLoadedPanel,
} from '../../support/tagAnalyzer';

test.describe('TagAnalyzer scenarios', () => {
    test.describe.configure({ timeout: 120_000 });

    test('1. Create a MACHROLL chart', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3] Open a new TagAnalyzer board.
        await openNewTagAnalyzerBoard(page);

        // 3. [1.3.1.1] Open New Chart.
        const title = 'Scenario 1 - MACHROLL chart';
        const setup = await openNewChartDialog(page, title);

        // 4. [1.3.2.1] Select MACHROLL.
        await selectMachrollTable(page, setup);

        // 5. [1.3.2.3, 1.3.2.6] Search for and add pneumatic.
        await addMachrollTag(setup);

        // 6. [1.3.3.3] Apply the modal.
        await applyNewChart(setup);

        // 7. [1.4.2.1.1, 1.4.2.1.2] Check the loaded chart and series.
        const panel = getPanelByTitle(page, title);
        await waitForLoadedPanel(panel);
        await openPanelDataEditor(panel);
        await expect(
            panel.getByTitle(new RegExp(`${MACHROLL_TAG}.*MACHROLL`, 'i')),
        ).toBeVisible();
        await closePanelEditor(panel);
    });

    test('2. Navigate and zoom', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create a MACHROLL chart.
        await openNewTagAnalyzerBoard(page);
        const panel = await createMachrollPanel(
            page,
            'Scenario 2 - zoom',
        );
        const rangeButton = panel.locator(
            'button[title="Set current visible main chart range"]',
        );
        const chart = panel.locator('.chart-body');
        const chartBox = await chart.boundingBox();
        if (!chartBox) throw new Error('The main chart is not visible.');

        const initialSpan = await readDatetimeRangeSpan(rangeButton);
        await page.mouse.move(
            chartBox.x + chartBox.width / 2,
            chartBox.y + 110,
        );

        // 3. [1.4.2.2.1] Zoom in with the mouse wheel.
        await page.mouse.wheel(0, -100);
        await expect
            .poll(() => readDatetimeRangeSpan(rangeButton))
            .toBeLessThan(initialSpan);
        const zoomedSpan = await readDatetimeRangeSpan(rangeButton);

        // 4. [1.4.2.2.2] Zoom out with the mouse wheel.
        await page.mouse.wheel(0, 100);
        await expect
            .poll(() => readDatetimeRangeSpan(rangeButton))
            .toBeGreaterThan(zoomedSpan);
    });

    test('3. Analyze a selected range', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create a MACHROLL chart.
        await openNewTagAnalyzerBoard(page);
        const panel = await createMachrollPanel(
            page,
            'Scenario 3 - FFT',
        );

        // 3. [1.4.4.4.1] Enable range selection.
        const selectRange = panel.getByRole('button', {
            name: 'Select data range',
            exact: true,
        });
        await selectRange.click();
        await expect(selectRange).toHaveClass(/button--active/);

        // 4. [1.4.4.4.3, 1.4.4.4.4] Select data and open its summary.
        const chart = panel.locator('.chart-body');
        const chartBox = await chart.boundingBox();
        if (!chartBox) throw new Error('The FFT source chart is not visible.');
        const selectionY = chartBox.y + 110;
        await page.mouse.move(chartBox.x + chartBox.width * 0.2, selectionY);
        await page.mouse.down();
        await page.mouse.move(
            chartBox.x + chartBox.width * 0.8,
            selectionY,
            { steps: 12 },
        );
        await page.mouse.up();

        const summaryTitle = page.getByText('Selection Summary', {
            exact: true,
        });
        await expect(summaryTitle).toBeVisible();
        const summary = summaryTitle.locator('../..');

        // 5. [1.4.4.4.5] Check the selected range and statistics.
        for (const label of ['Name', 'Min', 'Max', 'Avg']) {
            await expect(summary.getByText(label, { exact: true })).toBeVisible();
        }
        await expect(
            summary.getByText(MACHROLL_TAG, { exact: true }),
        ).toBeVisible();
        await expect(
            summary.getByText(
                /\d{4}-\d{2}-\d{2}.*~.*\d{4}-\d{2}-\d{2}/,
            ),
        ).toBeVisible();
        await expect
            .poll(() => summary.getByText(/^-?\d+(?:\.\d+)?$/).count())
            .toBeGreaterThanOrEqual(3);

        // 6. [1.4.4.5.1] Open FFT and wait for its TQL response.
        const fftResponsePromise = page.waitForResponse((response) => {
            const request = response.request();
            return request.method() === 'POST' &&
                new URL(response.url()).pathname === '/web/api/tql' &&
                request.postData()?.includes('FFT(') === true;
        });
        await summary
            .getByRole('button', { name: 'Open FFT chart', exact: true })
            .click();
        const fftResponse = await fftResponsePromise;
        expect(fftResponse.ok()).toBe(true);

        // 7. [1.4.4.5.4] Check the rendered 2D FFT chart.
        const fftDialog = page.getByRole('dialog');
        await expect(
            fftDialog.getByRole('button', {
                name: 'Show 2D FFT chart',
                exact: true,
            }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(
            fftDialog.locator('.chart_container canvas'),
        ).toBeVisible({ timeout: 30_000 });
        await fftDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
    });

    test('4. Compare MACHROLL panels', async ({ page }) => {
        // 1. [M.1] Authenticate.
        await login(page);

        // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create two MACHROLL panels.
        await openNewTagAnalyzerBoard(page);
        const firstPanel = await createMachrollPanel(
            page,
            'Scenario 4 - A',
        );
        const secondPanel = await createMachrollPanel(
            page,
            'Scenario 4 - B',
        );

        // 3. [1.4.1.17] Add both panels to Overlap.
        await selectPanelForOverlap(firstPanel);
        await selectPanelForOverlap(secondPanel);

        // 4. [1.2.4.1, 1.2.4.3] Open Overlap for the compatible panels.
        const openOverlap = page.getByRole('button', {
            name: 'Open overlap chart',
            exact: true,
        });
        await expect(openOverlap).toBeEnabled();
        await openOverlap.click();

        // 5. [1.2.4.5] Check both panels and the rendered comparison chart.
        const overlapDialog = page.getByRole('dialog');
        await expect(
            overlapDialog.getByText('Overlap Chart', { exact: true }),
        ).toBeVisible();
        await expect(
            overlapDialog.getByText('Scenario 4 - A', { exact: true }),
        ).toBeVisible();
        await expect(
            overlapDialog.getByText('Scenario 4 - B', { exact: true }),
        ).toBeVisible();
        await expect(
            overlapDialog.getByText('Loading overlap data...', { exact: true }),
        ).toHaveCount(0, { timeout: 30_000 });
        await expect(
            overlapDialog.getByText('No overlap data.', { exact: true }),
        ).toHaveCount(0);
        await expect(overlapDialog.locator('canvas')).toBeVisible();
        const accessibleChart = overlapDialog.locator(
            '[aria-label^="Overlap chart. Series:"]',
        );
        await expect(accessibleChart).toHaveAttribute(
            'aria-label',
            /Scenario 4 - A/,
        );
        await expect(accessibleChart).toHaveAttribute(
            'aria-label',
            /Scenario 4 - B/,
        );
        await expect(accessibleChart).toHaveAttribute('aria-label', /MACHROLL/);
        await overlapDialog
            .getByRole('button', { name: 'Close', exact: true })
            .click();
    });

    test('5. Save and reopen', async ({ page }) => {
        test.setTimeout(180_000);

        const fileName = `pw-tag-analyzer-${Date.now()}.taz`;
        let shouldCleanUp = false;

        try {
            // 1. [M.1] Authenticate.
            await login(page);

            // 2. [1.1.3, 1.3.1.1, 1.3.2.1, 1.3.2.3, 1.3.2.6, 1.3.3.3] Create a MACHROLL panel.
            await openNewTagAnalyzerBoard(page);
            const title = 'Scenario 5 - saved MACHROLL';
            const panel = await createMachrollPanel(page, title);

            // 3. [1.2.2.3] Set a recognizable board range.
            await page
                .getByRole('button', { name: 'Board range', exact: true })
                .click();
            const rangeDialog = page.getByRole('dialog');
            await rangeDialog.getByLabel('From', { exact: true }).fill('first');
            await rangeDialog.getByLabel('To', { exact: true }).fill('last');
            await rangeDialog
                .getByRole('button', { name: 'Apply', exact: true })
                .click();
            await waitForLoadedPanel(panel);

            // 4. [1.4.3.1.1, 1.4.3.1.3, 1.4.3.2.2] Disable drag zoom.
            await panel
                .getByRole('button', { name: 'Open editor', exact: true })
                .click();
            const useZoom = panel.getByRole('checkbox', {
                name: 'Use Zoom when dragging',
                exact: true,
            });
            await expect(useZoom).toBeChecked();
            await panel
                .getByText('Use Zoom when dragging', { exact: true })
                .click();
            await expect(useZoom).not.toBeChecked();
            const applyEditor = panel.getByRole('button', {
                name: 'Apply',
                exact: true,
            });
            await expect(applyEditor).toBeEnabled();
            await applyEditor.click();
            await closePanelEditor(panel);

            // 5. [1.2.3.1] Save from the toolbar.
            await page
                .getByRole('button', {
                    name: 'Save TagAnalyzer board',
                    exact: true,
                })
                .click();
            const saveDialog = page.getByRole('dialog');
            await expect(
                saveDialog.getByText('Save As', { exact: true }),
            ).toBeVisible();
            await saveDialog
                .getByLabel('File name', { exact: true })
                .fill(fileName);
            shouldCleanUp = true;
            await saveDialog
                .getByRole('button', { name: 'Save', exact: true })
                .click();
            await expect(
                page.getByRole('status').filter({
                    hasText: 'TAZ file saved successfully.',
                }),
            ).toBeVisible({ timeout: 15_000 });
            await expect(saveDialog).toHaveCount(0);

            // 6. [1.1.4, 1.2.3.11] Reload and reopen the saved board.
            await page.reload();
            const savedFile = page.locator(
                `span[data-tooltip-content="${fileName}"]`,
            );
            await expect(savedFile).toBeVisible({ timeout: 20_000 });
            await savedFile.click();
            await expect(
                page.getByRole('button', { name: fileName, exact: true }),
            ).toBeVisible();

            // 7. [1.2.3.9, 1.4.3.1.5] Check the persisted panel, range, series, and setting.
            const reopenedPanel = getPanelByTitle(page, title);
            await waitForLoadedPanel(reopenedPanel);
            await page
                .getByRole('button', {
                    name: 'Time: first~last',
                    exact: true,
                })
                .click();
            const reopenedRangeDialog = page.getByRole('dialog');
            await expect(
                reopenedRangeDialog.getByLabel('From', { exact: true }),
            ).toHaveValue('first');
            await expect(
                reopenedRangeDialog.getByLabel('To', { exact: true }),
            ).toHaveValue('last');
            await reopenedRangeDialog
                .getByRole('button', { name: 'Cancel', exact: true })
                .click();

            await reopenedPanel
                .getByRole('button', { name: 'Open editor', exact: true })
                .click();
            await expect(
                reopenedPanel.getByRole('checkbox', {
                    name: 'Use Zoom when dragging',
                    exact: true,
                }),
            ).not.toBeChecked();
            await openPanelDataEditor(reopenedPanel, false);
            await expect(
                reopenedPanel.getByTitle(
                    new RegExp(`${MACHROLL_TAG}.*MACHROLL`, 'i'),
                ),
            ).toBeVisible();
            await closePanelEditor(reopenedPanel);
        } finally {
            if (shouldCleanUp) await deleteSavedBoard(page, fileName);
        }
    });
});

async function openPanelDataEditor(
    panel: Locator,
    openEditor = true,
): Promise<void> {
    if (openEditor) {
        await panel
            .getByRole('button', { name: 'Open editor', exact: true })
            .click();
    }
    await panel.getByText('Data', { exact: true }).click();
}

async function closePanelEditor(panel: Locator): Promise<void> {
    await panel
        .getByRole('button', { name: 'Close', exact: true })
        .click();
    await expect(panel.getByText('Edit panel', { exact: true })).toHaveCount(0);
}

async function selectPanelForOverlap(panel: Locator): Promise<void> {
    await panel
        .getByRole('button', { name: 'Add to overlap chart', exact: true })
        .click();
    await expect(
        panel.getByRole('button', {
            name: 'Remove from overlap chart',
            exact: true,
        }),
    ).toHaveAttribute('aria-pressed', 'true');
}

async function readDatetimeRangeSpan(rangeButton: Locator): Promise<number> {
    const rangeText = (await rangeButton.textContent())?.trim();
    const [startText, endText] = rangeText?.split(' ~ ') ?? [];
    const start = parseLocalDateTime(startText);
    const end = parseLocalDateTime(endText);

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        throw new Error(`Invalid datetime range: ${rangeText ?? '<empty>'}`);
    }
    return end - start;
}

function parseLocalDateTime(value: string | undefined): number {
    return value ? new Date(value.replace(' ', 'T')).getTime() : Number.NaN;
}

async function deleteSavedBoard(page: Page, fileName: string): Promise<void> {
    const status = await page.evaluate(async (name) => {
        const headers: Record<string, string> = {};
        const accessToken = localStorage.getItem('accessToken');
        const consoleId = localStorage.getItem('consoleId');
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        if (consoleId) headers['X-Console-Id'] = consoleId;

        const response = await fetch(
            `/web/api/files/${encodeURIComponent(name)}`,
            { method: 'DELETE', headers },
        );
        return response.status;
    }, fileName);

    if (![200, 204, 404].includes(status)) {
        throw new Error(`Failed to delete ${fileName}: HTTP ${status}`);
    }
}
