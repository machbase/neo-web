export const isViewTimeMinMaxTarget = (aBlock: any) => Boolean(aBlock?.type === 'view' && aBlock?.time && aBlock.time !== '');

export const shouldFetchBlockTimeMinMax = (aBlock: any, aCustomTag?: string) => {
    const sHasTag = aBlock?.tag && aBlock.tag !== '';
    return Boolean(isViewTimeMinMaxTarget(aBlock) || sHasTag || (aBlock?.useCustom && aCustomTag));
};

export const getTimeMinMaxFetchTarget = (aBlock: any, aCustomTag?: string) => {
    if (isViewTimeMinMaxTarget(aBlock)) return aBlock;
    return aBlock?.useCustom ? { ...aBlock, tag: aCustomTag } : aBlock;
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
