import { ChartTypeList } from './constants';
import { isFiniteNumber, isPlainObject } from '@/components/tagAnalyzer/objectGuards';

export function assertDashboardPanelObjects(panels: readonly unknown[] | undefined): void {
    panels?.forEach((panel, index) => {
        if (!isPlainObject(panel)) throw new Error(`Invalid dashboard panel at index ${index}: expected an object.`);
        // Built-in panels keep their existing repair path. Other panel settings stay opaque,
        // but their shared grid placement must be renderable without changing saved values.
        if (!isBuiltInDashboardPanel(panel) && (
            !['x', 'y', 'w', 'h'].every((key) => isFiniteNumber(panel[key])) ||
            (panel.w as number) <= 0 || (panel.h as number) <= 0
        )) throw new Error(`Invalid dashboard panel at index ${index}: expected a finite layout with positive width and height.`);
    });
}

export function isBuiltInDashboardPanel(panel: { type?: unknown } | null | undefined): boolean {
    return typeof panel?.type === 'string' && (panel.type === 'Tql' || ChartTypeList.some(({ key }) => key === panel.type));
}
