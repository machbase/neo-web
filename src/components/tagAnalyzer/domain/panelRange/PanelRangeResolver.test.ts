import {
    resolveConcretePanelRangeState,
    resolveDefaultNavigatorRange,
} from './PanelRangeResolver';

function createRange(startTime: number, endTime: number) {
    return { startTime, endTime };
}

describe('resolveConcretePanelRangeState', () => {
    it('uses board time as default navigator without making it the panel range', () => {
        const result = resolveConcretePanelRangeState({
            fullRange: createRange(0, 100_000),
            rangeInput: { start: '', end: '' },
            isNumericAxis: false,
            lastViewedRange: undefined,
            boardTime: { start: 'last-1s', end: 'last' },
            applyInitialMainChartWindow: true,
        });

        expect(result).toEqual({
            requestPanelRange: createRange(37_500, 62_500),
            requestNavigatorRange: createRange(99_000, 100_000),
            fullRange: createRange(0, 100_000),
        });
    });

    it('resolves empty panel input to a concrete initial window without board time', () => {
        const result = resolveConcretePanelRangeState({
            fullRange: createRange(0, 1000),
            rangeInput: { start: '', end: '' },
            isNumericAxis: false,
            lastViewedRange: undefined,
            boardTime: { start: '', end: '' },
            applyInitialMainChartWindow: true,
        });

        expect(result).toEqual({
            requestPanelRange: createRange(375, 625),
            requestNavigatorRange: createRange(0, 1000),
            fullRange: createRange(0, 1000),
        });
    });

    it('resolves the default navigator to full range without board time', () => {
        const result = resolveDefaultNavigatorRange(
            { start: '', end: '' },
            createRange(0, 1000),
        );

        expect(result).toEqual(createRange(0, 1000));
    });
});
