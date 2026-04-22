import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { PanelInfo } from './panelModelTypes';
import type {
    IntervalOption,
    ResolvedTimeBounds,
    TimeRange,
    TimeRangeConfig,
    TimeRangePair,
    ValueRange,
    ValueRangePair,
} from './time/timeTypes';

export type BoardInfo = Omit<GBoardListType, 'panels' | 'range_bgn' | 'range_end'> & {
    panels: PanelInfo[];
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
};

export type BoardContext = {
    id: string;
    time: ResolvedTimeBounds;
};

export type PanelChangeType = 'delete' | 'changed';

export type EditRequest = {
    pPanelInfo: PanelInfo;
    pNavigatorRange: TimeRange;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

export type GlobalTimeRangeState = {
    data: TimeRange;
    navigator: TimeRange;
    interval: IntervalOption;
};

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

export type OverlapSelectionChangePayload = {
    start: number;
    end: number;
    panel: PanelInfo;
    isRaw: boolean;
    changeType: PanelChangeType | undefined;
};

export type DeletePanelPayload = {
    panelKey: string;
};

export type PersistPanelStatePayload = {
    targetPanelKey: string;
    timeInfo: TimeRangePair;
    isRaw: boolean;
};

export type SetGlobalTimeRangePayload = {
    dataTime: TimeRange;
    navigatorTime: TimeRange;
    interval: IntervalOption;
};

export type BoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    timeBoundaryRanges: ValueRangePair | undefined;
    globalTimeRange: GlobalTimeRangeState | undefined;
};

export type BoardChartState = Pick<
    BoardPanelState,
    'refreshCount' | 'timeBoundaryRanges' | 'globalTimeRange'
>;

export type BoardPanelActions = {
    onOverlapSelectionChange: (aPayload: OverlapSelectionChangePayload) => void;
    onDeletePanel: (aPayload: DeletePanelPayload) => void;
    onPersistPanelState: (aPayload: PersistPanelStatePayload) => void;
    onSavePanel: (aPanelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (aPayload: SetGlobalTimeRangePayload) => void;
    onOpenEditRequest: (aRequest: EditRequest) => void;
};

export type BoardChartActions = Pick<
    BoardPanelActions,
    'onPersistPanelState' | 'onSavePanel' | 'onSetGlobalTimeRange' | 'onOpenEditRequest'
>;
