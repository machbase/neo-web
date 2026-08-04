import { isNumericBaseTimeBlock } from './timeFieldColumns';

export const isViewTimeMinMaxTarget = (aBlock: any) => Boolean(aBlock?.type === 'view' && aBlock?.time && aBlock.time !== '');

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
    return Boolean(isViewTimeMinMaxTarget(aBlock) || sHasTag || (aBlock?.useCustom && aCustomTag));
};

export const getTimeMinMaxFetchTarget = (aBlock: any, aCustomTag?: string) => {
    if (isViewTimeMinMaxTarget(aBlock)) return aBlock;
    return aBlock?.useCustom ? { ...aBlock, tag: aCustomTag } : aBlock;
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

export const createViewTimeMinMaxQuery = (aTargetInfo: any) => {
    if (!isViewTimeMinMaxTarget(aTargetInfo)) return undefined;
    const sTime = aTargetInfo.time;
    return `select min(${sTime}) as min_time, max(${sTime}) as max_time from ${combineTableUser(aTargetInfo)}`;
};

export const createLogTimeMinMaxQuery = (aTargetInfo: any) => {
    if (!aTargetInfo?.time) return undefined;
    const sTime = aTargetInfo.time;
    return `select min(${sTime}) as min_time, max(${sTime}) as max_time from ${combineTableUser(aTargetInfo)}`;
};
