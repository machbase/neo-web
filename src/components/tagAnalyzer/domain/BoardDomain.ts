import type { PanelConfig } from './panel/PanelConfig';
import type {
    IntervalOption,
    TimeRangeInput,
    TimeRangeMs,
} from './time/TimeTypes';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelConfig[];
    boardTimeRange: TimeRangeInput;
    savedCode: string | false;
    // Opaque .taz format version this board was loaded from; persistence owns
    // the TazVersion enum and how to interpret this string.
    version: string;
};

export type GlobalTimeRangeState = {
    data: TimeRangeMs;
    navigator: TimeRangeMs;
    interval: IntervalOption;
};
