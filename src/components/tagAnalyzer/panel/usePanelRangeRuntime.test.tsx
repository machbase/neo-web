import { renderHook, waitFor } from '@testing-library/react';
import { seriesDataApi } from '../api/seriesDataApi';
import {
    createPanelSeriesDefinition,
    DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
    PanelSeriesCalculationMode,
} from '../seriesModel';
import type { AxisKind, RangeState, ResolvedRangeState } from '../range/rangeModel';
import { createNewPanelInfo, type PanelInfo } from './panelModel';
import {
    usePanelRangeRuntime,
    type PanelRangeRuntimeRequests,
} from './usePanelRangeRuntime';

jest.mock('../api/seriesDataApi', () => ({
    seriesDataApi: {
        fetchSeriesFullRange: jest.fn(),
    },
}));

const FULL_RANGE = { start: 0, end: 1_000 };
const CURRENT_RANGE_STATE: ResolvedRangeState = {
    range: {
        mainRange: { start: 10, end: 20 },
        navigatorRange: FULL_RANGE,
    },
    fullRange: FULL_RANGE,
    navigatorRangeInput: { start: '', end: '' },
};
const GLOBAL_NUMERIC_RANGE: RangeState = {
    mainRange: { start: 100, end: 200 },
    navigatorRange: { start: 50, end: 250 },
};
const EMPTY_GLOBAL_REQUEST: PanelRangeRuntimeRequests['globalRangeRequest'] = {
    axisKind: undefined,
    ranges: {},
    applyVersion: 0,
};

function createPanel(axisKind: AxisKind, key: string): PanelInfo {
    const sourceColumns = axisKind === 'numeric'
        ? {
              ...DEFAULT_PANEL_SERIES_SOURCE_COLUMNS,
              time: 'ODOMETER_M',
              timeType: 20,
              timeBaseTime: true,
          }
        : DEFAULT_PANEL_SERIES_SOURCE_COLUMNS;
    const series = createPanelSeriesDefinition({
        key: `${key}-series`,
        table: 'DATA',
        tagName: key,
        calculationMode: PanelSeriesCalculationMode.Average,
        columns: sourceColumns,
    });

    return {
        ...createNewPanelInfo([series], key, 'Line'),
        key,
    };
}

function renderPanelRangeRuntime(
    panelInfo: PanelInfo,
    onRangeStateChange: (rangeState: ResolvedRangeState) => void,
) {
    return renderHook(
        ({ globalRangeRequest }: {
            globalRangeRequest: PanelRangeRuntimeRequests['globalRangeRequest'];
        }) => usePanelRangeRuntime({
            panelInfo,
            rangeState: CURRENT_RANGE_STATE,
            boardRanges: {
                time: {
                    input: { start: '', end: '' },
                    applyVersion: 0,
                },
                numeric: {
                    input: { start: '300', end: '400' },
                    applyVersion: 0,
                },
            },
            globalRangeRequest,
            commandVersions: {
                refreshDataVersion: 0,
                refreshRangeVersion: 0,
                expandFullRangeVersion: 0,
            },
            isActive: true,
            onRangeStateChange,
        }),
        {
            initialProps: { globalRangeRequest: EMPTY_GLOBAL_REQUEST },
        },
    );
}

describe('usePanelRangeRuntime global range broadcasts', () => {
    it('applies a Base Distance global range to every numeric panel only', async () => {
        jest.mocked(seriesDataApi.fetchSeriesFullRange).mockResolvedValue(FULL_RANGE);
        const onFirstNumericRangeChange = jest.fn();
        const onSecondNumericRangeChange = jest.fn();
        const onTimeRangeChange = jest.fn();
        const firstNumericRuntime = renderPanelRangeRuntime(
            createPanel('numeric', 'distance-a'),
            onFirstNumericRangeChange,
        );
        const secondNumericRuntime = renderPanelRangeRuntime(
            createPanel('numeric', 'distance-b'),
            onSecondNumericRangeChange,
        );
        const timeRuntime = renderPanelRangeRuntime(
            createPanel('time', 'datetime'),
            onTimeRangeChange,
        );
        const globalRangeRequest: PanelRangeRuntimeRequests['globalRangeRequest'] = {
            axisKind: 'numeric',
            ranges: { numeric: GLOBAL_NUMERIC_RANGE },
            applyVersion: 1,
        };

        firstNumericRuntime.rerender({ globalRangeRequest });
        secondNumericRuntime.rerender({ globalRangeRequest });
        timeRuntime.rerender({ globalRangeRequest });

        await waitFor(() => {
            expect(onFirstNumericRangeChange).toHaveBeenCalledWith(
                expect.objectContaining({ range: GLOBAL_NUMERIC_RANGE }),
            );
            expect(onSecondNumericRangeChange).toHaveBeenCalledWith(
                expect.objectContaining({ range: GLOBAL_NUMERIC_RANGE }),
            );
        });
        expect(onFirstNumericRangeChange).toHaveBeenCalledTimes(1);
        expect(onSecondNumericRangeChange).toHaveBeenCalledTimes(1);
        expect(onTimeRangeChange).not.toHaveBeenCalled();
        expect(seriesDataApi.fetchSeriesFullRange).toHaveBeenCalledTimes(2);
    });
});
