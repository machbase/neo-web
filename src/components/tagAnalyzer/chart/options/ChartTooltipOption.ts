import { getTimeZoneValue } from '@/utils/utils';
import { TOOLTIP_BASE } from './ChartOptionConstants';
import type { EChartTooltipParam } from './ChartOptionTypes';

/**
 * Builds the tooltip configuration used by the main panel chart.
 * Intent: Keep tooltip presentation logic isolated from structural chart option composition.
 * @returns The tooltip option for the main panel chart.
 */
export function buildChartTooltipOption() {
    return {
        ...TOOLTIP_BASE,
        axisPointer: {
            type: 'cross' as const,
            lineStyle: {
                color: 'red',
                width: 0.5,
            },
        },
        formatter: (aParams: unknown) => {
            const sItems = (
                Array.isArray(aParams) ? aParams : [aParams]
            ) as EChartTooltipParam[];
            const sMainSeriesItems = sItems.filter((aItem) =>
                aItem?.seriesId?.startsWith('main-series'),
            );
            if (sMainSeriesItems.length === 0) {
                return '';
            }

            const sTime = formatTooltipTime(
                Number(sMainSeriesItems[0].value?.[0] ?? sMainSeriesItems[0].axisValue),
            );

            return `<div>
                    <div style="min-width:0;padding-left:10px;font-size:10px;color:#afb5bc">${sTime}</div>
                    <div style="padding:6px 0 0 10px">
                    ${sMainSeriesItems
                        .map(
                            (aItem) =>
                                `<div style="color:${aItem.color};margin:0;padding:0;white-space:nowrap">${aItem.seriesName} : ${aItem.value?.[1] ?? ''}</div>`,
                        )
                        .join('')}
                    </div>
                </div>`;
        },
    };
}

/**
 * Formats a tooltip timestamp into the panel's display string.
 * Intent: Apply the panel-specific timezone and fractional-second rules in one place.
 * @param aValue The timestamp to format.
 * @returns The formatted tooltip timestamp.
 */
function formatTooltipTime(aValue: number): string {
    const sFormatted = new Date(aValue - getTimeZoneValue() * 60000)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');

    if (aValue % 1 !== 0) {
        return sFormatted + '.' + String(aValue).split('.')[1];
    }

    return sFormatted;
}
