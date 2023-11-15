/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string, aTake: number | undefined = 50) => {
    return 'SQL(`' + aSql + '`)\n' + 'DROP(' + (aLimit * 50 - 50) + `)\nTAKE(${aTake})\nJSON(timeformat('` + aFormat + `'), tz('` + aTimezone + `'))`;
};

export const sqlSheetFormatter = (aSql: string, aBrief: boolean) => {
    return 'SQL(`' + aSql + '`)\n' + `MARKDOWN(html(true), rownum(true), heading(true), brief(${aBrief}))`;
};

export const sqlBasicChartFormatter = (aSql: string, aWidth: number, aHeight: number, aAxis?: { x: string; y: string; xIndex: number; yIndex: number }) => {
    if (aAxis)
        return (
            'SQL(`' +
            aSql +
            '`)\n' +
            'TAKE(5000)\n' +
            'CHART_LINE(' +
            `xAxis(${aAxis.xIndex},'` +
            aAxis.x +
            `'), yAxis(${aAxis.yIndex}, '` +
            aAxis.y +
            `'),` +
            `dataZoom('slider', 0, 100),` +
            'size(' +
            `'${aWidth}px','${aHeight}px'))`
        );
    else return 'SQL(`' + aSql + '`)\n' + 'TAKE(5000)\n' + 'CHART_LINE(size(' + `'${aWidth}px','${aHeight}px'))`;
};
