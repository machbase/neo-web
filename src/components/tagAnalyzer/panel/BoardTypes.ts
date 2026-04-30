import type {
    OverlapPanelInfo,
    OverlapSelectionChangePayload,
} from '../boardModal/OverlapTypes';
import type { PanelInfo } from '../utils/panelModelTypes';
import type {
    FetchedTimeBoundaryRange,
    IntervalOption,
    PanelNavigatorRangePair,
    ResolvedTimeRangeMs,
    TimeRangeConfig,
} from '../time/TimeTypes';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelInfo[];
    boardTimeRange: TimeRangeConfig;
    savedCode: string | false;
    version?: string;
};

export type BoardContext = {
    id: string;
    time: TimeRangeConfig;
};

export type GlobalTimeRangeState = {
    data: ResolvedTimeRangeMs;
    navigator: ResolvedTimeRangeMs;
    interval: IntervalOption;
};

export type DeletePanelPayload = {
    panelKey: string;
};

export type PersistPanelStatePayload = {
    targetPanelKey: string;
    timeInfo: PanelNavigatorRangePair;
    isRaw: boolean;
};

export type SetGlobalTimeRangePayload = {
    dataTime: ResolvedTimeRangeMs;
    navigatorTime: ResolvedTimeRangeMs;
    interval: IntervalOption;
};

export type BoardPanelState = {
    refreshCount: number;
    overlapPanels: OverlapPanelInfo[];
    timeBoundaryRanges: FetchedTimeBoundaryRange | null;
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
};

export type BoardChartActions = Pick<
    BoardPanelActions,
    'onPersistPanelState' | 'onSavePanel' | 'onSetGlobalTimeRange'
>;

