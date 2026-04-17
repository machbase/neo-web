import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { TagAnalyzerFlatPanelInfo } from './utils/TagAnalyzerPanelInfoConversion';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerDefaultRange,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerIntervalOption,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerTimeRangeConfig,
    TimeRange,
} from './panel/PanelModel';

// Used by TagAnalyzer workspace and board flows to type board source info.
export type TagAnalyzerBoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerFlatPanelInfo[];
};

// Used by TagAnalyzer workspace and board flows to type board info.
export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels' | 'range_bgn' | 'range_end'> & {
    panels: TagAnalyzerPanelInfo[];
    range: TagAnalyzerDefaultRange;
    rangeConfig: TagAnalyzerTimeRangeConfig;
};

// Used by TagAnalyzer workspace and board flows to type board context.
export type TagAnalyzerBoardContext = {
    id: string;
    range: TagAnalyzerDefaultRange;
    rangeConfig: TagAnalyzerTimeRangeConfig;
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
    globalTimeRange: TagAnalyzerGlobalTimeRangeState | undefined;
};

// Used by TagAnalyzer workspace and board flows to type board panel actions.
export type BoardPanelActions = {
    onOverlapSelectionChange: (
        aStart: number,
        aEnd: number,
        aBoard: TagAnalyzerPanelInfo,
        aIsRaw: boolean,
        aIsChanged: TagAnalyzerPanelChangeType | undefined,
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
        aInterval: TagAnalyzerIntervalOption,
    ) => void;
    onOpenEditRequest: (data: TagAnalyzerEditRequest) => void;
};
