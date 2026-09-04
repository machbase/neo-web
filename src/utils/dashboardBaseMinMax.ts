import { fetchBlockTimeMinMax } from '@/api/repository/machiot';
import { convertDashboardMinMaxRows } from './dashboardBlockColumns';
import { shouldFetchBlockTimeMinMax } from './dashboardTimeMinMax';

/** Reads a block's raw time extent, mounted or not. See `createBlockTimeMinMaxFetcher`. */
type BlockTimeMinMaxFetcher = (aBlock: any, aCustomTag?: string) => Promise<any>;

/**
 * Builds the "full data extent of a block's base column" reader over a given transport.
 *
 * The *logic* is one thing — when it is worth asking at all, how the rows convert — but the
 * transport is not: the editor talks to `/web/api/query` with the session's bearer token, while
 * the public dashboard is unauthenticated and goes to `/db/query`. A public board that borrowed
 * the editor's fetcher got a 401 and no extent, which on a distance axis means the `first`/`last`
 * edges cannot be resolved and the panel silently falls back to the whole range.
 *
 * Choosing between the ordinary and the mounted query — and awaiting the catalogue that decision
 * needs — is the injected fetcher's job, so this function no longer has to know about either.
 */
export const createBlockBaseMinMaxFetcher =
    (aFetchBlockTimeMinMax: BlockTimeMinMaxFetcher) =>
    async (aBlock: any): Promise<{ min: number; max: number } | undefined> => {
        if (!aBlock?.table) return undefined;

        const sCustomTag =
            aBlock.tag &&
            aBlock.filter?.filter((aFilter: any) => {
                if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
            })[0]?.value;

        if (!shouldFetchBlockTimeMinMax(aBlock, sCustomTag)) return undefined;

        const sSvrResult = await aFetchBlockTimeMinMax(aBlock, sCustomTag);
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
export const fetchBlockBaseMinMax = createBlockBaseMinMaxFetcher(fetchBlockTimeMinMax);
