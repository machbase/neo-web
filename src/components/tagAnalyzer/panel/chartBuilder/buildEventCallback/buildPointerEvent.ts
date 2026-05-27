import type { PanelChartAxisPointerPayload } from '../PanelChartRuntimeTypes';
import type {
    ChartEvents,
} from './eventCallbackTypes';
import { getPanelChartAxisPointerTimestamp } from '../ChartPointerUtils';
import type { MutableRefObject } from 'react';

export function buildPointerEvent({
    latestHoverTimestampRef,
    isNumericXAxis,
}: {
    latestHoverTimestampRef: MutableRefObject<number | undefined>;
    isNumericXAxis: boolean;
}): Pick<ChartEvents, 'updateAxisPointer' | 'globalout'> {
    return {
        updateAxisPointer: (params: PanelChartAxisPointerPayload) => {
            latestHoverTimestampRef.current =
                getPanelChartAxisPointerTimestamp(params, isNumericXAxis);
        },
        globalout: () => {
            latestHoverTimestampRef.current = undefined;
        },
    };
}
