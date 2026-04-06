import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerFlatPanelInfo,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerTimeRange,
} from './panel/TagAnalyzerPanelModelTypes';

export type TagAnalyzerBoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerFlatPanelInfo[];
};

export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerPanelInfo[];
};

export type TagAnalyzerPanelChangeType = 'delete' | 'changed';

export type TagAnalyzerEditRequest = {
    pPanelInfo: TagAnalyzerPanelInfo;
    pBoardInfo: TagAnalyzerBoardInfo;
    pNavigatorRange: TagAnalyzerTimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

export type TagAnalyzerBoardPanelState = {
    refreshCount: number;
    overlapPanels: TagAnalyzerOverlapPanelInfo[];
    bgnEndTimeRange: Partial<TagAnalyzerBgnEndTimeRange> | undefined;
    globalTimeRange: TagAnalyzerGlobalTimeRangeState | null;
};

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
        aDataTime: TagAnalyzerTimeRange,
        aNavigatorTime: TagAnalyzerTimeRange,
        aInterval: TagAnalyzerGlobalTimeRangeState['interval'],
    ) => void;
    onOpenEditRequest: (data: TagAnalyzerEditRequest) => void;
};
