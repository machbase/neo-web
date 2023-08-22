/** basicFormatter
 * @argument aSql       string;
 * @argument aLimit     number;
 * @argument aFormat    string;
 * @argument aTimezone  string;
 */
export const sqlBasicFormatter = (aSql: string, aLimit: number, aFormat: string, aTimezone: string) => {
    return `SQL('${aSql}')\nDROP(${aLimit * 50 - 50})\nTAKE(${50})\nJSON(timeformat('${aFormat}'), tz('${aTimezone}'))`;
};

export const sqlBasicChartFormatter = (aSql: string, aWidth: number, aHeight: number) => {
    return `SQL('${aSql}')\nTAKE(100)\nCHART_LINE(size($w ?? '${aWidth}px',$h ??'${aHeight}px'))`;
};
