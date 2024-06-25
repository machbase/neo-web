export const lineColors = ['#367FEB', '#EB5757', '#6FCF97', '#FFD95F', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#2D9CDB', '#C3A080', '#C9C9C9', '#6B6B6B'];

export const getTagSetColor = (aValue: any, aTag: any, aChartType: 'gauge' | 'text', aColorset: any[] | any[]) => {
    const sTagColor = aTag.color || lineColors[0];

    const sColorSet = Array.isArray(aColorset) ? aColorset : [];
    if (aChartType === 'gauge') {
        (sColorSet as any[]).sort((a, b) => b.from - a.from);
    } else {
        (sColorSet as any[]).sort((a, b) => b.min - a.min);
    }
    if (sColorSet.length === 0) return sTagColor;
    const colorLevel = (sColorSet as any[]).find((v) => Number(v.min) < aValue);
    return colorLevel ? colorLevel.color : sTagColor;
};

// dsh
export const getDefaultColor = () => {
    return lineColors[0];
};
export const getTagColor = (aUseColorList: any) => {
    const sEtcColor = lineColors.filter((aColor: string) => !(aUseColorList.includes(aColor) || aUseColorList?.includes(aColor.toLowerCase())));
    return sEtcColor[0];
};
export const getUseColorList = (aBlockList: any) => {
    return aBlockList.map((aBlock: any) => aBlock.color);
};
// taz
export const getEtcColorList = (aUseColorList: any) => {
    return lineColors.filter((aColor: string) => !(aUseColorList?.includes(aColor) || aUseColorList?.includes(aColor.toLowerCase())));
};
export const getTazUseColorList = (aTagList: any) => {
    const sResult = aTagList?.map((aTag: any) => aTag.color);
    return sResult ?? [];
};
export const concatTagSet = (aOriginTagList: any, aNewTagList: any) => {
    const sEtcColorList = getEtcColorList(getTazUseColorList(aOriginTagList));
    const sParsedNewTagList = aNewTagList.map((aTag: any, aIdx: number) => {
        return { ...aTag, color: sEtcColorList[aIdx] };
    });
    return aOriginTagList.concat(sParsedNewTagList);
};
