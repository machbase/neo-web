const lineColors = ['#367FEB', '#EB5757', '#6FCF97', '#FFD95F', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'];

const getTagSetColor = (aValue: any, aTag: any, aChartType: 'gauge' | 'text', aColorset: any[] | any[]) => {
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

export { lineColors, getTagSetColor };
