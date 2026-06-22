import type { PanelRangeState } from '../domain/PanelDomain';
import type { BoardPanelRecord } from './BoardPanelState';
import { resolvePanelRangeApplyResult } from './useApplyPanelRange';

function createRange(startTime: number, endTime: number) {
    return { startTime, endTime };
}

function createRecord(rangeState: PanelRangeState): BoardPanelRecord {
    return {
        rangeState,
        chartAreaWidth: 500,
        dataRefreshVersion: 0,
    };
}

describe('resolvePanelRangeApplyResult', () => {
    const currentRangeState: PanelRangeState = {
        requestPanelRange: createRange(10, 20),
        requestNavigatorRange: createRange(0, 100),
        fullRange: createRange(0, 100),
    };

    it('resolves and applies an in-bounds range', () => {
        const result = resolvePanelRangeApplyResult(
            createRecord(currentRangeState),
            {
                panelKey: 'panel-1',
                rangeState: {
                    requestPanelRange: createRange(20, 30),
                    requestNavigatorRange: createRange(0, 100),
                    fullRange: createRange(0, 100),
                },
            },
        );

        expect(result.didChange).toBe(true);
        expect(result.resolvedRangeState.requestPanelRange).toEqual(createRange(20, 30));
    });

    it('allows range movement outside fullRange', () => {
        const result = resolvePanelRangeApplyResult(
            createRecord(currentRangeState),
            {
                panelKey: 'panel-1',
                rangeState: {
                    requestPanelRange: createRange(90, 110),
                    requestNavigatorRange: createRange(0, 100),
                    fullRange: createRange(0, 100),
                },
            },
        );

        expect(result.didChange).toBe(true);
        expect(result.resolvedRangeState.requestPanelRange).toEqual(createRange(90, 110));
        expect(result.resolvedRangeState.requestNavigatorRange.startTime).toBeLessThanOrEqual(90);
        expect(result.resolvedRangeState.requestNavigatorRange.endTime).toBeGreaterThanOrEqual(110);
    });

    it('expands navigator range to contain the panel range', () => {
        const result = resolvePanelRangeApplyResult(
            createRecord(currentRangeState),
            {
                panelKey: 'panel-1',
                rangeState: {
                    requestPanelRange: createRange(80, 90),
                    requestNavigatorRange: createRange(0, 50),
                    fullRange: createRange(0, 100),
                },
            },
        );

        expect(result.didChange).toBe(true);
        expect(result.resolvedRangeState.requestNavigatorRange.startTime).toBeLessThanOrEqual(80);
        expect(result.resolvedRangeState.requestNavigatorRange.endTime).toBeGreaterThanOrEqual(90);
    });
});
