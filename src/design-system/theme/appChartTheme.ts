import { currentScheme } from './theme';
import { resolveCssColor } from './resolveColor';

/** The TQL `CHART` theme and background for a chart the app draws itself (not one a user wrote). */
export type AppChartTheme = { theme: 'dark' | 'white'; background: string; text: string };

/** The dark screen's: ECharts' "dark" theme on the panel colour. */
export const DARK_APP_CHART: AppChartTheme = { theme: 'dark', background: '#252525', text: '#ffffff' };

/**
 * The grid and axis lines of a chart the app draws on the page: a small step from the page's colour
 * toward its text, as faint under every theme as on the dark screen (about 1.2:1 against the chart).
 * Not the theme's Borders: those are made to be seen, and across a chart they outweigh the data.
 * With no theme both colours fall back to the dark screen's line, so the mix is that line.
 */
export const APP_CHART_LINE = 'color-mix(in srgb, var(--neo-text-primary, #323333) 10%, var(--neo-bg-secondary, #323333))';

/**
 * The app chart look under the current theme: ECharts' "white" under a light-scheme theme, "dark"
 * otherwise, on the editors' surface (bg-secondary) — so with no theme it is `DARK_APP_CHART`.
 * Resolved to colours: the server renders the chart and cannot read CSS variables. A chart a
 * user wrote (a TQL file, a dashboard panel) keeps its own theme.
 */
export const appChartTheme = (): AppChartTheme => ({
    theme: currentScheme() === 'light' ? 'white' : 'dark',
    background: resolveCssColor('var(--neo-bg-secondary, #252525)', '#252525'),
    text: resolveCssColor('var(--neo-text-primary, #f1f1f1)', '#ffffff'),
});
