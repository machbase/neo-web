import { resolveEchartsColor } from '@/design-system/theme';
import { DATA_VIEWER_CHART_PALETTE, type DataViewerChartPalette } from './dataViewerModel';

/**
 * The chart's colours under the current theme: each one a token, with the dark panel's colour as its
 * fallback — so with no theme loaded this is `DATA_VIEWER_CHART_PALETTE` itself. ECharts takes colour
 * values, not `var()`; call again when the theme changes (`useThemeVersion`).
 */
const TOKENS: Record<keyof DataViewerChartPalette, string> = {
    background: 'var(--neo-bg-secondary, #252525)',
    axisLine: 'var(--neo-border-color-default, #323333)',
    axisLabel: 'var(--neo-text-primary, #f8f8f8)',
    axisLabelMuted: 'var(--neo-text-secondary, #afb5bc)',
    legendText: 'var(--neo-text-primary, #e7e8ea)',
    legendPagerInactive: 'var(--neo-text-disabled, #61646b)',
    tooltipBackground: 'var(--neo-tooltip-bg, #1f1d1d)',
    tooltipBorder: 'var(--neo-tooltip-border, #292929)',
    tooltipText: 'var(--neo-tooltip-text, #afb5bc)',
    navigatorBorder: 'var(--neo-border-color-medium, #7a828c)',
    navigatorFiller: 'color-mix(in srgb, var(--neo-primary-light, rgb(104, 119, 138)) 28%, transparent)',
    navigatorHandle: 'color-mix(in srgb, var(--neo-bg-elevated, rgb(245, 247, 250)) 78%, transparent)',
    navigatorHandleBorder: 'var(--neo-border-color-medium, #8a939e)',
    navigatorMoveHandle: 'color-mix(in srgb, var(--neo-bg-elevated, rgb(245, 247, 250)) 32%, transparent)',
};

export const resolveDataViewerChartPalette = (): DataViewerChartPalette =>
    Object.fromEntries(
        (Object.keys(TOKENS) as Array<keyof DataViewerChartPalette>).map((aKey) => [aKey, resolveEchartsColor(TOKENS[aKey], DATA_VIEWER_CHART_PALETTE[aKey])]),
    ) as DataViewerChartPalette;
