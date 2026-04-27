import { useEffect, useRef, useState } from 'react';
import { LineChart, Play } from '@/assets/icons/Icon';
import { getTqlChart } from '@/api/repository/machiot';
import { Spinner } from '@/components/spinner/Spinner';
import { Button, Dropdown, Input, Modal, Page, Toast } from '@/design-system/components';
import { convertMsUnitTime } from '@/utils/index';
import moment from 'moment';
import { ShowVisualization } from '../../tql/ShowVisualization';
import type { SelectedRangeSeriesSummary } from '../utils/series/PanelSeriesTypes';
import { FFT_INTERVAL_UNITS } from './BoardModalConstants';
import type { FFTModalOption, FFTModalProps } from './BoardModalTypes';

function createFFTModalOptions(seriesSummaries: SelectedRangeSeriesSummary[]): FFTModalOption[] {
    return seriesSummaries.map((summary) => ({
        value: `${summary.table}_${summary.name}_${summary.seriesIndex}`,
        label: summary.alias || summary.name,
        data: summary,
    }));
}

export const FFTModal = ({
    pSeriesSummaries,
    pStartTime,
    pEndTime,
    setIsOpen,
}: FFTModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [sSelectedInfo, setSelectedInfo] = useState<SelectedRangeSeriesSummary | null>(null);
    const [sChartData, setChartData] = useState<any>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sInterval, setInterval] = useState<string>('100');
    const [sIntervalUnit, setIntervalUnit] = useState<string>('ms');
    const [sMinHz, setMinHz] = useState<string>('0');
    const [sMaxHz, setMaxHz] = useState<string>('0');
    const sNewStartTime = moment(pStartTime).format('yyyy-MM-DD HH:mm:ss');
    const sNewEndTime = moment(pEndTime).format('yyyy-MM-DD HH:mm:ss');
    const sTql2DQuery = `SQL("select {time}, {value} from {tableName} where {name} in ('{tagName}') AND {time} between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
MAPKEY('fft')
GROUPBYKEY()
FFT({MinMaxHz})
CHART(
    size('100%', '400px'),
    theme("dark"),
    chartOption({
        xAxis: {
            type: "category",
            name: "Hz",
            data: column(0)
        },
        yAxis: {
            name: "Amplitude"
        },
        dataZoom: [
            {
                type: "slider",
                start: 0,
                end: 10
            }
        ],
        backgroundColor: "#252525",
        tooltip: {
            trigger: "axis"
        },
        series: [
            {
                type: "line",
                data: column(1)
            }
        ]
    })
)`;

    const sTql3DQuery = `SQL("select {time}, {value} from {tableName} where {name} in ('{tagName}') AND {time} between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
MAPKEY( roundTime(value(0), '{interval}ms') )
GROUPBYKEY()
FFT({MinMaxHz})
FLATTEN()
PUSHKEY('fft')
CHART(
    plugins("gl"),
    size('100%', '400px'),
    chartOption({
        backgroundColor: "#252525",
        tooltip: {
            backgroundColor: "rgba(50,50,50,0.9)",
            borderColor: "#555",
            textStyle: { color: "#fff" }
        },
        xAxis3D: {
            type: "time",
            name: "time",
            nameTextStyle: { color: "#ccc" },
            axisLabel: { color: "#aaa" },
            axisLine: { lineStyle: { color: "#666" } },
            splitLine: { lineStyle: { color: "#444" } },
            axisPointer: { lineStyle: { color: "#888" } }
        },
        yAxis3D: {
            type: "value",
            name: "Hz",
            nameTextStyle: { color: "#ccc" },
            axisLabel: { color: "#aaa" },
            axisLine: { lineStyle: { color: "#666" } },
            splitLine: { lineStyle: { color: "#444" } },
            axisPointer: { lineStyle: { color: "#888" } }
        },
        zAxis3D: {
            type: "value",
            name: "Amp",
            nameTextStyle: { color: "#ccc" },
            axisLabel: { color: "#aaa" },
            axisLine: { lineStyle: { color: "#666" } },
            splitLine: { lineStyle: { color: "#444" } },
            axisPointer: { lineStyle: { color: "#888" } }
        },
        grid3D: {
            viewControl: {},
            light: {
                main: { intensity: 1.2 },
                ambient: { intensity: 0.3 }
            }
        },
        visualMap: {
            show: true,
            min: 0,
            max: 80.0,
            inRange: {
                color: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8",
                        "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]
            }
        },
        series: [
            {
                type: "bar3D",
                data: column(0),
                shading: "lambert"
            }
        ]
    }),
    chartJSCode({
        document.querySelector('.chart_container').firstChild.style.backgroundColor = '#252525';
    })
)`;

    const sDropdownOptions = createFFTModalOptions(pSeriesSummaries);

    useEffect(() => {
        const sInitialSummary = pSeriesSummaries[0];
        if (sInitialSummary === undefined) {
            return;
        }

        setSelectedInfo(sInitialSummary);
        getTqlChartData(
            sTql2DQuery
                .replace('{tableName}', sInitialSummary.table)
                .replace('{tagName}', sInitialSummary.name)
                .replace('{MinMaxHz}', '')
                .replaceAll('{time}', sInitialSummary.sourceColumns.time)
                .replace('{value}', sInitialSummary.sourceColumns.value)
                .replace('{name}', sInitialSummary.sourceColumns.name),
        );
    }, [pSeriesSummaries, sTql2DQuery]);

    const sIntervalOptions = FFT_INTERVAL_UNITS.map((unit) => ({
        value: unit,
        label: unit,
    }));

    const handleSelectedTag = (value: string) => {
        const sSelectedOption = sDropdownOptions.find(
            (option) => option.value === value,
        );
        if (!sSelectedOption) {
            return;
        }

        setSelectedInfo(sSelectedOption.data);
    };

    const handle2DChart = () => {
        setIsChart2D((previousValue) => !previousValue);
        if (sIsChart2D) {
            setInterval('100');
        }
    };

    const handleRunCode = () => {
        if (!sSelectedInfo) {
            Toast.error('Please select a tag.');
            return;
        }

        if (sMinHz === '') {
            setMinHz('0');
        }

        if (sMaxHz === '') {
            setMaxHz('0');
        }

        const sMinHzValue = sMinHz === '' ? '0' : sMinHz;
        const sMaxHzValue = sMaxHz === '' ? '0' : sMaxHz;
        const sMinMaxHz =
            sMinHzValue === '0' && sMaxHzValue === '0'
                ? ''
                : `minHz(${sMinHzValue}), maxHz(${sMaxHzValue})`;

        if (sIsChart2D) {
            getTqlChartData(
                sTql2DQuery
                    .replace('{tableName}', sSelectedInfo.table)
                    .replace('{tagName}', sSelectedInfo.name)
                    .replace('{MinMaxHz}', sMinMaxHz)
                    .replaceAll('{time}', sSelectedInfo.sourceColumns.time)
                    .replace('{value}', sSelectedInfo.sourceColumns.value)
                    .replace('{name}', sSelectedInfo.sourceColumns.name),
            );
            return;
        }

        if (sInterval === '' || sInterval === '0') {
            Toast.error('Please put an interval value');
            return;
        }

        const sIntervalValue = convertMsUnitTime(sInterval, sIntervalUnit).toString();
        const sVisualMax = Math.round(Number(sSelectedInfo.max)).toFixed(1);

        getTqlChartData(
            sTql3DQuery
                .replace('{tableName}', sSelectedInfo.table)
                .replace('{tagName}', sSelectedInfo.name)
                .replace('{MinMaxHz}', sMinMaxHz)
                .replace('{interval}', sIntervalValue)
                .replace('{visualMax}', sVisualMax || '1.5')
                .replaceAll('{time}', sSelectedInfo.sourceColumns.time.toLowerCase())
                .replace('{value}', sSelectedInfo.sourceColumns.value.toLowerCase())
                .replace('{name}', sSelectedInfo.sourceColumns.name.toLowerCase()),
        );
    };

    const handleSelectInterval = (value: string) => {
        if (value !== '') {
            setIntervalUnit(value);
        }
    };

    const getTqlChartData = async (text: string) => {
        setIsLoading(true);
        const sResult: any = await getTqlChart(text);

        if (
            sResult.status === 200 &&
            sResult.headers &&
            sResult.headers['x-chart-type'] === 'echarts' &&
            sResult.data &&
            sResult.data.chartID
        ) {
            setChartData(sResult.data);
        }

        setIsLoading(false);
    };

    return (
        <div ref={modalRef} className="fft-modal-wrapper">
            <Modal.Root
                isOpen
                onClose={() => setIsOpen(false)}
                size="lg"
                style={{ minHeight: '200px', height: 'auto', maxHeight: '80vh' }}
            >
                <Modal.Header>
                    <Modal.Title>
                        <LineChart size={16} /> FFT
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Page.DpRowBetween
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: '4px',
                        }}
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
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: '4px',
                        }}
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
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: '4px',
                                }}
                            >
                                <Input
                                    label="Interval"
                                    labelPosition="left"
                                    type="number"
                                    value={sInterval}
                                    onChange={(event) => setInterval(event.target.value)}
                                />
                                <Dropdown.Root
                                    options={sIntervalOptions}
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
                    <Page.DpRow style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                        <Page.ContentText pContent={`Min: ${sSelectedInfo?.min}`} />
                        <Page.ContentText pContent={`Max: ${sSelectedInfo?.max}`} />
                        <Page.ContentText pContent={`Avg: ${sSelectedInfo?.avg}`} />
                        <Page.ContentText pContent={`${sNewStartTime} ~ ${sNewEndTime}`} />
                    </Page.DpRow>
                    {sIsLoading ? (
                        <div className="loading-center">
                            <Spinner />
                        </div>
                    ) : null}
                    {!sIsLoading && sChartData ? (
                        <ShowVisualization pData={sChartData} pLoopMode={false} />
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};
