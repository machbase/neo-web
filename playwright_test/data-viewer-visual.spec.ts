import { expect, test } from '@playwright/test';

const BASE_URL = process.env.NEO_WEB_URL ?? 'http://192.168.1.99:7777/web/ui';
const USER_ID = process.env.NEO_WEB_USER ?? 'sys';
const PASSWORD = process.env.NEO_WEB_PASSWORD ?? 'manager';
const TABLE_NAME = process.env.NEO_WEB_DATA_VIEWER_TABLE ?? 'EXAMPLE_OPCUA_TAG';

async function openDataViewer(page: import('@playwright/test').Page, tableName: string) {
    await page.setViewportSize({ width: 1920, height: 963 });
    await page.goto(BASE_URL);

    const userInput = page.getByPlaceholder('User');
    const loginVisible = await userInput
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
    if (loginVisible) {
        await userInput.fill(USER_ID);
        await page.getByPlaceholder('Password').fill(PASSWORD);
        await page.getByRole('button', { name: 'SIGN IN' }).click();
        await expect(page.getByRole('button', { name: 'DBEXPLORER' })).toBeVisible();
    }

    await page.getByRole('button', { name: 'DBEXPLORER' }).click();
    const tableItem = page.getByText(tableName, { exact: true });
    await expect(tableItem).toBeVisible();
    await tableItem.click();

    await expect(page.getByRole('button', { name: 'Open Data Viewer' })).toBeVisible();
    await page.getByRole('button', { name: 'Open Data Viewer' }).click();

    const dataViewer = page.locator('.neo-data-viewer');
    await expect(dataViewer).toBeVisible();
    await expect(page.getByRole('button', { name: `DATA: ${tableName}` })).toBeVisible();
    await expect(dataViewer.locator('.page-title')).toHaveText(tableName);
    await expect(dataViewer.locator('.data-viewer-header-title .badge-muted')).toHaveCount(0);
    return dataViewer;
}

test('DB Explorer Data Viewer matches the OPC UA Data Viewer surface', async ({ page }) => {
    const dataViewer = await openDataViewer(page, TABLE_NAME);

    await expect(dataViewer.locator('.form-card-header').filter({ hasText: 'Tags' })).toBeVisible();
    await expect(dataViewer.locator('.data-viewer-tag-list .node-tree-row-folder')).toHaveCount(0);
    await expect(dataViewer.locator('.data-viewer-tag-list button.node-tree-toggle')).toHaveCount(0);
    await expect(dataViewer.locator('.data-viewer-tag-list')).toContainText('Data_Type_Examples_8_Bit_Device_R_Registers_Boolean2');
    await expect(dataViewer.getByText('Backward')).toBeVisible();
    await expect(dataViewer.getByText('Forward')).toBeVisible();
    await expect(dataViewer.locator('.data-viewer-scan-control')).toHaveAttribute('aria-label', 'Scan direction: Forward');
    await expect(dataViewer.locator('.data-viewer-scan-switch')).toHaveClass(/active/);
    await expect(dataViewer.getByRole('button', { name: 'Set time range' })).toContainText('Time range not set');
    await expect(dataViewer.locator('.pagination-input')).toHaveValue('1');
    await expect(dataViewer).not.toContainText('[object Object]');
    await dataViewer.getByRole('button', { name: 'Chart' }).click();
    await expect(dataViewer.locator('.data-viewer-chart .highcharts-container')).toBeVisible();
    await expect(dataViewer.locator('.data-viewer-chart svg.highcharts-root')).toBeVisible();
    await dataViewer.getByRole('button', { name: 'Raw' }).click();

    await expect(dataViewer).toHaveScreenshot('db-explorer-data-viewer.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
        mask: [
            dataViewer.locator('.data-viewer-raw-table tbody'),
            dataViewer.locator('.data-viewer-tag-list'),
        ],
    });

    const layoutMetrics = await dataViewer.evaluate((root) => {
        const readRect = (selector: string) => {
            const element = root.querySelector(selector);
            const rect = element?.getBoundingClientRect();
            return rect
                ? {
                      x: Math.round(rect.x),
                      y: Math.round(rect.y),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                      right: Math.round(rect.right),
                      bottom: Math.round(rect.bottom),
                  }
                : null;
        };
        const rootRect = root.getBoundingClientRect();
        return {
            root: {
                x: Math.round(rootRect.x),
                y: Math.round(rootRect.y),
                width: Math.round(rootRect.width),
                height: Math.round(rootRect.height),
                right: Math.round(rootRect.right),
                bottom: Math.round(rootRect.bottom),
            },
            header: readRect('.page-header'),
            body: readRect('.page-body-full'),
            layout: readRect('.data-viewer-layout'),
            tags: readRect('.data-viewer-tags'),
            results: readRect('.data-viewer-results'),
            toolbar: readRect('.data-viewer-toolbar'),
            table: readRect('.data-viewer-raw-card'),
            tagSearchInput: readRect('.data-viewer-tag-search input'),
            tagList: readRect('.data-viewer-tag-list'),
        };
    });

    expect(layoutMetrics.header).not.toBeNull();
    expect(layoutMetrics.body).not.toBeNull();
    expect(layoutMetrics.layout).not.toBeNull();
    expect(layoutMetrics.tags).not.toBeNull();
    expect(layoutMetrics.results).not.toBeNull();
    expect(layoutMetrics.table).not.toBeNull();

    const { root, header, body, layout, tags, results, toolbar, table, tagSearchInput, tagList } = layoutMetrics;
    if (!header || !body || !layout || !tags || !results || !toolbar || !table || !tagSearchInput || !tagList) throw new Error('Data Viewer layout metrics are incomplete');

    expect(root.width).toBeGreaterThan(1200);
    expect(root.height).toBeGreaterThan(800);
    expect(header.x).toBe(root.x);
    expect(header.width).toBe(root.width);
    expect(body.bottom).toBe(root.bottom);
    expect(Math.abs(layout.x - (root.x + 40))).toBeLessThanOrEqual(2);
    expect(Math.abs(layout.right - (root.right - 40))).toBeLessThanOrEqual(2);
    expect(tags.width).toBeGreaterThanOrEqual(320);
    expect(tags.width).toBeLessThanOrEqual(420);
    expect(results.x - tags.right).toBe(16);
    expect(results.width / layout.width).toBeGreaterThan(0.6);
    expect(toolbar.x).toBe(table.x);
    expect(toolbar.width).toBe(table.width);
    expect(tagSearchInput.x).toBe(tagList.x);
    expect(tagSearchInput.right).toBe(tagList.right);

    await page.addStyleTag({
        content: `
            .neo-data-viewer .data-viewer-tag-list,
            .neo-data-viewer .data-viewer-tag-list *,
            .neo-data-viewer .data-viewer-raw-table tbody,
            .neo-data-viewer .data-viewer-raw-table tbody * {
                color: transparent !important;
                text-shadow: none !important;
            }
        `,
    });
    await expect(dataViewer).toHaveScreenshot('db-explorer-data-viewer-layout-unmasked.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
    });

    await dataViewer.getByRole('button', { name: 'Set time format and timezone' }).click();
    const formatModal = page.getByRole('dialog').filter({ hasText: 'Format & Timezone' });
    await expect(formatModal).toBeVisible();
    await expect(formatModal).toHaveScreenshot('db-explorer-data-viewer-format-modal.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
    });
    await formatModal.getByRole('button', { name: 'Close modal' }).click();

    const tqlRequests: string[] = [];
    page.on('request', (request) => {
        if (request.url().includes('/api/tql')) {
            tqlRequests.push(request.postData() || '');
        }
    });
    await dataViewer.getByRole('button', { name: 'Set time range' }).click();
    const timeModal = page.getByRole('dialog').filter({ hasText: 'Time Range' });
    await expect(timeModal).toBeVisible();
    await expect(timeModal).toHaveScreenshot('db-explorer-data-viewer-time-modal.png', {
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
    });

    await timeModal.getByLabel('From').fill('2026-06-16 00:00:00');
    await timeModal.getByLabel('To').fill('2026-06-16 00:10:00');
    await timeModal.getByRole('button', { name: 'Apply' }).click();
    await expect(dataViewer.getByRole('button', { name: 'Set time range' })).toContainText('2026-06-16 00:00:00 ~ 2026-06-16 00:10:00');
    await expect
        .poll(() => tqlRequests.some((body) => body.includes("TO_TIMESTAMP('2026-06-16 00:00:00')") && body.includes("TO_TIMESTAMP('2026-06-16 00:10:00')")))
        .toBe(true);
});

test('DB Explorer Data Viewer shows asset hierarchy only in the Asset tab', async ({ page }) => {
    const dataViewer = await openDataViewer(page, 'ASSET_TEST_TAG');

    await expect(dataViewer.getByRole('tab', { name: 'Tags' })).toBeVisible();
    await expect(dataViewer.getByRole('tab', { name: 'Asset' })).toBeVisible();
    await expect(dataViewer.getByRole('tab', { name: 'Tags' })).toHaveClass(/is-active/);
    await expect(dataViewer.locator('.data-viewer-tag-list')).toContainText('KR.SEOUL.FA.BOILER01.TEMP');
    await expect(dataViewer.locator('.data-viewer-tag-list')).toContainText('KR.SEOUL.FA.BOILER01.PRESS');
    await expect(dataViewer.locator('.data-viewer-tag-list .node-tree-row-folder')).toHaveCount(0);
    await expect(dataViewer.locator('.data-viewer-tag-list button.node-tree-toggle')).toHaveCount(0);
    await expect(dataViewer).not.toContainText('__machbase_hierarchy__');
    await expect(dataViewer).not.toContainText('{"column"');
    await expect(dataViewer).not.toContainText('{"country"');

    await dataViewer.getByRole('tab', { name: 'Asset' }).click();
    await expect(dataViewer.getByRole('tab', { name: 'Asset' })).toHaveClass(/is-active/);
    await expect(dataViewer.locator('.data-viewer-tag-list .node-tree-row-folder')).toContainText(['Korea', 'Seoul', 'Factory-A', 'Boiler-01']);
    await expect(dataViewer.locator('.data-viewer-tag-list')).toContainText('KR.SEOUL.FA.BOILER01.TEMP');
    await expect(dataViewer.locator('.data-viewer-tag-list')).toContainText('KR.SEOUL.FA.BOILER01.PRESS');

    const layoutMetrics = await dataViewer.evaluate((root) => {
        const tagSearchInput = root.querySelector('.data-viewer-tag-search input')?.getBoundingClientRect();
        const tagList = root.querySelector('.data-viewer-tag-list')?.getBoundingClientRect();
        return tagSearchInput && tagList
            ? {
                  searchX: Math.round(tagSearchInput.x),
                  searchRight: Math.round(tagSearchInput.right),
                  listX: Math.round(tagList.x),
                  listRight: Math.round(tagList.right),
              }
            : null;
    });

    expect(layoutMetrics).not.toBeNull();
    if (!layoutMetrics) throw new Error('Asset tag layout metrics are incomplete');
    expect(layoutMetrics.searchX).toBe(layoutMetrics.listX);
    expect(layoutMetrics.searchRight).toBe(layoutMetrics.listRight);
});
