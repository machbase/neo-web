import { expect, type Locator, type Page } from '@playwright/test';

export const MACHROLL_TAG = 'pneumatic';

export async function openNewTagAnalyzerBoard(page: Page): Promise<void> {
    await page.getByText('TAG ANALYZER', { exact: true }).click();
    await expect(
        page.getByRole('button', { name: 'New Chart', exact: true }),
    ).toBeVisible();
}

export async function openNewChartDialog(
    page: Page,
    title: string,
): Promise<Locator> {
    await page
        .getByRole('button', { name: 'New Chart', exact: true })
        .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('New Chart', { exact: true })).toBeVisible();
    await dialog.getByLabel('Chart name', { exact: true }).fill(title);
    return dialog;
}

export async function selectMachrollTable(
    page: Page,
    dialog: Locator,
): Promise<void> {
    const sourceFields = dialog.getByRole('combobox');
    const table = sourceFields.first();

    await expect(table).toBeEnabled();
    await table.click();
    await page
        .getByRole('option', { name: 'MACHROLL', exact: true })
        .click();
    await expect(table).toHaveValue('MACHROLL');
    await expect(sourceFields.nth(1)).not.toHaveValue('', { timeout: 15_000 });
    await expect(sourceFields.nth(2)).not.toHaveValue('', { timeout: 15_000 });
}

export async function addMachrollTag(dialog: Locator): Promise<void> {
    await dialog.getByLabel('Tag', { exact: true }).fill(MACHROLL_TAG);
    await dialog
        .getByRole('button', { name: 'Search tags', exact: true })
        .click();
    await dialog
        .getByRole('button', { name: MACHROLL_TAG, exact: true })
        .click();
    await expect(dialog.getByText('1 / 12', { exact: true })).toBeVisible();
}

export async function applyNewChart(dialog: Locator): Promise<void> {
    await dialog
        .getByRole('button', { name: 'Apply', exact: true })
        .click();
    await expect(dialog).toHaveCount(0);
}

export function getPanelByTitle(page: Page, title: string): Locator {
    return page.locator('.panel-form').filter({
        has: page.getByRole('button', { name: title, exact: true }),
    });
}

export async function waitForLoadedPanel(panel: Locator): Promise<void> {
    await expect(panel).toHaveCount(1);
    await panel.scrollIntoViewIfNeeded();
    await expect(
        panel.locator(
            'button[title="Set current visible main chart range"]',
        ),
    ).toBeEnabled({ timeout: 30_000 });
    await expect(panel.locator('.chart-body canvas')).toBeVisible();
}

export async function createMachrollPanel(
    page: Page,
    title: string,
): Promise<Locator> {
    const dialog = await openNewChartDialog(page, title);
    await selectMachrollTable(page, dialog);
    await addMachrollTag(dialog);
    await applyNewChart(dialog);

    const panel = getPanelByTitle(page, title);
    await waitForLoadedPanel(panel);
    return panel;
}
