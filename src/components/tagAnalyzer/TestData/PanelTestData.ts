import { flattenTagAnalyzerPanelInfo } from '../panel/PanelModelUtils';
import type { TagAnalyzerChartData, TagAnalyzerChartSeriesItem, TagAnalyzerOverlapPanelInfo, TagAnalyzerPanelAxes, TagAnalyzerPanelData, TagAnalyzerPanelDisplay, TagAnalyzerPanelInfo, TagAnalyzerPanelMeta, TagAnalyzerPanelTime, TagAnalyzerPanelTimeKeeper, TagAnalyzerSeriesColumns, TagAnalyzerSeriesConfig, TagAnalyzerTimeRange } from '../panel/TagAnalyzerPanelModelTypes';
import type { TagAnalyzerBoardSourceInfo, TagAnalyzerEditRequest } from '../TagAnalyzerTypes';

// Override shape for series-config fixtures, including partial column metadata.
type TagAnalyzerSeriesConfigOverrides = Partial<TagAnalyzerSeriesConfig> & {
    colName?: Partial<TagAnalyzerSeriesColumns>;
};

// Override shape for panel-time fixtures, including nested time-keeper values.
type TagAnalyzerPanelTimeOverrides = Partial<TagAnalyzerPanelTime> & {
    time_keeper?: Partial<TagAnalyzerPanelTimeKeeper>;
};

// Override shape for nested panel-info fixtures used across tests.
type TagAnalyzerPanelInfoOverrides = {
    meta?: Partial<TagAnalyzerPanelMeta>;
    data?: Partial<TagAnalyzerPanelData>;
    time?: TagAnalyzerPanelTimeOverrides;
    axes?: Partial<TagAnalyzerPanelAxes>;
    display?: Partial<TagAnalyzerPanelDisplay>;
    use_normalize?: TagAnalyzerPanelInfo['use_normalize'];
};

// Override shape for overlap-panel fixtures, with nested board overrides.
type OverlapPanelInfoFixtureOverrides = Partial<TagAnalyzerOverlapPanelInfo> & {
    board?: TagAnalyzerPanelInfoOverrides;
};

// Override shape for top-level board-source fixtures in TagAnalyzer tests.
type TagAnalyzerBoardSourceInfoOverrides = Partial<TagAnalyzerBoardSourceInfo>;

// Override shape for top-level edit-request fixtures passed into the editor flow.
type TagAnalyzerEditRequestOverrides = Partial<TagAnalyzerEditRequest> & {
    pPanelInfo?: TagAnalyzerPanelInfo;
    pNavigatorRange?: Partial<TagAnalyzerTimeRange>;
};

/**
 * Builds a time-range fixture for panel and navigator tests.
 * @param aOverrides The range fields to override for the current fixture.
 * @returns A complete time-range fixture.
 */
export function createTagAnalyzerTimeRangeFixture(
    aOverrides: Partial<TagAnalyzerTimeRange> = {},
): TagAnalyzerTimeRange {
    return {
        startTime: 100,
        endTime: 200,
        ...aOverrides,
    };
}

/**
 * Builds the source-column mapping used by chart-series fixtures.
 * @param aOverrides The source-column fields to override for the current fixture.
 * @returns A complete series-column fixture.
 */
export function createTagAnalyzerSeriesColumnsFixture(
    aOverrides: Partial<TagAnalyzerSeriesColumns> = {},
): TagAnalyzerSeriesColumns {
    return {
        name: 'NAME',
        time: 'TIME',
        value: 'VALUE',
        ...aOverrides,
    };
}

/**
 * Builds a series-config fixture for panel, fetch, and adapter tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A complete series-config fixture.
 */
export function createTagAnalyzerSeriesConfigFixture(
    aOverrides: TagAnalyzerSeriesConfigOverrides = {},
): TagAnalyzerSeriesConfig {
    const sColumns = createTagAnalyzerSeriesColumnsFixture(aOverrides.colName ?? {});

    return {
        key: 'tag-1',
        table: 'TABLE_A',
        sourceTagName: 'temp_sensor',
        alias: '',
        calculationMode: 'avg',
        color: '#ff0000',
        use_y2: 'N',
        ...aOverrides,
        colName: sColumns,
    };
}

/**
 * Builds the fetch-focused series config used by PanelFetchUtils tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A series-config fixture that matches the fetch helper expectations.
 */
export function createTagAnalyzerFetchSeriesConfigFixture(
    aOverrides: TagAnalyzerSeriesConfigOverrides = {},
): TagAnalyzerSeriesConfig {
    return createTagAnalyzerSeriesConfigFixture({
        calculationMode: 'AVG',
        onRollup: false,
        colName: {
            value: 'value_col',
            ...aOverrides.colName,
        },
        ...aOverrides,
    });
}

/**
 * Builds a chart-series item fixture for chart rendering tests.
 * @param aOverrides The series fields to override for the current fixture.
 * @returns A complete chart-series item fixture.
 */
export function createTagAnalyzerChartSeriesItemFixture(
    aOverrides: Partial<TagAnalyzerChartSeriesItem> = {},
): TagAnalyzerChartSeriesItem {
    return {
        name: 'temp(avg)',
        data: [[100, 1]],
        yAxis: 0,
        marker: {
            symbol: 'circle',
            lineColor: null,
            lineWidth: 1,
        },
        color: '#ff0000',
        ...aOverrides,
    };
}

/**
 * Builds the default chart-series list used by panel tests.
 * @returns A one-series chart dataset list.
 */
export function createTagAnalyzerChartSeriesListFixture(): TagAnalyzerChartSeriesItem[] {
    return [createTagAnalyzerChartSeriesItemFixture()];
}

/**
 * Builds navigator chart data for chart and layout tests.
 * @param aOverrides The chart-data fields to override for the current fixture.
 * @returns A complete chart-data fixture.
 */
export function createTagAnalyzerChartDataFixture(
    aOverrides: Partial<TagAnalyzerChartData> = {},
): TagAnalyzerChartData {
    return {
        datasets: [
            createTagAnalyzerChartSeriesItemFixture(),
        ],
        ...aOverrides,
    };
}

/**
 * Builds the default panel-axis config used by panel tests.
 * @param aOverrides The axis fields to override for the current fixture.
 * @returns A complete axis-config fixture.
 */
export function createTagAnalyzerPanelAxesFixture(
    aOverrides: Partial<TagAnalyzerPanelAxes> = {},
): TagAnalyzerPanelAxes {
    return {
        show_x_tickline: 'Y',
        pixels_per_tick_raw: 100,
        pixels_per_tick: 100,
        use_sampling: true,
        sampling_value: 9,
        zero_base: 'N',
        show_y_tickline: 'Y',
        custom_min: 0,
        custom_max: 0,
        custom_drilldown_min: 0,
        custom_drilldown_max: 0,
        use_ucl: 'N',
        ucl_value: 0,
        use_lcl: 'N',
        lcl_value: 0,
        use_right_y2: 'N',
        zero_base2: 'N',
        show_y_tickline2: 'N',
        custom_min2: 0,
        custom_max2: 0,
        custom_drilldown_min2: 0,
        custom_drilldown_max2: 0,
        use_ucl2: 'N',
        ucl2_value: 0,
        use_lcl2: 'N',
        lcl2_value: 0,
        ...aOverrides,
    };
}

/**
 * Builds the default panel-display config used by chart tests.
 * @param aOverrides The display fields to override for the current fixture.
 * @returns A complete display-config fixture.
 */
export function createTagAnalyzerPanelDisplayFixture(
    aOverrides: Partial<TagAnalyzerPanelDisplay> = {},
): TagAnalyzerPanelDisplay {
    return {
        show_legend: 'Y',
        use_zoom: 'N',
        chart_type: 'Line',
        show_point: 'Y',
        point_radius: 2,
        fill: 3,
        stroke: 4,
        ...aOverrides,
    };
}

/**
 * Builds the default time-keeper payload used by panel-time tests.
 * @param aOverrides The time-keeper fields to override for the current fixture.
 * @returns A complete time-keeper fixture.
 */
export function createTagAnalyzerPanelTimeKeeperFixture(
    aOverrides: Partial<TagAnalyzerPanelTimeKeeper> = {},
): TagAnalyzerPanelTimeKeeper {
    return {
        startPanelTime: 10,
        endPanelTime: 20,
        startNaviTime: 5,
        endNaviTime: 25,
        ...aOverrides,
    };
}

/**
 * Builds the default panel-data config used by fetch and runtime tests.
 * @param aOverrides The data fields to override for the current fixture.
 * @returns A complete panel-data fixture.
 */
export function createTagAnalyzerPanelDataFixture(
    aOverrides: Partial<TagAnalyzerPanelData> = {},
): TagAnalyzerPanelData {
    return {
        tag_set: [
            createTagAnalyzerSeriesConfigFixture(),
        ],
        raw_keeper: false,
        count: 500,
        interval_type: 'sec',
        ...aOverrides,
    };
}

/**
 * Builds the default panel-time config used by runtime and editor tests.
 * @param aOverrides The time fields to override for the current fixture.
 * @returns A complete panel-time fixture.
 */
export function createTagAnalyzerPanelTimeFixture(
    aOverrides: TagAnalyzerPanelTimeOverrides = {},
): TagAnalyzerPanelTime {
    return {
        range_bgn: 'now-1h',
        range_end: 'now',
        use_time_keeper: 'N',
        time_keeper: createTagAnalyzerPanelTimeKeeperFixture(aOverrides.time_keeper ?? {}),
        default_range: {
            min: 1,
            max: 2,
        },
        ...aOverrides,
    };
}

/**
 * Builds a panel-time fixture with blank range bounds for reset/initialization tests.
 * @param aOverrides The time fields to override for the current fixture.
 * @returns A panel-time fixture with empty range bounds.
 */
export function createEmptyTagAnalyzerPanelTimeFixture(
    aOverrides: TagAnalyzerPanelTimeOverrides = {},
): TagAnalyzerPanelTime {
    return createTagAnalyzerPanelTimeFixture({
        range_bgn: '',
        range_end: '',
        ...aOverrides,
    });
}

/**
 * Builds a nested panel-info fixture for editor and model tests.
 * @param aOverrides The nested panel-info fields to override for the current fixture.
 * @returns A complete panel-info fixture.
 */
export function createTagAnalyzerPanelInfoFixture(
    aOverrides: TagAnalyzerPanelInfoOverrides = {},
): TagAnalyzerPanelInfo {
    return {
        meta: {
            index_key: 'panel-1',
            chart_title: 'Panel One',
            ...aOverrides.meta,
        },
        data: createTagAnalyzerPanelDataFixture(aOverrides.data),
        time: createTagAnalyzerPanelTimeFixture(aOverrides.time),
        axes: createTagAnalyzerPanelAxesFixture({
            pixels_per_tick_raw: 10,
            pixels_per_tick: 20,
            sampling_value: 30,
            custom_min: 40,
            custom_max: 50,
            custom_drilldown_min: 60,
            custom_drilldown_max: 70,
            use_ucl: 'Y',
            ucl_value: 80,
            lcl_value: 90,
            use_right_y2: 'N',
            zero_base2: 'Y',
            show_y_tickline2: 'N',
            custom_min2: 100,
            custom_max2: 110,
            custom_drilldown_min2: 120,
            custom_drilldown_max2: 130,
            use_ucl2: 'N',
            ucl2_value: 140,
            use_lcl2: 'Y',
            lcl2_value: 150,
            ...aOverrides.axes,
        }),
        display: createTagAnalyzerPanelDisplayFixture(aOverrides.display),
        use_normalize: aOverrides.use_normalize,
    };
}

/**
 * Builds the board-source shape passed into the top-level TagAnalyzer workspace.
 * @param aOverrides The board-source fields to override for the current fixture.
 * @returns A board-source fixture with one flattened panel by default.
 */
export function createTagAnalyzerBoardSourceInfoFixture(
    aOverrides: TagAnalyzerBoardSourceInfoOverrides = {},
): TagAnalyzerBoardSourceInfo {
    return {
        id: 'board-1',
        type: 'tag',
        name: 'Tag Board',
        path: '/tag-board',
        code: '',
        panels: [flattenTagAnalyzerPanelInfo(createTagAnalyzerPanelInfoFixture())],
        range_bgn: 'now-1h',
        range_end: 'now',
        savedCode: false,
        ...aOverrides,
    };
}

/**
 * Builds the top-level edit request shape used to open PanelEditor from TagAnalyzer.
 * @param aOverrides The edit-request fields to override for the current fixture.
 * @returns A complete edit-request fixture.
 */
export function createTagAnalyzerEditRequestFixture(
    aOverrides: TagAnalyzerEditRequestOverrides = {},
): TagAnalyzerEditRequest {
    return {
        pPanelInfo: aOverrides.pPanelInfo ?? createTagAnalyzerPanelInfoFixture(),
        pNavigatorRange: createTagAnalyzerTimeRangeFixture(aOverrides.pNavigatorRange ?? {}),
        pSetSaveEditedInfo: aOverrides.pSetSaveEditedInfo ?? jest.fn(),
    };
}

/**
 * Builds the footer props needed by focused footer interaction tests.
 * @param aVisibleRange The visible range to show in the footer labels.
 * @returns The minimum footer props for label and click-handler tests.
 */
export function createPanelFooterPropsFixture(
    aVisibleRange: Partial<TagAnalyzerTimeRange> = {},
){
    return {
        pPanelSummary: {
            tagCount: 1,
            showLegend: 'N' as const,
        },
        pVisibleRange: createTagAnalyzerTimeRangeFixture(aVisibleRange),
        pShiftHandlers: {
            onShiftNavigatorRangeLeft: jest.fn(),
            onShiftNavigatorRangeRight: jest.fn(),
        },
        pZoomHandlers: {
            onZoomIn: jest.fn(),
            onZoomOut: jest.fn(),
            onFocus: jest.fn(),
        },
    };
}

/**
 * Builds the minimal overlap-panel info used by overlap helper tests.
 * @param aOverrides The overlap-panel fields to override for the current fixture.
 * @returns A minimal overlap-panel fixture with board-axis settings.
 */
export function createOverlapPanelInfoFixture(
    aOverrides: OverlapPanelInfoFixtureOverrides = {},
): TagAnalyzerOverlapPanelInfo {
    return {
        start: 1_000,
        duration: 5_000,
        isRaw: false,
        board: createTagAnalyzerPanelInfoFixture({
            axes: {
                pixels_per_tick: 20,
                pixels_per_tick_raw: 10,
                ...aOverrides.board?.axes,
            },
            meta: aOverrides.board?.meta,
            data: aOverrides.board?.data,
            time: aOverrides.board?.time,
            display: aOverrides.board?.display,
            use_normalize: aOverrides.board?.use_normalize,
        }),
        ...aOverrides,
    };
}
