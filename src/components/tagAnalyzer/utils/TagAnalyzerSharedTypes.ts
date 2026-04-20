import type {
    InputTimeBounds,
    PanelData,
    PanelTime,
    TimeRange,
    ValueRangePair,
} from './modelTypes';

// Shared nullable time-range alias used after a value has been normalized once.
export type OptionalTimeRange = TimeRange | undefined;

// Shared board/panel time inputs used by range-resolution and fetch helpers.
export type PanelRangeBaseParams = {
    boardTime: InputTimeBounds;
    panelData: PanelData;
    panelTime: PanelTime;
};

// Shared input contract for panel-range initialization and reset resolution.
export type PanelRangeResolutionParams = PanelRangeBaseParams & {
    timeBoundaryRanges: ValueRangePair | undefined;
    isEdit: boolean;
};

// Shared rule-evaluation contract for the panel-range resolver pipeline.
export type PanelRangeRuleParams = PanelRangeBaseParams & {
    topLevelRange: OptionalTimeRange;
    includeAbsolutePanelRange: boolean | undefined;
    fallbackRange: () => TimeRange;
};
