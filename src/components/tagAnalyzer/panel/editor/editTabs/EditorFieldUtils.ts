import type {
    PanelAxes,
    PanelDisplay,
    PanelYAxis,
} from '../../../domain/panel/PanelConfig';

type PanelSampling = PanelDisplay['mainChartSampling'];

// Shared pure helpers for the editor tabs: classnames, input parsing, and field
// validation. Kept separate from the UI controls in EditorControls.tsx.

export function cx(
    ...classes: Array<string | false | undefined>
): string | undefined {
    return classes.filter(Boolean).join(' ') || undefined;
}

export function parseEditorNumber(value: string): number | undefined {
    return value === '' ? undefined : Number(value);
}

// --- field validation --------------------------------------------------------

function isMissingFiniteNumber(value: number | undefined): boolean {
    return value === undefined || !Number.isFinite(value);
}

// Per-field predicates used by the tabs to flag an individual input as invalid.
export function isInvalidSamplingValue(value: number | undefined): boolean {
    return isMissingFiniteNumber(value);
}

export function isInvalidPixelsPerTickValue(value: number | undefined): boolean {
    return value === undefined || !Number.isFinite(value) || value <= 0;
}

export function isAxisRangeInvalid(range: PanelYAxis['valueRange']): boolean {
    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;

    if (!sHasMin && !sHasMax) {
        return false;
    }

    if (!sHasMin || !sHasMax) {
        return true;
    }

    return !Number.isFinite(sMin) || !Number.isFinite(sMax) || sMin >= sMax;
}

function isInvalidSampling(sampling: PanelSampling): boolean {
    return sampling.enabled && isInvalidSamplingValue(sampling.sampleCount);
}

function isInvalidThreshold(
    threshold: PanelYAxis['upperControlLimit'],
): boolean {
    return threshold.enabled && isMissingFiniteNumber(threshold.value);
}

function isInvalidYAxis(axis: PanelYAxis): boolean {
    return (
        isAxisRangeInvalid(axis.valueRange) ||
        isAxisRangeInvalid(axis.rawValueRange) ||
        isInvalidThreshold(axis.upperControlLimit) ||
        isInvalidThreshold(axis.lowerControlLimit)
    );
}

// Single structural validity check for the whole editor (sampling, pixels-per-tick
// and both y-axes). The right axis is only checked when it is enabled.
export function hasInvalidEditorStructure(
    axes: PanelAxes,
    display: PanelDisplay,
): boolean {
    return (
        isInvalidSampling(display.mainChartSampling) ||
        isInvalidSampling(display.rawNavigatorSampling) ||
        isInvalidPixelsPerTickValue(display.pixelsPerTick.calculated) ||
        isInvalidPixelsPerTickValue(display.pixelsPerTick.calculatedNavigator) ||
        isInvalidPixelsPerTickValue(display.pixelsPerTick.raw) ||
        isInvalidYAxis(axes.leftY) ||
        (axes.rightY.enabled && isInvalidYAxis(axes.rightY))
    );
}
