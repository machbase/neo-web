import { useEffect, useState } from 'react';
import { LineChart, Play } from '@/assets/icons/Icon';
import { getTqlChart } from '@/api/repository/machiot';
import { Spinner } from '@/components/spinner/Spinner';
import { Button, Dropdown, Input, Modal, Page, Toast } from '@/design-system/components';
import moment from 'moment';
import { ShowVisualization } from '../../tql/ShowVisualization';
import type { SelectedRangeSeriesSummary } from '../domain/ChartDomain';
import { TimeUnit } from '../domain/time/TimeTypes';
import {
    formatTimeUnitShortCode,
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
} from '../domain/time/TimeIntervalUtils';
import { formatRangeEndpointLabel } from '../formatting/TimeFormatters';
import {
    buildSqlIdentifierPath,
    buildSqlStringLiteral,
    buildTqlDoubleQuotedString,
} from '../fetch/sqlBuilder/SqlTextUtils';
import { isPlainObject } from '../domain/ObjectGuards';

const FFT_INTERVAL_OPTIONS = [
    TimeUnit.Millisecond,
    TimeUnit.Second,
    TimeUnit.Minute,
    TimeUnit.Hour,
].map((unit) => ({
    value: unit,
    label: formatTimeUnitShortCode(unit),
}));
const FFT_FORM_ROW_STYLE = { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px' } as const;
const FFT_SUMMARY_ROW_STYLE = { display: 'flex', flexDirection: 'row', gap: '8px' } as const;
const FFT_MODAL_STYLE = { minHeight: '200px', height: 'auto', maxHeight: '80vh' } as const;

type FFTModalOption = {
    value: string;
    label: string;
    data: SelectedRangeSeriesSummary;
};

type TqlChartData = Record<string, unknown> & {
    chartID: string;
};

type TqlChartResponse = {
    status?: unknown;
    headers?: unknown;
    data?: unknown;
};

function createFFTModalOptions(seriesSummaries: SelectedRangeSeriesSummary[]): FFTModalOption[] {
    return seriesSummaries.map((summary) => ({
        value: `${summary.table}_${summary.name}_${summary.seriesIndex}`,
        label: summary.alias || summary.name,
        data: summary,
    }));
}

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
        series: [{ type: "bar3D", data: column(0), shading: "lambert" }]
    }),
    chartJSCode({ document.querySelector('.chart_container').firstChild.style.backgroundColor = '#252525'; })
)`;

function buildFftMinMaxHz(minHz: string, maxHz: string): string {
    return minHz === '0' && maxHz === '0'
        ? ''
        : `minHz(${minHz}), maxHz(${maxHz})`;
}

function buildFftQuery({
    isChart2D,
    selectedInfo,
    minMaxHz,
    isNumericXAxis,
    startTime,
    endTime,
    intervalMs,
}: {
    isChart2D: boolean;
    selectedInfo: SelectedRangeSeriesSummary;
    minMaxHz: string;
    isNumericXAxis: boolean;
    startTime: number;
    endTime: number;
    intervalMs?: string;
}): string {
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

function isTqlChartData(value: unknown): value is TqlChartData {
    return isPlainObject(value) && typeof value.chartID === 'string';
}

function isEChartsTqlChartResponse(
    value: unknown,
): value is TqlChartResponse & { headers: Record<string, unknown>; data: TqlChartData } {
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
export const FFTModal = ({
    pSeriesSummaries,
    pStartTime,
    pEndTime,
    pIsNumericXAxis,
    setIsOpen,
}: {
    pSeriesSummaries: SelectedRangeSeriesSummary[];
    pStartTime: number;
    pEndTime: number;
    pIsNumericXAxis: boolean;
    setIsOpen: (value: boolean) => void;
}) => {
    const [sSelectedInfo, setSelectedInfo] = useState<SelectedRangeSeriesSummary | null>(null);
    const [sChartData, setChartData] = useState<TqlChartData | null>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sInterval, setInterval] = useState<string>('100');
    const [sIntervalUnit, setIntervalUnit] = useState<TimeUnit>(TimeUnit.Millisecond);
    const [sMinHz, setMinHz] = useState<string>('0');
    const [sMaxHz, setMaxHz] = useState<string>('0');
    const sRangeLabel = `${formatRangeEndpointLabel(
        pStartTime,
        pIsNumericXAxis,
    )} ~ ${formatRangeEndpointLabel(pEndTime, pIsNumericXAxis)}`;
    const sDropdownOptions = createFFTModalOptions(pSeriesSummaries);

    useEffect(() => {
        const sInitialSummary = pSeriesSummaries[0];
        if (sInitialSummary === undefined) {
            return;
        }

        setSelectedInfo(sInitialSummary);
        loadTqlChartData(
            buildFftQuery({
                isChart2D: true,
                selectedInfo: sInitialSummary,
                minMaxHz: '',
                isNumericXAxis: pIsNumericXAxis,
                startTime: pStartTime,
                endTime: pEndTime,
            }),
        );
    }, [pEndTime, pIsNumericXAxis, pSeriesSummaries, pStartTime]);

    const handleSelectedTag = (value: string) => {
        const sSelectedOption = sDropdownOptions.find(
            (option) => option.value === value,
        );
        if (!sSelectedOption) {
            return;
        }

        setSelectedInfo(sSelectedOption.data);
    };

    function handle2DChart(): void {
        const sNextIsChart2D = !sIsChart2D;

        if (!sNextIsChart2D && pIsNumericXAxis) {
            Toast.warning(
                '3D FFT is only available for datetime x-axis panels.',
                undefined,
            );
            return;
        }

        setIsChart2D(sNextIsChart2D);
        if (!sNextIsChart2D) {
            setInterval('100');
        }
    }

    const handleRunCode = () => {
        if (!sSelectedInfo) {
            Toast.error('Please select a tag.');
            return;
        }

        const sMinHzValue = sMinHz === '' ? '0' : sMinHz;
        const sMaxHzValue = sMaxHz === '' ? '0' : sMaxHz;

        if (sMinHzValue !== sMinHz) {
            setMinHz(sMinHzValue);
        }

        if (sMaxHzValue !== sMaxHz) {
            setMaxHz(sMaxHzValue);
        }

        let sIntervalMs: string | undefined;
        if (!sIsChart2D) {
            if (pIsNumericXAxis) {
                Toast.warning(
                    '3D FFT is only available for datetime x-axis panels.',
                    undefined,
                );
                return;
            }

            if (sInterval === '' || sInterval === '0') {
                Toast.error('Please put an interval value');
                return;
            }

            sIntervalMs = getTimeUnitMilliseconds(
                sIntervalUnit,
                Number(sInterval),
            ).toString();
        }

        loadTqlChartData(
            buildFftQuery({
                isChart2D: sIsChart2D,
                selectedInfo: sSelectedInfo,
                minMaxHz: buildFftMinMaxHz(sMinHzValue, sMaxHzValue),
                isNumericXAxis: pIsNumericXAxis,
                startTime: pStartTime,
                endTime: pEndTime,
                intervalMs: sIntervalMs,
            }),
        );
    };

    const handleSelectInterval = (value: string) => {
        const sNormalizedUnit = normalizeTimeUnit(value);
        if (sNormalizedUnit) {
            setIntervalUnit(sNormalizedUnit);
        }
    };

    async function loadTqlChartData(text: string): Promise<void> {
        setIsLoading(true);

        try {
            const sResult: unknown = await getTqlChart(text);

            if (isEChartsTqlChartResponse(sResult)) {
                setChartData(sResult.data);
            }
        } catch {
            Toast.error('Failed to load FFT chart.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fft-modal-wrapper">
            <Modal.Root
                isOpen
                onClose={() => setIsOpen(false)}
                size="lg"
                style={FFT_MODAL_STYLE}
            >
                <Modal.Header>
                    <Modal.Title>
                        <LineChart size={16} /> FFT
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Page.DpRowBetween
                        style={FFT_FORM_ROW_STYLE}
                    >
                        <Dropdown.Root
                            options={sDropdownOptions}
                            value={
                                sDropdownOptions.find(
                                    (option) => option.data === sSelectedInfo,
                                )?.value
                            }
                            onChange={handleSelectedTag}
                            placeholder="Select tag"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <Button.Group>
                            <Button
                                size="sm"
                                variant="ghost"
                                icon={<div>{sIsChart2D ? '2D' : '3D'}</div>}
                                onClick={handle2DChart}
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                icon={<Play size={16} />}
                                onClick={handleRunCode}
                            />
                        </Button.Group>
                    </Page.DpRowBetween>

                    <Page.DpRow
                        style={FFT_FORM_ROW_STYLE}
                    >
                        <Input
                            label="Min Hz"
                            labelPosition="left"
                            type="number"
                            size="md"
                            width={100}
                            height={32}
                            value={sMinHz}
                            onChange={(event) => setMinHz(event.target.value)}
                        />
                        <Input
                            label="Max Hz"
                            labelPosition="left"
                            type="number"
                            width={100}
                            height={32}
                            value={sMaxHz}
                            onChange={(event) => setMaxHz(event.target.value)}
                        />
                        {!sIsChart2D ? (
                            <Page.DpRow
                                style={FFT_FORM_ROW_STYLE}
                            >
                                <Input
                                    label="Interval"
                                    labelPosition="left"
                                    type="number"
                                    value={sInterval}
                                    onChange={(event) => setInterval(event.target.value)}
                                />
                                <Dropdown.Root
                                    options={FFT_INTERVAL_OPTIONS}
                                    value={sIntervalUnit}
                                    onChange={handleSelectInterval}
                                    placeholder="Unit"
                                >
                                    <Dropdown.Trigger />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </Page.DpRow>
                        ) : null}
                    </Page.DpRow>
                    <Page.Space />
                    <Page.DpRow style={FFT_SUMMARY_ROW_STYLE}>
                        <Page.ContentText pContent={`Min: ${sSelectedInfo?.min}`} />
                        <Page.ContentText pContent={`Max: ${sSelectedInfo?.max}`} />
                        <Page.ContentText pContent={`Avg: ${sSelectedInfo?.avg}`} />
                        <Page.ContentText pContent={sRangeLabel} />
                    </Page.DpRow>
                    {sIsLoading && (
                        <div className="loading-center">
                            <Spinner />
                        </div>
                    )}
                    {!sIsLoading && sChartData && (
                        <ShowVisualization pData={sChartData} pLoopMode={false} />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};
