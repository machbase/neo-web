import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { TagAnalyzerFlatPanelInfo } from './utils/TagAnalyzerPanelInfoConversion';
import type {
    BgnEndTimeRange,
    ValueRange,
    GlobalTimeRangeState,
    IntervalOption,
    OverlapPanelInfo,
    PanelInfo,
    PanelTimeKeeper,
    TimeRangeConfig,
    TimeRange,
} from './common/CommonTypes';

// Used by TagAnalyzer workspace and board flows to type board source info.
export type TagAnalyzerBoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerFlatPanelInfo[];
};

// Used by TagAnalyzer workspace and board flows to type board info.
export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels' | 'range_bgn' | 'range_end'> & {
    panels: PanelInfo[];
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

// Used by TagAnalyzer workspace and board flows to type board context.
export type TagAnalyzerBoardContext = {
    id: string;
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

// Used by TagAnalyzer workspace and board flows to type panel change type.
export type TagAnalyzerPanelChangeType = 'delete' | 'changed';

// Used by TagAnalyzer workspace and board flows to type edit request.
export type TagAnalyzerEditRequest = {
    pPanelInfo: PanelInfo;
    pNavigatorRange: TimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

// Used by TagAnalyzer workspace and board flows to type board panel state.
export type TagAnalyzerBoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    bgnEndTimeRange: BgnEndTimeRange | undefined;
    globalTimeRange: GlobalTimeRangeState | undefined;
};

// Used by TagAnalyzer workspace and board flows to type board panel actions.
export type BoardPanelActions = {
    onOverlapSelectionChange: (
        aStart: number,
        aEnd: number,
        aBoard: PanelInfo,
        aIsRaw: boolean,
        aIsChanged: TagAnalyzerPanelChangeType | undefined,
    ) => void;
    onDeletePanel: (aPanelKey: string) => void;
    onPersistPanelState: (
        aTargetPanel: string,
        aTimeInfo: PanelTimeKeeper,
        aRaw: boolean,
    ) => void;
    onSetGlobalTimeRange: (
        aDataTime: TimeRange,
        aNavigatorTime: TimeRange,
        aInterval: IntervalOption,
    ) => void;
    onOpenEditRequest: (data: TagAnalyzerEditRequest) => void;
};
