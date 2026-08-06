import { fetchMountTimeMinMax, fetchTimeMinMax } from '@/api/repository/machiot';
import { convertDashboardMinMaxRows } from './dashboardBlockColumns';
import { getTimeMinMaxFetchTarget, shouldFetchBlockTimeMinMax } from './dashboardTimeMinMax';

interface BaseMinMaxFetchers {
    /** Tag/log/view min-max for a block. */
    fetchTimeMinMax: (aTarget: any) => Promise<any>;
    /** The same, for a mounted database (`db.user.table`). */
    fetchMountTimeMinMax: (aBlock: any) => Promise<any>;
}

/**
 * Builds the "full data extent of a block's base column" reader over a given pair of transports.
 *
 * The *logic* is one thing — which query shape a block needs, when it is worth asking at all, how the
 * rows convert — but the transport is not: the editor talks to `/web/api/query` with the session's
 * bearer token, while the public dashboard is unauthenticated and goes to `/db/query`. A public board
 * that borrowed the editor's fetcher got a 401 and no extent, which on a distance axis means the
 * `first`/`last` edges cannot be resolved and the panel silently falls back to the whole range.
 */
export const createBlockBaseMinMaxFetcher =
    ({ fetchTimeMinMax: aFetchTimeMinMax, fetchMountTimeMinMax: aFetchMountTimeMinMax }: BaseMinMaxFetchers) =>
    async (aBlock: any): Promise<{ min: number; max: number } | undefined> => {
        if (!aBlock?.table) return undefined;

        const sCustomTag =
            aBlock.tag &&
            aBlock.filter?.filter((aFilter: any) => {
                if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
            })[0]?.value;

        if (!shouldFetchBlockTimeMinMax(aBlock, sCustomTag)) return undefined;

        let sSvrResult: any;
        if (String(aBlock.table).split('.').length > 2) {
            sSvrResult = await aFetchMountTimeMinMax(aBlock);
        } else {
            sSvrResult = await aFetchTimeMinMax(getTimeMinMaxFetchTarget(aBlock, sCustomTag));
        }
        if (sSvrResult?.[0]?.[0] == null) return undefined;

        const sResult = convertDashboardMinMaxRows(sSvrResult, aBlock);
        if (!sResult || !Number.isFinite(sResult.min) || !Number.isFinite(sResult.max)) return undefined;
        return sResult;
    };

/**
 * Fetches the full data extent (MIN/MAX) of a dashboard block's base column.
 * For a distance (numeric base) block this is [first, last] in the column's own unit;
 * for a datetime block it is the time min/max in ms. Returns undefined when unavailable.
 *
 * Mirrors the fetch performed inline by the dashboard header, extracted so the range modal
 * can obtain the distance slider bounds without depending on the board component.
 *
 * The editor's transport. The public dashboard has its own — see
 * `src/public-dashboard/utils/dashboardBaseMinMax.ts`.
 */
export const fetchBlockBaseMinMax = createBlockBaseMinMaxFetcher({ fetchTimeMinMax, fetchMountTimeMinMax });
