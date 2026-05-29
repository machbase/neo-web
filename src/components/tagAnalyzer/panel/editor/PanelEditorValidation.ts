import type {
    PanelEditorConfig,
    PanelYAxisDraft,
} from './EditorTypes';

type AxisRangeDraft = PanelYAxisDraft['value_range'];

export function isAxisRangeInvalid(range: AxisRangeDraft): boolean {
    const sMin = range.min;
    const sMax = range.max;
    const sHasMin = sMin !== undefined;
    const sHasMax = sMax !== undefined;
    const sIsAutoRange =
        (!sHasMin && !sHasMax) ||
        (range.min === 0 && range.max === 0);

    if (sIsAutoRange) {
        return false;
    }

    if (!sHasMin || !sHasMax) {
        return true;
    }

    return (
        !Number.isFinite(sMin) ||
        !Number.isFinite(sMax) ||
        sMin >= sMax
    );
}

function hasInvalidYAxisRange(axisConfig: PanelYAxisDraft): boolean {
    return (
        isAxisRangeInvalid(axisConfig.value_range) ||
        isAxisRangeInvalid(axisConfig.raw_data_value_range) ||
        isInvalidThreshold(axisConfig.upper_control_limit) ||
        isInvalidThreshold(axisConfig.lower_control_limit)
    );
}

function isInvalidThreshold(
    threshold: PanelYAxisDraft['upper_control_limit'],
): boolean {
    return (
        threshold.enabled &&
        (
            threshold.value === undefined ||
            !Number.isFinite(threshold.value)
        )
    );
}

function isInvalidSampling(
    sampling: PanelEditorConfig['axes']['sampling'],
): boolean {
    return (
        sampling.enabled &&
        (
            sampling.sample_count === undefined ||
            !Number.isFinite(sampling.sample_count)
        )
    );
}

export function hasInvalidPanelEditorAxisRange(
    editorConfig: PanelEditorConfig,
): boolean {
    return (
        isInvalidSampling(editorConfig.axes.sampling) ||
        isInvalidSampling(editorConfig.axes.main_chart_sampling) ||
        hasInvalidYAxisRange(editorConfig.axes.left_y_axis) ||
        (
            editorConfig.axes.right_y_axis_enabled &&
            hasInvalidYAxisRange(editorConfig.axes.right_y_axis)
        )
    );
}
