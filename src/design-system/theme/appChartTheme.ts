import { currentScheme } from './theme';
import { resolveCssColor } from './resolveColor';

/** The TQL `CHART` theme and background for a chart the app draws itself (not one a user wrote). */
export type AppChartTheme = { theme: 'dark' | 'white'; background: string; text: string };

/** The dark screen's: ECharts' "dark" theme on the panel colour. */
export const DARK_APP_CHART: AppChartTheme = { theme: 'dark', background: '#252525', text: '#ffffff' };

/**
 * The app chart look under the current theme: ECharts' "white" under a light-scheme theme, "dark"
 * otherwise, on the editors' surface (bg-secondary) — so with no theme it is `DARK_APP_CHART`.
 * Resolved to colours: the server renders the chart and cannot read CSS variables. A chart a
 * user wrote (a TQL file, a dashboard panel) keeps its own theme.
 */
export const appChartTheme = (): AppChartTheme => ({
    theme: currentScheme() === 'light' ? 'white' : 'dark',
    background: resolveCssColor('var(--neo-bg-secondary, #252525)', '#252525'),
    text: resolveCssColor('var(--neo-text-primary, #ffffff)', '#ffffff'),
});
