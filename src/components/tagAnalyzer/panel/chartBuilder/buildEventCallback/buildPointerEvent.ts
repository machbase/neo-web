import type { PanelChartAxisPointerPayload } from '../PanelChartRuntimeTypes';
import type {
    ChartPointerEvents,
} from './eventCallbackTypes';
import { getPanelChartAxisPointerTimestamp } from '../ChartPointerUtils';
import type { MutableRefObject } from 'react';

export function buildPointerEvent({
    latestHoverTimestampRef,
}: {
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
}): ChartPointerEvents {
    return {
        updateAxisPointer: (params: PanelChartAxisPointerPayload) => {
            latestHoverTimestampRef.current =
                getPanelChartAxisPointerTimestamp(params);
        },
        globalout: () => {
            latestHoverTimestampRef.current = undefined;
        },
    };
}
