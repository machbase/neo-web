import {
    isValueRangeInvalid,
    type PanelInfo,
    type PanelYAxis,
} from '../panelModel';
import {
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
    X_AXIS_KIND_CHANGE_WARNING,
} from '../../seriesModel';
import { resolveRangeInput } from '../../range/rangeInput';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
} from '../../range/rangeModel';

export const PANEL_EDITOR_TABS = [
    'General',
    'Data',
    'Data Setting',
    'Axes',
    'Display',
    'Main Range',
] as const;
export type PanelEditorTab = (typeof PANEL_EDITOR_TABS)[number];

export function validatePanelEditorDraft(
    { title, query, axes, display, time }: PanelInfo,
    context: {
        lockedAxisKind: AxisKind | undefined;
        dataRange: AxisRange;
        mainRange: AxisRange;
        referenceTimeMs: number;
    },
): Record<PanelEditorTab, string | undefined> {
    const axisKind = getSeriesListAxisKind(query.tagSet);
    const dataMessage = query.tagSet.length === 0
        ? 'Add at least one series.'
        : !axisKind
          ? MIXED_X_AXIS_KIND_WARNING
          : context.lockedAxisKind && axisKind !== context.lockedAxisKind
            ? X_AXIS_KIND_CHANGE_WARNING
            : undefined;
    const validDensity = Object.values(display.pixelsPerTick).every(
        (value) => value === undefined || isValidPositiveNumber(value),
    );
    const validSampling = [display.mainChartSampling, display.rawNavigatorSampling].every(
        ({ enabled, sampleCount }) => !enabled || isValidPositiveNumber(sampleCount),
    );
    const validDisplay = [display.pointRadius, display.fill, display.stroke].every(
        (value) => value === undefined || Number.isFinite(value),
    );
    const validRange =
        !axisKind ||
        isRangeExpressionEmpty(time.rangeInput) ||
        resolveRangeInput(
            time.rangeInput,
            axisKind,
            context.dataRange,
            context.mainRange,
            context.referenceTimeMs,
        ) !== undefined;

    return {
        General: title.trim() ? undefined : 'Enter a panel title.',
        Data: dataMessage,
        'Data Setting': validDensity && validSampling
            ? undefined
            : 'Review the invalid data settings.',
        Axes: isYAxisValid(axes.leftY) && (!axes.rightY.enabled || isYAxisValid(axes.rightY))
            ? undefined
            : 'Review the invalid axis settings.',
        Display: validDisplay ? undefined : 'Review the invalid display settings.',
        'Main Range': validRange ? undefined : 'Enter a valid range.',
    };
}

export function isValidPositiveNumber(value: number | undefined): value is number {
    return value !== undefined && Number.isFinite(value) && value > 0;
}

// -------------------- Local --------------------

function isYAxisValid(axis: PanelYAxis): boolean {
    return (
        !isValueRangeInvalid(axis.valueRange) &&
        !isValueRangeInvalid(axis.rawValueRange) &&
        [axis.lowerControlLimit, axis.upperControlLimit].every(
            ({ enabled, value }) => !enabled || Number.isFinite(value),
        )
    );
}
