import type {
    PanelAxes,
    PanelDisplay,
    PanelSampling,
    PanelYAxis,
} from '../../../panel/panelModel';

export function cx(
    ...classes: Array<string | false | undefined>
): string | undefined {
    return classes.filter(Boolean).join(' ') || undefined;
}

export function parseEditorNumber(value: string): number | undefined {
    return value === '' ? undefined : Number(value);
}

function isMissingFiniteNumber(value: number | undefined): boolean {
    return value === undefined || !Number.isFinite(value);
}

export function isValidPositiveEditorNumber(
    value: number | undefined,
): value is number {
    return value !== undefined && Number.isFinite(value) && value > 0;
}

export function isAxisRangeInvalid(range: PanelYAxis['valueRange']): boolean {
    const { min, max } = range;

    return min === undefined && max === undefined
        ? false
        : min === undefined ||
              max === undefined ||
              !Number.isFinite(min) ||
              !Number.isFinite(max) ||
              min >= max;
}

function isInvalidSampling(sampling: PanelSampling): boolean {
    return sampling.enabled &&
        !isValidPositiveEditorNumber(sampling.sampleCount);
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

export function hasInvalidEditorStructure(
    axes: PanelAxes,
    display: PanelDisplay,
): boolean {
    return (
        isInvalidSampling(display.mainChartSampling) ||
        isInvalidSampling(display.rawNavigatorSampling) ||
        Object.values(display.pixelsPerTick).some(
            (value) => !isValidPositiveEditorNumber(value),
        ) ||
        isInvalidYAxis(axes.leftY) ||
        (axes.rightY.enabled && isInvalidYAxis(axes.rightY))
    );
}
