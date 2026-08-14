import { expect, type Locator, type Page } from '@playwright/test';
import { login } from '../../support/login';
import {
    createTagAnalyzerBoard,
    createLoadedTagAnalyzerPanel,
} from '../../support/tagAnalyzer';

export const HIGHLIGHT_EDITOR_TEST_ID = 'tag-analyzer-highlight-editor';
export const ANNOTATION_EDITOR_TEST_ID = 'tag-analyzer-annotation-editor';

type MarkupTool = 'Annotation' | 'Highlight';
type MarkupEditorTestId =
    | typeof HIGHLIGHT_EDITOR_TEST_ID
    | typeof ANNOTATION_EDITOR_TEST_ID;
type CanvasColorMatch = {
    count: number;
    point: { x: number; y: number } | undefined;
};

export async function createMarkupPanel(page: Page): Promise<Locator> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board, {
        title: 'Markup test',
    });
    await expect(panel.getByTestId('chart')).toHaveAttribute(
        'aria-busy',
        'false',
        { timeout: 30_000 },
    );
    return panel;
}

async function enableMarkupTool(
    page: Page,
    panel: Locator,
    tool: MarkupTool,
): Promise<void> {
    await panel.getByTestId('extra-actions-trigger').click();
    await page.getByRole('button', { name: tool, exact: true }).click();
}

async function getChartBox(panel: Locator) {
    const chart = panel.getByTestId('chart');
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    if (!box) throw new Error('Tag Analyzer chart is not visible.');
    return box;
}

export async function openHighlightEditor(
    page: Page,
    panel: Locator,
): Promise<Locator> {
    await enableMarkupTool(page, panel, 'Highlight');
    const box = await getChartBox(panel);
    const y = box.y + 110;

    await page.mouse.move(box.x + box.width * 0.25, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, y, { steps: 12 });
    await page.mouse.up();

    const editor = page.getByTestId(HIGHLIGHT_EDITOR_TEST_ID);
    await expect(editor).toBeVisible();
    return editor;
}

export async function openAnnotationEditor(
    page: Page,
    panel: Locator,
): Promise<Locator> {
    await enableMarkupTool(page, panel, 'Annotation');
    const box = await getChartBox(panel);

    await page.mouse.click(box.x + box.width * 0.5, box.y + 110);

    const editor = page.getByTestId(ANNOTATION_EDITOR_TEST_ID);
    await expect(editor).toBeVisible();
    return editor;
}

export async function selectAnnotationSeries(
    page: Page,
    editor: Locator,
    optionName: string | RegExp = /^use\b/,
): Promise<void> {
    await editor.getByTestId('series-trigger').click();
    const option = typeof optionName === 'string'
        ? page.getByRole('option', { name: optionName, exact: true })
        : page.getByRole('option', { name: optionName });
    await option.click();
}

async function readCanvasColor(
    chart: Locator,
    hexColor: string,
): Promise<CanvasColorMatch> {
    return chart.locator('canvas').evaluateAll((elements, color) => {
        const target = [
            Number.parseInt(color.slice(1, 3), 16),
            Number.parseInt(color.slice(3, 5), 16),
            Number.parseInt(color.slice(5, 7), 16),
        ];
        // Canvas anti-aliasing blends label colors with the chart background.
        const channelTolerance = 55;
        let totalCount = 0;
        let bestCount = 0;
        let bestPoint: { x: number; y: number } | undefined;

        for (const element of elements) {
            const canvas = element as HTMLCanvasElement;
            const context = canvas.getContext('2d');
            if (!context) continue;

            const pixels = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
            ).data;
            const matches: Array<{ x: number; y: number }> = [];

            for (let index = 0; index < pixels.length; index += 4) {
                if (
                    pixels[index + 3] < 128 ||
                    Math.abs(pixels[index] - target[0]) > channelTolerance ||
                    Math.abs(pixels[index + 1] - target[1]) > channelTolerance ||
                    Math.abs(pixels[index + 2] - target[2]) > channelTolerance
                ) {
                    continue;
                }

                const pixelIndex = index / 4;
                matches.push({
                    x: pixelIndex % canvas.width,
                    y: Math.floor(pixelIndex / canvas.width),
                });
            }

            totalCount += matches.length;
            if (matches.length === 0 || matches.length <= bestCount) continue;

            const bounds = matches.reduce(
                (current, point) => ({
                    minX: Math.min(current.minX, point.x),
                    maxX: Math.max(current.maxX, point.x),
                    minY: Math.min(current.minY, point.y),
                    maxY: Math.max(current.maxY, point.y),
                }),
                { minX: canvas.width, maxX: -1, minY: canvas.height, maxY: -1 },
            );
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            const nearest = matches.reduce((current, point) =>
                (point.x - centerX) ** 2 + (point.y - centerY) ** 2 <
                (current.x - centerX) ** 2 + (current.y - centerY) ** 2
                    ? point
                    : current,
            );

            const rect = canvas.getBoundingClientRect();
            bestCount = matches.length;
            bestPoint = {
                x: rect.left + ((nearest.x + 0.5) * rect.width) / canvas.width,
                y: rect.top + ((nearest.y + 0.5) * rect.height) / canvas.height,
            };
        }

        return { count: totalCount, point: bestPoint };
    }, hexColor);
}

export async function expectRenderedColor(
    page: Page,
    panel: Locator,
    textColor: string,
): Promise<void> {
    await page.mouse.move(0, 0);
    const chart = panel.getByTestId('chart');
    await expect.poll(
        async () => (await readCanvasColor(chart, textColor)).count,
        { timeout: 10_000 },
    ).toBeGreaterThan(0);
}

export async function openRenderedMarkupEditor(
    page: Page,
    panel: Locator,
    textColor: string,
    editorTestId: MarkupEditorTestId,
): Promise<Locator> {
    await expectRenderedColor(page, panel, textColor);

    const match = await readCanvasColor(panel.getByTestId('chart'), textColor);
    if (!match.point) {
        throw new Error(`Cannot locate rendered markup color ${textColor}.`);
    }
    await page.mouse.click(match.point.x, match.point.y);

    const editor = page.getByTestId(editorTestId);
    await expect(editor).toBeVisible();
    return editor;
}

export async function expectRenderedColorRemoved(
    page: Page,
    panel: Locator,
    textColor: string,
): Promise<void> {
    await page.mouse.move(0, 0);
    const chart = panel.getByTestId('chart');
    await expect.poll(
        async () => (await readCanvasColor(chart, textColor)).count,
        { timeout: 10_000 },
    ).toBe(0);
}

export async function addHighlight(
    page: Page,
    panel: Locator,
    options: {
        label: string;
        textColor: string;
        fillColor?: string;
    },
): Promise<void> {
    await expectRenderedColorRemoved(page, panel, options.textColor);
    const editor = await openHighlightEditor(page, panel);
    await editor.getByTestId('label-input').fill(options.label);
    await editor.getByTestId('text-color-input').fill(options.textColor);
    if (options.fillColor) {
        await editor.getByTestId('fill-color-input').fill(options.fillColor);
    }
    await editor.getByTestId('apply-button').click();
    await expect(editor).toHaveCount(0);
    await expectRenderedColor(page, panel, options.textColor);
}

export async function addAnnotation(
    page: Page,
    panel: Locator,
    options: {
        text: string;
        textColor: string;
        fillColor?: string;
        clip?: boolean;
    },
): Promise<void> {
    await expectRenderedColorRemoved(page, panel, options.textColor);
    const editor = await openAnnotationEditor(page, panel);
    await selectAnnotationSeries(page, editor);
    await editor.getByTestId('text-input').fill(options.text);
    await editor.getByTestId('text-color-input').fill(options.textColor);
    if (options.fillColor) {
        await editor.getByTestId('fill-color-input').fill(options.fillColor);
    }
    if (options.clip !== undefined) {
        await editor.getByTestId('clip-checkbox').setChecked(options.clip);
    }
    await editor.getByTestId('apply-button').click();
    await expect(editor).toHaveCount(0);
    await expectRenderedColor(page, panel, options.textColor);
}
