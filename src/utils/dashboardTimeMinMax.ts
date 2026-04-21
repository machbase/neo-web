export const isViewTimeMinMaxTarget = (aBlock: any) => Boolean(aBlock?.type === 'view' && aBlock?.time && aBlock.time !== '');

export const shouldFetchBlockTimeMinMax = (aBlock: any, aCustomTag?: string) => {
    const sHasTag = aBlock?.tag && aBlock.tag !== '';
    return Boolean(isViewTimeMinMaxTarget(aBlock) || sHasTag || (aBlock?.useCustom && aCustomTag));
};

export const getTimeMinMaxFetchTarget = (aBlock: any, aCustomTag?: string) => {
    if (isViewTimeMinMaxTarget(aBlock)) return aBlock;
    return aBlock?.useCustom ? { ...aBlock, tag: aCustomTag } : aBlock;
};

export const createViewTimeMinMaxQuery = (aTargetInfo: any) => {
    if (!isViewTimeMinMaxTarget(aTargetInfo)) return undefined;
    return `select min(${aTargetInfo.time}) as min_time, max(${aTargetInfo.time}) as max_time from ${aTargetInfo.userName}.${aTargetInfo.table}`;
};
