import { getId } from '@/utils';
import { TAZ_FORMAT_VERSION } from './persistence/TazVersion';
import { formatAbsoluteTimeExpression } from './domain/time/TimeRangeInputResolver';
import { formatNumericValue } from './domain/panelRange/PanelRangeInput';
import type {
    PanelRangeInput,
    TimeRangeInput,
} from './domain/time/TimeTypes';
import type { BoardInfo } from './domain/BoardDomain';
import type { PanelEChartType } from './domain/panel/PanelConfig';
import {
    isNumericBaseTimeSourceColumns,
    type PanelSeriesDefinition,
    type PanelSeriesSourceColumns,
} from './domain/SeriesDomain';
import {
    DEFAULT_NEW_PANEL_TITLE,
    createNewPanelInfo,
} from './modal/createNewPanel/CreateNewPanelInfo';

type TagAnalyzerDefaultBoardOptions = {
    tag: string;
    time: {
        min: number;
        max: number;
    };
    table: string;
    sourceColumns: PanelSeriesSourceColumns;
};

type CreateTazBoardFromSeriesOptions = {
    id: string;
    name: string;
    path: string;
    chartTitle: string;
    chartType?: PanelEChartType;
    seriesList: PanelSeriesDefinition[];
    boardTimeRange: TimeRangeInput;
    panelRange: PanelRangeInput;
};

type CreateTazBoardFromTimeRangeOptions = {
    id: string;
    name: string;
    path: string;
    chartTitle: string;
    chartType?: PanelEChartType;
    seriesList: PanelSeriesDefinition[];
    timeRange: {
        start?: unknown;
        end?: unknown;
    };
};

export function createDefaultTazBoard(
    options: TagAnalyzerDefaultBoardOptions,
): BoardInfo {
    const sBoardId = getId();

    return createTazBoardFromSeries({
        id: sBoardId,
        path: '',
        name: 'TAG ANALYZER',
        chartTitle: DEFAULT_NEW_PANEL_TITLE,
        seriesList: [createDefaultSeriesDefinition(options)],
        boardTimeRange: resolveDefaultBoardTimeRange(
            options.time,
            options.sourceColumns,
        ),
        panelRange: resolveDefaultPanelRange(
            options.time,
            options.sourceColumns,
        ),
    });
}

export function createTazBoardFromTimeRange(
    options: CreateTazBoardFromTimeRangeOptions,
): BoardInfo {
    const sStart = normalizeRangeExpression(options.timeRange.start);
    const sEnd = normalizeRangeExpression(options.timeRange.end);

    return createTazBoardFromSeries({
        id: options.id,
        name: options.name,
        path: options.path,
        chartTitle: options.chartTitle,
        chartType: options.chartType,
        seriesList: options.seriesList,
        boardTimeRange: {
            start: sStart,
            end: sEnd,
        },
        panelRange: { start: sStart, end: sEnd },
    });
}

function createTazBoardFromSeries(
    options: CreateTazBoardFromSeriesOptions,
): BoardInfo {
    const sPanel = createNewPanelInfo(
        options.seriesList,
        options.chartTitle,
        options.chartType ?? 'Line',
    );

    return {
        id: options.id,
        path: options.path,
        type: 'taz',
        version: TAZ_FORMAT_VERSION,
        name: options.name,
        boardTimeRange: options.boardTimeRange,
        panels: [
            {
                ...sPanel,
                time: {
                    rangeInput: options.panelRange,
                    useLastViewedRange: false,
                    lastViewedRange: undefined,
                },
            },
        ],
        code: '',
        savedCode: false,
    };
}

function createDefaultSeriesDefinition(
    options: TagAnalyzerDefaultBoardOptions,
): PanelSeriesDefinition {
    return {
        key: getId(),
        table: options.table,
        sourceTagName: options.tag,
        alias: '',
        calculationMode: 'avg',
        color: undefined,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: {
            name: options.sourceColumns.name,
            time: options.sourceColumns.time,
            value: options.sourceColumns.value,
            jsonKey: options.sourceColumns.jsonKey,
            timeType: options.sourceColumns.timeType,
            timeBaseTime: options.sourceColumns.timeBaseTime,
        },
    };
}

function resolveDefaultPanelRange(
    time: TagAnalyzerDefaultBoardOptions['time'],
    sourceColumns: PanelSeriesSourceColumns,
): PanelRangeInput {
    if (
        Number.isFinite(time.min) &&
        Number.isFinite(time.max) &&
        time.max > time.min
    ) {
        if (isNumericBaseTimeSourceColumns(sourceColumns)) {
            return {
                start: formatNumericValue(time.min),
                end: formatNumericValue(time.max),
            };
        }

        return {
            start: formatAbsoluteTimeExpression(time.min),
            end: formatAbsoluteTimeExpression(time.max),
        };
    }

    return { start: '', end: '' };
}

function resolveDefaultBoardTimeRange(
    time: TagAnalyzerDefaultBoardOptions['time'],
    sourceColumns: PanelSeriesSourceColumns,
): TimeRangeInput {
    if (isNumericBaseTimeSourceColumns(sourceColumns)) {
        return { start: '', end: '' };
    }

    if (
        Number.isFinite(time.min) &&
        Number.isFinite(time.max) &&
        time.max > time.min
    ) {
        return {
            start: formatAbsoluteTimeExpression(time.min),
            end: formatAbsoluteTimeExpression(time.max),
        };
    }

    return { start: '', end: '' };
}

function normalizeRangeExpression(value: unknown): string {
    if (value === undefined || value === null) {
        return '';
    }

    return String(value);
}
