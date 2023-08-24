/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string) => {
    return 'SQL(`' + aSql + '`)\n' + 'DROP(' + (aLimit * 50 - 50) + `)\nTAKE(50)\nJSON(timeformat('` + aFormat + `'), tz('` + aTimezone + `'))`;
};

export const sqlBasicChartFormatter = (aSql: string, aWidth: number, aHeight: number, aAxis?: { x: string; y: string }) => {
    if (aAxis)
        return (
            'SQL(`' +
            aSql +
            '`)\n' +
            'TAKE(5000)\n' +
            'CHART_LINE(' +
            `xAxis(0,'` +
            aAxis.x +
            `'), yAxis(1, '` +
            aAxis.y +
            `'),` +
            `dataZoom('slider', 0, 100),` +
            'size($w ?? ' +
            `'${aWidth}px',$h ??'${aHeight}px'))`
        );
    else return 'SQL(`' + aSql + '`)\n' + 'TAKE(5000)\n' + 'CHART_LINE(size($w ?? ' + `'${aWidth}px',$h ??'${aHeight}px'))`;
};
