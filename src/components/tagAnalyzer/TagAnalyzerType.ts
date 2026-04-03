import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type {
    TagAnalyzerBgnEndTimeRange,
    TagAnalyzerFlatPanelInfo,
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerOverlapPanelInfo,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from './panel/TagAnalyzerPanelTypes';

export type TagAnalyzerBoardSourceInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerFlatPanelInfo[];
};

export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerPanelInfo[];
};

export type TagAnalyzerPanelChangeType = 'delete' | 'changed';

export type TagAnalyzerChartInfoPayload = {
    startTime: number;
    endTime: number;
    panelInfo: TagAnalyzerPanelInfo;
    isRaw: boolean;
    changeType?: TagAnalyzerPanelChangeType;
};

export type TagAnalyzerGetChartInfoHandler = (
    aStart: number,
    aEnd: number,
    aBoard: TagAnalyzerPanelInfo,
    aIsRaw: boolean,
    aIsChanged?: TagAnalyzerPanelChangeType,
) => void;

export type TagAnalyzerSaveKeepDataHandler = (
    aTargetPanel: string,
    aTimeInfo: TagAnalyzerPanelTimeKeeper,
    aRaw: boolean,
) => void;

export type TagAnalyzerSetGlobalTimeRangeHandler = (
    aDataTime: TagAnalyzerTimeRange,
    aNavigatorTime: TagAnalyzerTimeRange,
    aInterval: TagAnalyzerGlobalTimeRangeState['interval'],
) => void;

export type TagAnalyzerRefreshTimeHandler = (
    aStart?: TagAnalyzerRangeValue,
    aEnd?: TagAnalyzerRangeValue,
) => Promise<void>;

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
    globalTimeRange: TagAnalyzerGlobalTimeRangeState;
};

export type TagAnalyzerBoardPanelActions = {
    onOverlapSelectionChange: TagAnalyzerGetChartInfoHandler;
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
