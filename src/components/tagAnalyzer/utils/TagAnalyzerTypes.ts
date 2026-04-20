import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { LegacyFlatPanelInfo } from './legacy/LegacyTypes';
import type {
    ValueRangePair,
    ResolvedTimeBounds,
    IntervalOption,
    PanelInfo,
    TimeRangePair,
    TimeRangeConfig,
    TimeRange,
    ValueRange,
} from './ModelTypes';

// Used by TagAnalyzer workspace and board flows to type board source info.
export type BoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: LegacyFlatPanelInfo[];
};

// Used by TagAnalyzer workspace and board flows to type board info.
export type BoardInfo = Omit<GBoardListType, 'panels' | 'range_bgn' | 'range_end'> & {
    panels: PanelInfo[];
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

// Used by TagAnalyzer workspace and board flows to type board context.
export type BoardContext = {
    id: string;
    time: ResolvedTimeBounds;
};

// Used by TagAnalyzer workspace and board flows to type panel change type.
export type PanelChangeType = 'delete' | 'changed';

// Used by TagAnalyzer workspace and board flows to type edit request.
export type EditRequest = {
    pPanelInfo: PanelInfo;
    pNavigatorRange: TimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

// Used by TagAnalyzer workspace and board flows to type shared global chart time state.
export type GlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: IntervalOption;
};

// Used by TagAnalyzer workspace and board flows to type overlap panel state.
export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

// Used by TagAnalyzer workspace and board flows to type overlap selection payloads.
export type OverlapSelectionChangePayload = {
    start: number;
    end: number;
    panel: PanelInfo;
    isRaw: boolean;
    changeType: PanelChangeType | undefined;
};

// Used by TagAnalyzer workspace and board flows to type panel delete payloads.
export type DeletePanelPayload = {
    panelKey: string;
};

// Used by TagAnalyzer workspace and board flows to type panel persistence payloads.
export type PersistPanelStatePayload = {
    targetPanelKey: string;
    timeInfo: TimeRangePair;
    isRaw: boolean;
};

// Used by TagAnalyzer workspace and board flows to type global-time payloads.
export type SetGlobalTimeRangePayload = {
    dataTime: TimeRange;
    navigatorTime: TimeRange;
    interval: IntervalOption;
};

// Used by TagAnalyzer workspace and board flows to type board panel state.
export type BoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    timeBoundaryRanges: ValueRangePair | undefined;
    globalTimeRange: GlobalTimeRangeState | undefined;
};

// Used by TagAnalyzer board shells to type the subset of board state shared with one panel.
export type BoardChartState = Pick<
    BoardPanelState,
    'refreshCount' | 'timeBoundaryRanges' | 'globalTimeRange'
>;

// Used by TagAnalyzer workspace and board flows to type board panel actions.
export type BoardPanelActions = {
    onOverlapSelectionChange: (aPayload: OverlapSelectionChangePayload) => void;
    onDeletePanel: (aPayload: DeletePanelPayload) => void;
    onPersistPanelState: (aPayload: PersistPanelStatePayload) => void;
    onSetGlobalTimeRange: (aPayload: SetGlobalTimeRangePayload) => void;
    onOpenEditRequest: (aRequest: EditRequest) => void;
};

// Used by TagAnalyzer board shells to type the subset of board actions shared with one panel.
export type BoardChartActions = Pick<
    BoardPanelActions,
    'onPersistPanelState' | 'onSetGlobalTimeRange' | 'onOpenEditRequest'
>;
