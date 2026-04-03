import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type {
    TagAnalyzerGlobalTimeRangeState,
    TagAnalyzerPanelChangeType,
    TagAnalyzerPanelInfo,
    TagAnalyzerPanelTimeKeeper,
    TagAnalyzerRangeValue,
    TagAnalyzerTimeRange,
} from './TagAnalyzerPanelType';

export type TagAnalyzerModalSetter = Dispatch<SetStateAction<boolean>>;
export type TagAnalyzerSaveEditedInfoSetter = Dispatch<SetStateAction<boolean>>;

export type TagAnalyzerBoardInfo = Omit<GBoardListType, 'panels'> & {
    panels: TagAnalyzerPanelInfo[];
};

export type TagAnalyzerInfoProp = TagAnalyzerBoardInfo;
export type TagAnalyzerOnSaveProp = () => void;
export type TagAnalyzerSetIsSaveModalProp = TagAnalyzerModalSetter;
export type TagAnalyzerSetIsOpenModalProp = TagAnalyzerModalSetter;

export type TagAnalyzerChartBoardInfoProp = TagAnalyzerBoardInfo;
export type TagAnalyzerChartBoardOnSaveProp = () => void;
export type TagAnalyzerChartBoardOnOpenSaveModalProp = () => void;

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
    pSetSaveEditedInfo: TagAnalyzerSaveEditedInfoSetter;
};
