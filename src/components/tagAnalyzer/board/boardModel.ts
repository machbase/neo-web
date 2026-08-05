import { getId } from '@/utils';
import {
    createNewPanelInfo,
    DEFAULT_NEW_PANEL_TITLE,
    type PanelEChartType,
    type PanelInfo,
} from '../panel/panelModel';
import { formatNumericValue } from '../range/format/numericRangeFormat';
import { formatAbsoluteTimeExpression } from '../range/format/timeRangeFormat';
import {
    type RangeExpressionInput,
    type AxisRange,
} from '../range/rangeModel';
import { isValidRange } from '../range/rangeArithmetic';
import {
    assertValidPanelSeriesIdentifiers,
    createPanelSeriesDefinition,
    isNumericBaseTimeSourceColumns,
    PanelSeriesCalculationMode,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from '../seriesModel';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelInfo[];
    boardTimeRange: RangeExpressionInput;
    boardNumericRange: RangeExpressionInput;
    savedCode: string | false;
    version?: string;
    loadWarning?: string;
};

type TagAnalyzerDefaultBoardOptions = {
    tag: string;
    timeRange: AxisRange;
    table: string;
    sourceColumns: PanelSeriesSourceColumns;
};

type CreateTazBoardFromTimeRangeOptions = {
    id: string;
    name: string;
    path: string;
    chartTitle: string;
    chartType?: PanelEChartType;
    seriesList: PanelSeriesDefinition[];
    timeRange: RangeExpressionInput;
};

type CreateTazBoardFromSeriesOptions = {
    id: string;
    name: string;
    path: string;
    chartTitle: string;
    chartType?: PanelEChartType;
    seriesList: PanelSeriesDefinition[];
    boardTimeRange: RangeExpressionInput;
    boardNumericRange: RangeExpressionInput;
    panelRange: RangeExpressionInput;
};

export function createDefaultTazBoard(
    options: TagAnalyzerDefaultBoardOptions,
): BoardInfo {
    const sIsNumericRange = isNumericBaseTimeSourceColumns(
        options.sourceColumns,
    );
    const sPanelRange = resolveDefaultPanelRange(
        options.timeRange,
        options.sourceColumns,
    );

    return createTazBoardFromSeries({
        id: getId(),
        path: '',
        name: 'TAG ANALYZER',
        chartTitle: DEFAULT_NEW_PANEL_TITLE,
        seriesList: [
            createPanelSeriesDefinition({
                key: getId(),
                table: options.table,
                tagName: options.tag,
                calculationMode: PanelSeriesCalculationMode.Average,
                columns: options.sourceColumns,
            }),
        ],
        boardTimeRange: sIsNumericRange
            ? { start: '', end: '' }
            : { ...sPanelRange },
        boardNumericRange: sIsNumericRange
            ? { ...sPanelRange }
            : { start: '', end: '' },
        panelRange: sPanelRange,
    });
}

export function createTazBoardFromTimeRange(
    options: CreateTazBoardFromTimeRangeOptions,
): BoardInfo {
    const { timeRange, ...boardOptions } = options;

    return createTazBoardFromSeries({
        ...boardOptions,
        boardTimeRange: { ...timeRange },
        boardNumericRange: { start: '', end: '' },
        panelRange: { ...timeRange },
    });
}

function createTazBoardFromSeries(
    options: CreateTazBoardFromSeriesOptions,
): BoardInfo {
    const {
        seriesList,
        chartTitle,
        chartType = 'Line',
        boardTimeRange,
        boardNumericRange,
        panelRange,
        ...boardIdentity
    } = options;

    seriesList.forEach(assertValidPanelSeriesIdentifiers);

    return {
        ...boardIdentity,
        type: 'taz',
        boardTimeRange,
        boardNumericRange,
        panels: [
            {
                ...createNewPanelInfo(seriesList, chartTitle, chartType),
                time: {
                    rangeInput: panelRange,
                    useLastViewedRange: false,
                    lastViewedRange: undefined,
                },
            },
        ],
        code: '',
        savedCode: false,
    };
}

function resolveDefaultPanelRange(
    timeRange: AxisRange,
    sourceColumns: PanelSeriesSourceColumns,
): RangeExpressionInput {
    if (!isValidRange(timeRange)) {
        return { start: '', end: '' };
    }

    const sFormatValue = isNumericBaseTimeSourceColumns(sourceColumns)
        ? formatNumericValue
        : formatAbsoluteTimeExpression;
    return {
        start: sFormatValue(timeRange.startTime),
        end: sFormatValue(timeRange.endTime),
    };
}
