import type { IntervalOption } from '../time/TimeTypes';
import { TimeUnit } from '../time/TimeTypes';

type IntervalSpec = {
    type:
        | TimeUnit.Second
        | TimeUnit.Minute
        | TimeUnit.Hour
        | TimeUnit.Day;
    value: number;
};

const INTERVAL_RULES = [
    {
        limit: 60 * 60 * 12,
        buildIntervalSpec: (calc: number) => ({
            type: TimeUnit.Day,
            value: Math.ceil(calc / (60 * 60 * 24)),
        }),
    },
    {
        limit: 60 * 60 * 6,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 12,
        }),
    },
    {
        limit: 60 * 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 6,
        }),
    },
    {
        limit: 60 * 60,
        buildIntervalSpec: (calc: number) => ({
            type: TimeUnit.Hour,
            value: Math.ceil(calc / (60 * 60)),
        }),
    },
    {
        limit: 60 * 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Hour,
            value: 1,
        }),
    },
    {
        limit: 60 * 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 30,
        }),
    },
    {
        limit: 60 * 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 20,
        }),
    },
    {
        limit: 60 * 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 15,
        }),
    },
    {
        limit: 60 * 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 10,
        }),
    },
    {
        limit: 60 * 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 5,
        }),
    },
    {
        limit: 60,
        buildIntervalSpec: (calc: number) => ({
            type: TimeUnit.Minute,
            value: Math.ceil(calc / 60),
        }),
    },
    {
        limit: 30,
        buildIntervalSpec: () => ({
            type: TimeUnit.Minute,
            value: 1,
        }),
    },
    {
        limit: 20,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 30,
        }),
    },
    {
        limit: 15,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 20,
        }),
    },
    {
        limit: 10,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 15,
        }),
    },
    {
        limit: 5,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 10,
        }),
    },
    {
        limit: 3,
        buildIntervalSpec: () => ({
            type: TimeUnit.Second,
            value: 5,
        }),
    },
] satisfies Array<{
    limit: number;
    buildIntervalSpec: (calc: number) => IntervalSpec;
}>;

/**
 * Calculates the interval type and value for a chart time span.
 * Intent: Keep tick selection consistent across raw, navigator, and regular chart modes.
 * @param {number} startTime - The start timestamp of the visible range.
 * @param {number} endTime - The end timestamp of the visible range.
 * @param {number} width - The visible chart width in pixels.
 * @param {boolean} isRaw - Whether the chart is rendering raw values.
 * @param {number} pixelsPerTick - The standard pixels-per-tick value.
 * @param {number} pixelsPerTickRaw - The raw-mode pixels-per-tick value.
 * @param {boolean | undefined} isNavigator - Whether the chart is the navigator view.
 * @returns {IntervalOption} The resolved interval configuration for the chart.
 */
export function calculateInterval(
    startTime: number,
    endTime: number,
    width: number,
    isRaw: boolean,
    pixelsPerTick: number,
    pixelsPerTickRaw: number,
    isNavigator: boolean | undefined,
): IntervalOption {
    const sDiff = endTime - startTime;
    const sSeconds = Math.floor(sDiff / 1000);
    const sPixelsPerTick = isRaw && !isNavigator ? pixelsPerTickRaw : pixelsPerTick;
    const sCalc = sSeconds / (width / sPixelsPerTick);
    const sInterval = resolveIntervalSpec(sCalc);

    return {
        IntervalType: sInterval.type,
        IntervalValue: sInterval.value < 1 ? 1 : sInterval.value,
    };
}

/**
 * Selects the interval specification that best matches the requested scale.
 * Intent: Centralize the chart tick-resolution rules in one place.
 * @param {number} calc - The calculated seconds-per-tick estimate.
 * @returns {IntervalSpec} The interval specification to apply.
 */
function resolveIntervalSpec(calc: number): IntervalSpec {
    const sRule = INTERVAL_RULES.find(({ limit }) => calc > limit);
    if (sRule) {
        return sRule.buildIntervalSpec(calc);
    }

    return {
        type: TimeUnit.Second,
        value: Math.ceil(calc),
    };
}
