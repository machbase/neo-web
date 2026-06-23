import type { PanelInfo } from '../../domain/PanelDomain';
import type { PanelSeriesDefinition } from '../../domain/SeriesDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/interval/TimeIntervalUtils';
import { clonePanelRangeInput } from '../../domain/time/range/PanelRangeConfigUtils';
import type { PersistedPanelInfoV210 } from '../TazPersistenceTypesV210';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
} from '../PersistenceCloneUtils';

export function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV210 {
    const sIntervalType =
        normalizeStoredTimeUnit(panelInfo.query.intervalType ?? '') ??
        panelInfo.query.intervalType;

    return {
        key: panelInfo.key,
        title: panelInfo.title,
        query: {
            tagSet: panelInfo.query.tagSet.map(mapRuntimeSeriesToPersisted),
            count: panelInfo.query.count,
            intervalType: sIntervalType,
        },
        mode: {
            isRaw: panelInfo.mode.isRaw,
            isOrderBy: panelInfo.mode.isOrderBy,
            useNormalize: panelInfo.mode.useNormalize,
        },
        timeRange: {
            ...clonePanelRangeInput(panelInfo.timeRange),
            useLastViewedRange: panelInfo.timeRange.useLastViewedRange,
            lastViewedRange: panelInfo.timeRange.lastViewedRange,
        },
        axes: {
            x: {
                showTickline: panelInfo.axes.x.showTickline,
            },
            leftY: {
                zeroBase: panelInfo.axes.leftY.zeroBase,
                showTickline: panelInfo.axes.leftY.showTickline,
                valueRange: { ...panelInfo.axes.leftY.valueRange },
                rawValueRange: {
                    ...panelInfo.axes.leftY.rawValueRange,
                },
                upperControlLimit: {
                    ...panelInfo.axes.leftY.upperControlLimit,
                },
                lowerControlLimit: {
                    ...panelInfo.axes.leftY.lowerControlLimit,
                },
            },
            rightY: {
                enabled: panelInfo.axes.rightY.enabled,
                zeroBase: panelInfo.axes.rightY.zeroBase,
                showTickline: panelInfo.axes.rightY.showTickline,
                valueRange: { ...panelInfo.axes.rightY.valueRange },
                rawValueRange: {
                    ...panelInfo.axes.rightY.rawValueRange,
                },
                upperControlLimit: {
                    ...panelInfo.axes.rightY.upperControlLimit,
                },
                lowerControlLimit: {
                    ...panelInfo.axes.rightY.lowerControlLimit,
                },
            },
        },
        display: {
            chartType: panelInfo.display.chartType,
            showLegend: panelInfo.display.showLegend,
            showPoint: panelInfo.display.showPoint,
            pointRadius: panelInfo.display.pointRadius,
            fill: panelInfo.display.fill,
            stroke: panelInfo.display.stroke,
            connectNulls: panelInfo.display.connectNulls,
            useZoom: panelInfo.display.useZoom,
            pixelsPerTick: {
                raw: panelInfo.display.pixelsPerTick.raw,
                calculated: panelInfo.display.pixelsPerTick.calculated,
                calculatedNavigator:
                    panelInfo.display.pixelsPerTick.calculatedNavigator,
            },
            mainChartSampling: {
                enabled: panelInfo.display.mainChartSampling.enabled,
                sampleCount: panelInfo.display.mainChartSampling.sampleCount,
            },
            rawNavigatorSampling: {
                enabled: panelInfo.display.rawNavigatorSampling.enabled,
                sampleCount: panelInfo.display.rawNavigatorSampling.sampleCount,
            },
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}

function mapRuntimeSeriesToPersisted(
    series: PanelSeriesDefinition,
): PanelSeriesDefinition {
    return {
        key: series.key,
        table: series.table,
        sourceTagName: series.sourceTagName,
        alias: series.alias,
        calculationMode: series.calculationMode,
        color: series.color,
        useSecondaryAxis: series.useSecondaryAxis,
        id: series.id,
        useRollupTable: series.useRollupTable,
        sourceColumns: { ...series.sourceColumns },
    };
}
