import type { PanelInfo } from '../../domain/panel/PanelInfo';
import type { TimeRangeMs } from '../../domain/time/TimeTypes';

export type OverlapPanelInfo = {
    panelKey: string;
    runtimeRange: TimeRangeMs;
    panelInfo: PanelInfo;
};
