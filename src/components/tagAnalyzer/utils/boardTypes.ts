import type { Dispatch, SetStateAction } from 'react';
import type { GBoardListType } from '@/recoil/recoil';
import type { ValueRange, ValueRangePair } from '../TagAnalyzerCommonTypes';
import type { PanelInfo } from './panelModelTypes';
import type {
    IntervalOption,
    ResolvedTimeBounds,
    TimeRangeMs,
    TimeRangeConfig,
    TimeRangePair,
} from './time/types/TimeTypes';

export type BoardInfo = Omit<
    GBoardListType,
    'code' | 'panels' | 'range_bgn' | 'range_end' | 'savedCode'
> & {
    code: unknown;
    panels: PanelInfo[];
    range: ValueRange;
    rangeConfig: TimeRangeConfig;
    savedCode: string | false;
    version?: string;
};

export type BoardContext = {
    id: string;
    time: ResolvedTimeBounds;
};

export type PanelChangeType = 'delete' | 'changed';

export type EditRequest = {
    pPanelInfo: PanelInfo;
    pNavigatorRange: TimeRangeMs;
    pSetSaveEditedInfo: Dispatch<SetStateAction<boolean>>;
};

export type GlobalTimeRangeState = {
    data: TimeRangeMs;
    navigator: TimeRangeMs;
    interval: IntervalOption;
};

export type OverlapPanelInfo = {
    start: number;
    duration: number;
    isRaw: boolean;
    board: PanelInfo;
};

export type OverlapShiftDirection = '+' | '-';

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
    dataTime: TimeRangeMs;
    navigatorTime: TimeRangeMs;
    interval: IntervalOption;
};

export type BoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    timeBoundaryRanges: ValueRangePair | null;
    globalTimeRange: GlobalTimeRangeState | undefined;
};

export type BoardChartState = Pick<
    BoardPanelState,
    'refreshCount' | 'timeBoundaryRanges' | 'globalTimeRange'
>;

export type BoardPanelActions = {
    onOverlapSelectionChange: (payload: OverlapSelectionChangePayload) => void;
    onDeletePanel: (payload: DeletePanelPayload) => void;
    onPersistPanelState: (payload: PersistPanelStatePayload) => void;
    onSavePanel: (panelInfo: PanelInfo) => void;
    onSetGlobalTimeRange: (payload: SetGlobalTimeRangePayload) => void;
    onOpenEditRequest: (request: EditRequest) => void;
};

export type BoardChartActions = Pick<
    BoardPanelActions,
    'onPersistPanelState' | 'onSavePanel' | 'onSetGlobalTimeRange' | 'onOpenEditRequest'
>;
