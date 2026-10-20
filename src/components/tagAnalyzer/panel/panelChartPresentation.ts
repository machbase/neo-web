import type { ChartHighlight, ChartPresentation, ChartYAxis } from '../chart/chartModel';
import {
    DEFAULT_PANEL_HIGHLIGHT_LABEL,
    DEFAULT_SERIES_ANNOTATION_LABEL,
    DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
    type PanelHighlight,
} from '../markup/markupModel';
import { getRangeCenter } from '../rangeExpression/rangeArithmetic';
import { getPanelSeriesDisplayColor, hasNumericBaseTimeSeries } from '../seriesModel';
import type { PanelInfo, PanelYAxis } from './panelModel';

export function createPanelChartPresentation(panelInfo: PanelInfo): ChartPresentation {
    return {
        title: panelInfo.title,
        isNumericXAxis: hasNumericBaseTimeSeries(panelInfo.query.tagSet),
        normalizeRightAxis: panelInfo.mode.useNormalize,
        series: panelInfo.query.tagSet.map((series, index) => ({
            key: series.key,
            yAxis: series.useSecondaryAxis ? 1 : 0,
            color: getPanelSeriesDisplayColor(series, index),
        })),
        highlights: panelInfo.highlights.map(createChartHighlight),
        annotations: panelInfo.annotations.map((annotation) => ({
            seriesKey: annotation.seriesKey,
            anchorTime: annotation.timeRange.end > annotation.timeRange.start
                ? getRangeCenter(annotation.timeRange)
                : annotation.timeRange.start,
            text: (typeof annotation.text === 'string' ? annotation.text.trim() : '')
                || DEFAULT_SERIES_ANNOTATION_LABEL,
            fillColor: annotation.fillColor,
            textColor: annotation.textColor || DEFAULT_SERIES_ANNOTATION_TEXT_COLOR,
            clip: annotation.clip,
        })),
        axes: {
            x: { ...panelInfo.axes.x },
            leftY: createChartYAxis(panelInfo.axes.leftY, panelInfo.mode.isRaw),
            rightY: createChartYAxis(panelInfo.axes.rightY, panelInfo.mode.isRaw),
            rightYEnabled: panelInfo.axes.rightY.enabled,
        },
        display: {
            showLegend: panelInfo.display.showLegend,
            showPoint: panelInfo.display.showPoint,
            connectNulls: panelInfo.display.connectNulls,
            useZoom: panelInfo.display.useZoom,
            pointRadius: panelInfo.display.pointRadius ?? 0,
            fill: panelInfo.display.fill ?? 0,
            stroke: panelInfo.display.stroke ?? 0,
        },
    };
}

export function createChartHighlight(highlight: PanelHighlight): ChartHighlight {
    return {
        range: { ...highlight.timeRange },
        text: highlight.text || DEFAULT_PANEL_HIGHLIGHT_LABEL,
        fillColor: highlight.fillColor,
        textColor: highlight.textColor,
    };
}

// -------------------- Local --------------------

function createChartYAxis(axis: PanelYAxis, isRaw: boolean): ChartYAxis {
    return {
        zeroBase: axis.zeroBase,
        showTickline: axis.showTickline,
        valueRange: { ...(isRaw ? axis.rawValueRange : axis.valueRange) },
        upperControlLimit: {
            enabled: axis.upperControlLimit.enabled,
            value: axis.upperControlLimit.value ?? 0,
        },
        lowerControlLimit: {
            enabled: axis.lowerControlLimit.enabled,
            value: axis.lowerControlLimit.value ?? 0,
        },
    };
}
