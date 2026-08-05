import { fetchMountTimeMinMax, fetchTimeMinMax } from '@/api/repository/machiot';
import { convertDashboardMinMaxRows } from './dashboardBlockColumns';
import { getTimeMinMaxFetchTarget, shouldFetchBlockTimeMinMax } from './dashboardTimeMinMax';

/**
 * Fetches the full data extent (MIN/MAX) of a dashboard block's base column.
 * For a distance (numeric base) block this is [first, last] in the column's own unit;
 * for a datetime block it is the time min/max in ms. Returns undefined when unavailable.
 *
 * Mirrors the fetch performed inline by the dashboard header, extracted so the range modal
 * can obtain the distance slider bounds without depending on the board component.
 */
export const fetchBlockBaseMinMax = async (aBlock: any): Promise<{ min: number; max: number } | undefined> => {
    if (!aBlock?.table) return undefined;

    const sCustomTag =
        aBlock.tag &&
        aBlock.filter?.filter((aFilter: any) => {
            if (aFilter.column === 'NAME' && (aFilter.operator === '=' || aFilter.operator === 'in') && aFilter.value && aFilter.value !== '') return aFilter;
        })[0]?.value;

    if (!shouldFetchBlockTimeMinMax(aBlock, sCustomTag)) return undefined;

    let sSvrResult: any;
    if (String(aBlock.table).split('.').length > 2) {
        sSvrResult = await fetchMountTimeMinMax(aBlock);
    } else {
        sSvrResult = await fetchTimeMinMax(getTimeMinMaxFetchTarget(aBlock, sCustomTag));
    }
    if (sSvrResult?.[0]?.[0] == null) return undefined;

    const sResult = convertDashboardMinMaxRows(sSvrResult, aBlock);
    if (!sResult || !Number.isFinite(sResult.min) || !Number.isFinite(sResult.max)) return undefined;
    return sResult;
};
