import moment from 'moment';
import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import type { ChartSeriesItem, TimeRange } from '../../common/modelTypes';
import type { EChartTooltipParam } from './PanelChartOptionTypes';
import { TOOLTIP_BASE } from './PanelChartOptionConstants';

/**
 * Chooses a compact axis label format based on the current visible time span.
 * @param aValue The axis timestamp to format.
 * @param aRange The currently visible time range.
 * @returns The formatted axis label.
 */
export function formatAxisTime(aValue: number, aRange: TimeRange): string {
    const sDiff = aRange.endTime - aRange.startTime;

    if (sDiff <= 60 * 60 * 1000) {
        return moment.utc(aValue).format('HH:mm:ss');
    }

    if (sDiff <= 24 * 60 * 60 * 1000) {
        return moment.utc(aValue).format('HH:mm');
    }

    if (sDiff <= 30 * 24 * 60 * 60 * 1000) {
        return moment.utc(aValue).format('MM-DD HH:mm');
    }

    return moment.utc(aValue).format('YYYY-MM-DD');
}

/**
 * Builds the main-panel tooltip configuration used by the chart and navigator pair.
 * @returns The tooltip option for the main panel chart.
 */
export function buildPanelTooltipOption() {
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
 * Builds the overlap-modal tooltip configuration.
 * @param aChartData The overlap chart datasets.
 * @param aStartTimeList The original series start times used to rebuild timestamps.
 * @returns The tooltip option for the overlap chart.
 */
export function buildOverlapTooltipOption(
    aChartData: ChartSeriesItem[],
    aStartTimeList: number[],
) {
    return {
        ...TOOLTIP_BASE,
        formatter: (aParams: unknown) => {
            const sItems = (Array.isArray(aParams) ? aParams : [aParams]) as EChartTooltipParam[];
            return `<div style="min-width:0;padding-left:10px;font-size:10px"><div style="color:#afb5bc">${sItems
                .map((aItem) => {
                    const sIdx = aItem.seriesIndex ?? 0;
                    return `<div style="color:${aItem.color}">${
                        aChartData[sIdx].name +
                        ' : ' +
                        toDateUtcChart(
                            Number(aItem.value?.[0] ?? 0) +
                                (aStartTimeList[sIdx] ?? 0) -
                                1000 * 60 * getTimeZoneValue(),
                            true,
                        ) +
                        ' : ' +
                        (aItem.value?.[1] ?? '')
                    }</div>`;
                })
                .join('<br/>')}</div></div>`;
        },
    };
}

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
