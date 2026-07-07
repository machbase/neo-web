import { getTqlChart } from '@/api/repository/machiot';
import moment from 'moment';
import type { SelectedRangeSeriesSummary } from '../../domain/ChartDomain';
import { isPlainObject } from '../../domain/ObjectGuards';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
    buildTqlDoubleQuotedString,
} from '../sqlBuilder/SqlTextUtils';

export type FftChartData = Record<string, unknown> & {
    chartID: string;
};

type TqlChartResponse = {
    status?: unknown;
    headers?: unknown;
    data?: unknown;
};

function buildFftSqlRangeCondition(
    isNumericXAxis: boolean,
    startTime: number,
    endTime: number,
    timeColumnSql: string,
): string {
    if (isNumericXAxis) {
        return `${timeColumnSql} between ${startTime} AND ${endTime}`;
    }

    const sNewStartTime = moment(startTime).format('yyyy-MM-DD HH:mm:ss');
    const sNewEndTime = moment(endTime).format('yyyy-MM-DD HH:mm:ss');

    return `${timeColumnSql} between to_date(${buildSqlStringLiteral(
        sNewStartTime,
    )}) AND to_date(${buildSqlStringLiteral(sNewEndTime)})`;
}

const FFT_2D_QUERY_TEMPLATE = `MAPKEY('fft')
GROUPBYKEY()
FFT({MinMaxHz})
CHART(
    size('100%', '400px'),
    theme("dark"),
    chartOption({
        xAxis: { type: "category", name: "Hz", data: column(0) },
        yAxis: { name: "Amplitude" },
        dataZoom: [{ type: "slider", start: 0, end: 10 }],
        backgroundColor: "#252525",
        tooltip: { trigger: "axis" },
        series: [{ type: "line", data: column(1) }]
    })
)`;

const FFT_3D_QUERY_TEMPLATE = `MAPKEY( roundTime(value(0), '{interval}ms') )
GROUPBYKEY()
FFT({MinMaxHz})
FLATTEN()
PUSHKEY('fft')
MAPVALUE(0, list(value(0), value(1), value(2)))
POPVALUE(1, 2)
CHART(
    plugins("gl"),
    size('100%', '400px'),
    chartOption({
        backgroundColor: "#252525",
        tooltip: { backgroundColor: "rgba(50,50,50,0.9)", borderColor: "#555", textStyle: { color: "#fff" } },
        xAxis3D: { type: "time", name: "time", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        yAxis3D: { type: "value", name: "Hz", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        zAxis3D: { type: "value", name: "Amp", nameTextStyle: { color: "#ccc" }, axisLabel: { color: "#aaa" }, axisLine: { lineStyle: { color: "#666" } }, splitLine: { lineStyle: { color: "#444" } }, axisPointer: { lineStyle: { color: "#888" } } },
        grid3D: { viewControl: {}, light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } } },
        visualMap: { show: true, min: 0, max: 80.0, inRange: { color: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"] } },
        series: [{ type: "bar3D", data: column(0), shading: "lambert" } }
    }),
    chartJSCode({ document.querySelector('.chart_container').firstChild.style.backgroundColor = '#252525'; })
)`;

export type FetchFftChartDataParams = {
    isChart2D: boolean;
    selectedInfo: SelectedRangeSeriesSummary;
    minHz: string;
    maxHz: string;
    isNumericXAxis: boolean;
    startTime: number;
    endTime: number;
    intervalMs?: string;
};

export async function fetchFftChartData(
    params: FetchFftChartDataParams,
): Promise<FftChartData | undefined> {
    const sResult: unknown = await getTqlChart(buildFftQuery(params));

    return isEChartsTqlChartResponse(sResult) ? sResult.data : undefined;
}

function buildFftMinMaxHz(minHz: string, maxHz: string): string {
    return minHz === '0' && maxHz === '0'
        ? ''
        : `minHz(${minHz}), maxHz(${maxHz})`;
}

function buildFftQuery({
    isChart2D,
    selectedInfo,
    minHz,
    maxHz,
    isNumericXAxis,
    startTime,
    endTime,
    intervalMs,
}: FetchFftChartDataParams): string {
    const minMaxHz = buildFftMinMaxHz(minHz, maxHz);
    const sSourceColumns = selectedInfo.sourceColumns;
    const sNormalizeColumn = (columnName: string) =>
        isChart2D ? columnName : columnName.toLowerCase();
    const sTimeColumn = buildSqlIdentifierPath(
        sNormalizeColumn(sSourceColumns.time),
        'SQL time column',
    );
    const sValueColumn = buildSqlIdentifierPath(
        sNormalizeColumn(sSourceColumns.value),
        'SQL value column',
    );
    const sNameColumn = buildSqlIdentifierPath(
        sNormalizeColumn(sSourceColumns.name),
        'SQL tag name column',
    );
    const sSql = `select ${sTimeColumn}, ${sValueColumn} from ${buildSqlIdentifierPath(
        selectedInfo.table,
        'SQL table name',
    )} where ${sNameColumn} in (${buildSqlStringLiteral(
        selectedInfo.name,
    )}) AND ${buildFftSqlRangeCondition(
        isNumericXAxis,
        startTime,
        endTime,
        sTimeColumn,
    )} order by ${sTimeColumn}`;
    const sChartTql = (isChart2D ? FFT_2D_QUERY_TEMPLATE : FFT_3D_QUERY_TEMPLATE)
        .replace('{MinMaxHz}', minMaxHz)
        .replace('{interval}', intervalMs ?? '');

    return `SQL(${buildTqlDoubleQuotedString(sSql)})\n${sChartTql}`;
}

function isTqlChartData(value: unknown): value is FftChartData {
    return isPlainObject(value) && typeof value.chartID === 'string';
}

function isEChartsTqlChartResponse(
    value: unknown,
): value is TqlChartResponse & { headers: Record<string, unknown>; data: FftChartData } {
    if (!isPlainObject(value)) {
        return false;
    }

    const sResponse = value as TqlChartResponse;
    if (sResponse.status !== 200 || !isPlainObject(sResponse.headers)) {
        return false;
    }

    return sResponse.headers['x-chart-type'] === 'echarts' &&
        isTqlChartData(sResponse.data);
}
