import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { LegacyFlatPanelInfo } from './utils/legacy/LegacyTypes';
import type {
    ValueRange,
    ValueRangePair,
    GlobalTimeRangeState,
    IntervalOption,
    OverlapPanelInfo,
    PanelInfo,
    TimeRangePair,
    TimeRangeConfig,
    TimeRange,
} from './common/modelTypes';

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
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

// Used by TagAnalyzer workspace and board flows to type panel change type.
export type PanelChangeType = 'delete' | 'changed';

// Used by TagAnalyzer workspace and board flows to type edit request.
export type EditRequest = {
    pPanelInfo: PanelInfo;
    pNavigatorRange: TimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

// Used by TagAnalyzer workspace and board flows to type board panel state.
export type BoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    timeBoundaryRanges: ValueRangePair | undefined;
    globalTimeRange: GlobalTimeRangeState | undefined;
};

// Used by TagAnalyzer workspace and board flows to type board panel actions.
export type BoardPanelActions = {
    onOverlapSelectionChange: (
        aStart: number,
        aEnd: number,
        aBoard: PanelInfo,
        aIsRaw: boolean,
        aIsChanged: PanelChangeType | undefined,
    ) => void;
    onDeletePanel: (aPanelKey: string) => void;
    onPersistPanelState: (
        aTargetPanel: string,
        aTimeInfo: TimeRangePair,
        aRaw: boolean,
    ) => void;
    onSetGlobalTimeRange: (
        aDataTime: TimeRange,
        aNavigatorTime: TimeRange,
        aInterval: IntervalOption,
    ) => void;
    onOpenEditRequest: (data: EditRequest) => void;
};
