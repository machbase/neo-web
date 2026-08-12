import { expect, type Locator, type Page } from '@playwright/test';

type CreateLoadedPanelOptions = {
    title?: string;
};

export async function createTagAnalyzerBoard(page: Page): Promise<Locator> {
    await page.getByTestId('new-board-taz').click();

    const board = page.getByTestId('tag-analyzer-board');
    await expect(board).toBeVisible();
    return board;
}

export async function createLoadedTagAnalyzerPanel(
    page: Page,
    board: Locator,
    options: CreateLoadedPanelOptions = {},
): Promise<Locator> {
    const panels = board.getByTestId(/^panel-/);
    await expect(panels).toHaveCount(0);

    await board.getByTestId('create-panel-button').click();
    const dialog = page.getByTestId('tag-analyzer-create-panel-dialog');
    await expect(dialog).toBeVisible();

    if (options.title !== undefined) {
        await dialog
            .getByTestId('tag-analyzer-create-panel-name-input')
            .fill(options.title);
    }

    const sourceTable = dialog.getByLabel('Table', { exact: true });
    await sourceTable.fill('MACHROLL');
    await page
        .getByRole('option', { name: 'MACHROLL', exact: true })
        .click();
    await expect(sourceTable).toHaveValue('MACHROLL');

    await dialog
        .getByTestId('tag-analyzer-series-search-input')
        .fill('pneumatic');
    await dialog
        .getByTestId('tag-analyzer-series-search-button')
        .click();
    await dialog
        .getByTestId('tag-analyzer-series-option-pneumatic')
        .click();

    await dialog
        .getByTestId('tag-analyzer-create-panel-apply-button')
        .click();
    await expect(dialog).toHaveCount(0);
    await expect(panels).toHaveCount(1);

    await expect(panels.getByTestId('main-range-button')).toBeEnabled({
        timeout: 30_000,
    });
    return panels;
}
