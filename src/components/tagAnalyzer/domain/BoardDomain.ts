import type { PanelInfo } from './panel/PanelInfo';
import type {
    IntervalOption,
    PanelViewRange,
    TimeRangeInput,
} from './time/TimeTypes';

export type BoardInfo = {
    id: string;
    type: string;
    name: string;
    path: string;
    code: unknown;
    panels: PanelInfo[];
    boardTimeRange: TimeRangeInput;
    savedCode: string | false;
    // Opaque .taz format version this board was loaded from; persistence owns
    // the TazVersion enum and how to interpret this string.
    version: string;
};

export type GlobalTimeRangeState = PanelViewRange & {
    interval: IntervalOption;
};
