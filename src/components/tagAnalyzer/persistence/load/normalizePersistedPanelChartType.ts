import {
    PANEL_ECHART_TYPE_VALUES,
    type PanelEChartType,
} from '../../domain/panel/PanelInfo';

const DEFAULT_PERSISTED_PANEL_ECHART_TYPE: PanelEChartType = 'Line';

function isPersistedPanelEChartType(value: unknown): value is PanelEChartType {
    return (
        typeof value === 'string' &&
        (PANEL_ECHART_TYPE_VALUES as readonly string[]).includes(value)
    );
}

export function normalizePersistedPanelChartType(
    value: unknown,
): PanelEChartType {
    return isPersistedPanelEChartType(value)
        ? value
        : DEFAULT_PERSISTED_PANEL_ECHART_TYPE;
}
