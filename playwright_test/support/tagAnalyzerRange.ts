import { expect, type Locator, type Page } from '@playwright/test';
import { login } from './login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from './tagAnalyzer';

export type DisplayedRange = {
    start: number;
    end: number;
};

const RANGE_SEPARATOR = ' ~ ';
const NAVIGATOR_TRACK_SIDE_OFFSET_PX = 56;
export const MINIMUM_NAVIGATOR_SELECTION_PX = 36;

export async function createTimeRangePanel(page: Page): Promise<Locator> {
    await login(page);
    const board = await createTagAnalyzerBoard(page);
    const panel = await createLoadedTagAnalyzerPanel(page, board, {
        axisKind: 'time',
    });

    await expect(panel.getByTestId('chart')).toHaveAttribute(
        'aria-busy',
        'false',
        { timeout: 30_000 },
    );
    await expect(
        panel.getByTestId('navigator-range-start'),
    ).toBeEnabled();
    return panel;
}

export async function readMainRange(panel: Locator): Promise<DisplayedRange> {
    return parseDisplayedRange(
        await panel.getByTestId('main-range-button').innerText(),
    );
}

export async function readNavigatorRange(
    panel: Locator,
): Promise<DisplayedRange> {
    const start = await panel
        .getByTestId('navigator-range-start')
        .innerText();
    const end = await panel
        .getByTestId('navigator-range-end')
        .innerText();

    return {
        start: parseDisplayedTime(start),
        end: parseDisplayedTime(end),
    };
}

export function rangeSpan(range: DisplayedRange): number {
    return range.end - range.start;
}

export async function expectMinimumNavigatorSelection(
    panel: Locator,
): Promise<void> {
    const mainRange = await readMainRange(panel);
    const navigatorRange = await readNavigatorRange(panel);
    const chartBox = await panel.getByTestId('chart').boundingBox();
    if (!chartBox) throw new Error('Panel chart is not visible.');

    const navigatorTrackWidth = Math.max(
        chartBox.width - NAVIGATOR_TRACK_SIDE_OFFSET_PX,
        1,
    );
    const selectionWidth =
        (rangeSpan(mainRange) / rangeSpan(navigatorRange)) *
        navigatorTrackWidth;

    expect(selectionWidth).toBeGreaterThanOrEqual(
        MINIMUM_NAVIGATOR_SELECTION_PX,
    );
}

function parseDisplayedRange(text: string): DisplayedRange {
    const [start, end] = text.trim().split(RANGE_SEPARATOR);
    if (!start || !end) {
        throw new Error(`Unexpected displayed range: ${text}`);
    }

    return {
        start: parseDisplayedTime(start),
        end: parseDisplayedTime(end),
    };
}

function parseDisplayedTime(value: string): number {
    const timestamp = new Date(value.trim().replace(' ', 'T')).getTime();
    if (!Number.isFinite(timestamp)) {
        throw new Error(`Unexpected displayed time: ${value}`);
    }
    return timestamp;
}
