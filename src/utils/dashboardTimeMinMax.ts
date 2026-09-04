import { isNumericBaseTimeBlock } from './timeFieldColumns';
import { isMountedTableName } from './qualifiedTableName';
import { isTaglessTableType } from './dashboardTableKind';

/**
 * Blocks whose time extent has to be read by scanning the table itself.
 *
 * A tag block asks `V$<TABLE>_STAT` for its extent, which is a single indexed row. view and
 * transaction have no such view — measured, `V$DEMO_VIEW_STAT` does not exist — so the extent
 * comes from `min()/max()` over the block's own time column instead. That is what
 * `createTableScanTimeMinMaxQuery` builds.
 *
 * The `time` guard is what makes this safe: a block with no resolved time column would otherwise
 * produce `select min(), max()`. Such a block answers `false` here and falls back to the board
 * range, which is the existing behaviour for a view whose source tag table had a distance base —
 * a known gap, tracked separately.
 */
export const isTableScanTimeMinMaxTarget = (aBlock: any) => Boolean(isTaglessTableType(aBlock?.type) && aBlock?.time && aBlock.time !== '');

/**
 * Pick the panel that seeds the board-level time min/max. Distance (numeric-base) panels self-resolve
 * their range from dashboard.distanceRange inside LineChart, so the single board-level time min/max
 * must come from a TIME (datetime-base) panel — otherwise a distance-first mixed board leaks the
 * distance column's numeric extent into every time panel's WHERE. Picks the first non-Tql panel that
 * has a blockList and whose base is NOT distance; falls back to the first non-Tql panel with a
 * blockList (pure-distance / tql-only boards, where the returned value is unused).
 */
export const pickBoardTimeMinMaxPanel = (aPanels: any[] = []): any => {
    const sCandidates = (aPanels ?? []).filter((aPanel: any) => aPanel?.type !== 'Tql chart' && aPanel?.blockList?.length);
    return sCandidates.find((aPanel: any) => !isNumericBaseTimeBlock(aPanel.blockList?.[0])) ?? sCandidates[0];
};

export const shouldFetchBlockTimeMinMax = (aBlock: any, aCustomTag?: string) => {
    const sHasTag = aBlock?.tag && aBlock.tag !== '';
    return Boolean(isTableScanTimeMinMaxTarget(aBlock) || sHasTag || (aBlock?.useCustom && aCustomTag));
};

export const getTimeMinMaxFetchTarget = (aBlock: any, aCustomTag?: string) => {
    if (isTableScanTimeMinMaxTarget(aBlock)) return aBlock;
    return aBlock?.useCustom ? { ...aBlock, tag: aCustomTag } : aBlock;
};

interface BlockTimeMinMaxDeps {
    /** Settles the catalogue that `isMountedTableName` reads. */
    ensureCurrentDatabase: () => Promise<unknown>;
    /** Tag/log/view/transaction min-max for a block. */
    fetchTimeMinMax: (aTarget: any) => Promise<any>;
    /** The same, for a table in a mounted database (`db.user.table`). */
    fetchMountTimeMinMax: (aBlock: any) => Promise<any>;
}

/**
 * "Where do I read this block's time extent from?" — one place, over a given pair of transports.
 *
 * Ten call sites used to answer this inline, and every one of them got the ordering wrong in the
 * same way: `isMountedTableName` reads the catalogue synchronously, but the catalogue is filled by
 * an async probe, so a caller that had not awaited it saw an empty list and read *every* table as
 * unmounted. `/view/*` hits that deterministically — its mount effect goes straight from the .dsh
 * file to the board's time range without touching a repository function, so on first paint a
 * mounted table takes the ordinary min/max query and gets nothing back.
 *
 * Awaiting here rather than at each caller means the requirement cannot be forgotten by the next
 * site that needs this, and the promise is the shared memoised one, so the await is free after the
 * first. Transports stay injected for the reason `createBlockBaseMinMaxFetcher` does it: the
 * public dashboard is unauthenticated and speaks to different endpoints than the editor.
 */
export const createBlockTimeMinMaxFetcher =
    ({ ensureCurrentDatabase: aEnsure, fetchTimeMinMax: aFetch, fetchMountTimeMinMax: aFetchMount }: BlockTimeMinMaxDeps) =>
    async (aBlock: any, aCustomTag?: string): Promise<any> => {
        await aEnsure();
        if (isMountedTableName(aBlock?.table)) return aFetchMount(aBlock);
        return aFetch(getTimeMinMaxFetchTarget(aBlock, aCustomTag));
    };

export const getPanelTimeMinMaxTarget = (aCurrentPanel: any, aFallbackPanels: any[] = [], aPanelId?: string) => {
    if (aCurrentPanel?.blockList?.length) return aCurrentPanel;
    if (aPanelId) return aFallbackPanels.find((aPanel: any) => aPanel.id === aPanelId);
    return aFallbackPanels.find((aPanel: any) => aPanel.type !== 'Tql chart');
};

export const hasResolvedTimeRange = (aStart: any, aEnd: any) => {
    if (aStart === undefined || aStart === null || aEnd === undefined || aEnd === null) return false;
    return !Number.isNaN(Number(aStart)) && !Number.isNaN(Number(aEnd));
};

const combineTableUser = (aTargetInfo: any) => {
    if (!aTargetInfo?.table) return '';
    return aTargetInfo.table.includes('.') ? aTargetInfo.table : `${aTargetInfo.userName}.${aTargetInfo.table}`;
};

export const createTableScanTimeMinMaxQuery = (aTargetInfo: any) => {
    if (!isTableScanTimeMinMaxTarget(aTargetInfo)) return undefined;
    const sTime = aTargetInfo.time;
    return `select min(${sTime}) as min_time, max(${sTime}) as max_time from ${combineTableUser(aTargetInfo)}`;
};

export const createLogTimeMinMaxQuery = (aTargetInfo: any) => {
    if (!aTargetInfo?.time) return undefined;
    const sTime = aTargetInfo.time;
    return `select min(${sTime}) as min_time, max(${sTime}) as max_time from ${combineTableUser(aTargetInfo)}`;
};
