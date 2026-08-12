import {
    hasInvalidAxesSettings,
    hasInvalidDataSettings,
    hasInvalidDisplaySettings,
    type PanelAxes,
    type PanelDisplay,
    type PanelInfo,
} from '../../panelModel';
import {
    getSeriesListAxisKind,
    MIXED_X_AXIS_KIND_WARNING,
    type PanelSeriesDefinition,
} from '../../../seriesModel';
import { resolveRangeInput } from '../../../range/rangeInput';
import {
    isRangeExpressionEmpty,
    type AxisKind,
    type AxisRange,
    type RangeExpressionInput,
} from '../../../range/rangeModel';

export function validateGeneralTab(
    title: PanelInfo['title'],
): string | undefined {
    return title.trim() === '' ? 'Enter a panel title.' : undefined;
}

export function validateDataTab(
    tagSet: PanelSeriesDefinition[],
): string | undefined {
    if (tagSet.length === 0) return 'Add at least one series.';
    return getSeriesListAxisKind(tagSet) === undefined
        ? MIXED_X_AXIS_KIND_WARNING
        : undefined;
}

export function validateDataSettingTab(
    display: PanelDisplay,
): string | undefined {
    return hasInvalidDataSettings(display)
        ? 'Review the invalid data settings.'
        : undefined;
}

export function validateAxesTab(axes: PanelAxes): string | undefined {
    return hasInvalidAxesSettings(axes)
        ? 'Review the invalid axis settings.'
        : undefined;
}

export function validateDisplayTab(display: PanelDisplay): string | undefined {
    return hasInvalidDisplaySettings(display)
        ? 'Review the invalid display settings.'
        : undefined;
}

export function validateMainRangeTab(
    rangeInput: RangeExpressionInput,
    axisKind: AxisKind | undefined,
    dataRange: AxisRange,
    mainRange: AxisRange,
): string | undefined {
    if (
        axisKind === undefined ||
        isRangeExpressionEmpty(rangeInput) ||
        resolveRangeInput(rangeInput, axisKind, dataRange, mainRange) !== undefined
    ) {
        return undefined;
    }
    return 'Enter a valid range.';
}
