import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerFlatPanelInfo,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TimeRange,
} from './panel/TagAnalyzerPanelModelTypes';

// Used by TagAnalyzer workspace and board flows to type board source info.
export type TagAnalyzerBoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerFlatPanelInfo[];
};

// Used by TagAnalyzer workspace and board flows to type board info.
export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerPanelInfo[];
};

// Used by TagAnalyzer workspace and board flows to type board context.
export type TagAnalyzerBoardContext = {
    id: TagAnalyzerBoardInfo['id'];
    range_bgn: TagAnalyzerBoardInfo['range_bgn'];
    range_end: TagAnalyzerBoardInfo['range_end'];
};

// Used by TagAnalyzer workspace and board flows to type panel change type.
export type TagAnalyzerPanelChangeType = 'delete' | 'changed';

// Used by TagAnalyzer workspace and board flows to type edit request.
export type TagAnalyzerEditRequest = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pNavigatorRange: TimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

// Used by TagAnalyzer workspace and board flows to type board panel state.
export type TagAnalyzerBoardPanelState = {
    refreshCount: number;
    overlapPanels: TagAnalyzerOverlapPanelInfo[];
    bgnEndTimeRange: TagAnalyzerBgnEndTimeRange | undefined;
    globalTimeRange: TagAnalyzerGlobalTimeRangeState | null;
};

// Used by TagAnalyzer workspace and board flows to type board panel actions.
export type TagAnalyzerBoardPanelActions = {
    onOverlapSelectionChange: (
        aStart: number,
        aEnd: number,
        aBoard: TagAnalyzerPanelInfo,
        aIsRaw: boolean,
        aIsChanged?: TagAnalyzerPanelChangeType,
    ) => void;
    onDeletePanel: (aPanelKey: string) => void;
    onPersistPanelState: (
        aTargetPanel: string,
        aTimeInfo: TagAnalyzerPanelTimeKeeper,
        aRaw: boolean,
    ) => void;
    onSetGlobalTimeRange: (
        aDataTime: TimeRange,
        aNavigatorTime: TimeRange,
        aInterval: TagAnalyzerGlobalTimeRangeState['interval'],
    ) => void;
    onOpenEditRequest: (data: TagAnalyzerEditRequest) => void;
};
