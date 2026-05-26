import type {
    PanelEditorConfig,
    PanelYAxisDraft,
} from './EditorTypes';

type AxisRangeDraft = PanelYAxisDraft['value_range'];

export function isAxisRangeInvalid(range: AxisRangeDraft): boolean {
    const sIsAutoRange = range.min === 0 && range.max === 0;

    return (
        !sIsAutoRange &&
        range.min !== '' &&
        range.max !== '' &&
        range.min >= range.max
    );
}

function hasInvalidYAxisRange(axisConfig: PanelYAxisDraft): boolean {
    return (
        isAxisRangeInvalid(axisConfig.value_range) ||
        isAxisRangeInvalid(axisConfig.raw_data_value_range)
    );
}

export function hasInvalidPanelEditorAxisRange(
    editorConfig: PanelEditorConfig,
): boolean {
    return (
        hasInvalidYAxisRange(editorConfig.axes.left_y_axis) ||
        (
            editorConfig.axes.right_y_axis_enabled &&
            hasInvalidYAxisRange(editorConfig.axes.right_y_axis)
        )
    );
}
