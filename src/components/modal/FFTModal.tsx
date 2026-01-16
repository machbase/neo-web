// import './FFTModal.scss';
import { useState, useRef, useEffect } from 'react';
import { LineChart, Play } from '@/assets/icons/Icon';
import { getTqlChart } from '@/api/repository/machiot';
import { Spinner } from '@/components/spinner/Spinner';
import { convertMsUnitTime } from '@/utils/index';
import moment from 'moment';
import { ShowVisualization } from '../tql/ShowVisualization';
import { Button, Dropdown, Input, Modal, Page, Toast } from '@/design-system/components';

interface FFTInfo {
    table: string;
    name: string;
    alias: string;
    min: string;
    max: string;
    avg: string;
}

interface FFTModalProps {
    pInfo: FFTInfo[];
    pStartTime: number;
    pEndTime: number;
    setIsOpen: any;
    pTagColInfo: any;
}

const sIntervalList: string[] = ['ms', 'sec', 'min', 'hour'];

export const FFTModal = (props: FFTModalProps) => {
    const { pInfo, pStartTime, pEndTime, setIsOpen, pTagColInfo } = props;
    const modalRef = useRef<HTMLDivElement>(null);
    const [sSelectedInfo, setSelectedInfo] = useState<FFTInfo | null>(null);
    const [sSelectedColInfo, setSelectedColInfo] = useState<any>(null);
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

    useEffect(() => {
        setSelectedInfo(pInfo[0]);
        setSelectedColInfo(pTagColInfo[0].colName);
        getTqlChartData(
            sTql2DQuery
                .replace('{tableName}', pInfo[0].table)
                .replace('{tagName}', pInfo[0].name)
                .replace('{MinMaxHz}', '')
                .replaceAll('{time}', pTagColInfo[0].colName.time)
                .replace('{value}', pTagColInfo[0].colName.value)
                .replace('{name}', pTagColInfo[0].colName.name)
        );
    }, []);

    // Convert FFTInfo array to Dropdown options
    const dropdownOptions = pInfo.map((info, index) => ({
        value: `${info.table}_${info.name}_${index}`,
        label: info.alias || info.name,
        data: { info, colInfo: pTagColInfo[index] }
    }));

    // Convert interval list to Dropdown options
    const intervalOptions = sIntervalList.map((unit) => ({
        value: unit,
        label: unit
    }));

    const handleSelectedTag = (option: any) => {
        if (option?.data) {
            setSelectedInfo(option.data.info);
            setSelectedColInfo(option.data.colInfo.colName);
        }
    };

    const handle2DChart = () => {
        setIsChart2D((prev) => !prev);
        if (sIsChart2D) {
            setInterval('100');
        }
    };

    const handleRunCode = () => {
        if (!sSelectedInfo) return;
        if (sMinHz === '') setMinHz('0');
        if (sMaxHz === '') setMaxHz('0');
        const sMinHzValue = sMinHz === '' ? '0' : sMinHz;
        const sMaxHzValue = sMaxHz === '' ? '0' : sMaxHz;
        const sMinMaxHz = sMinHzValue === '0' && sMaxHzValue === '0' ? '' : `minHz(${sMinHzValue}), maxHz(${sMaxHzValue})`;
        if (sIsChart2D) {
            getTqlChartData(
                sTql2DQuery
                    .replace('{tableName}', sSelectedInfo.table as string)
                    .replace('{tagName}', sSelectedInfo.name)
                    .replace('{MinMaxHz}', sMinMaxHz)
                    .replaceAll('{time}', sSelectedColInfo.time)
                    .replace('{value}', sSelectedColInfo.value)
                    .replace('{name}', sSelectedColInfo.name)
            );
        } else {
            if (sInterval === '' || sInterval === '0') {
                Toast.error('Please put an interval value');
                return;
            }
            const sIntervalValue = convertMsUnitTime(sInterval, sIntervalUnit).toString();
            const sVisualMax = Math.round(Number(sSelectedInfo?.max)).toFixed(1);
            getTqlChartData(
                sTql3DQuery
                    .replace('{tableName}', sSelectedInfo.table)
                    .replace('{tagName}', sSelectedInfo.name)
                    .replace('{MinMaxHz}', sMinMaxHz)
                    .replace('{interval}', sIntervalValue)
                    .replace('{visualMax}', sVisualMax || '1.5')
                    .replaceAll('{time}', sSelectedColInfo.time.toLowerCase())
                    .replace('{value}', sSelectedColInfo.value.toLowerCase())
                    .replace('{name}', sSelectedColInfo.name.toLowerCase())
            );
        }
    };

    const handleSelectInterval = (option: any) => {
        if (option?.value) {
            setIntervalUnit(option.value);
        }
    };

    const getTqlChartData = async (aText: string) => {
        setIsLoading(true);
        const sResult: any = await getTqlChart(aText);
        if (sResult.status === 200 && sResult.headers && sResult.headers['x-chart-type'] === 'echarts') {
            if (sResult.data && sResult.data.chartID) {
                setChartData(sResult.data);
            }
        }
        setIsLoading(false);
    };

    return (
        <div ref={modalRef} className="fft-modal-wrapper">
            <Modal.Root isOpen onClose={() => setIsOpen(false)} size="lg" style={{ minHeight: '200px', height: 'auto', maxHeight: '80vh' }}>
                <Modal.Header>
                    <Modal.Title>
                        <LineChart size={16} /> FFT
                    </Modal.Title>
                    <Modal.Close />
                </Modal.Header>
                <Modal.Body>
                    <Page.DpRowBetween style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px' }}>
                        <Dropdown.Root
                            options={dropdownOptions}
                            value={dropdownOptions.find(opt => opt.data?.info === sSelectedInfo)?.value}
                            onChange={handleSelectedTag}
                            placeholder="Select tag"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>

                        <Button.Group>
                            <Button size="sm" variant="ghost" icon={<div>{sIsChart2D ? '2D' : '3D'}</div>} onClick={handle2DChart} />
                            <Button size="sm" variant="ghost" icon={<Play size={16} />} onClick={handleRunCode} />
                        </Button.Group>
                    </Page.DpRowBetween>

                    <Page.DpRow style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px' }}>
                        <Input label="Min Hz" labelPosition="left" type="number" size="md" width={100} height={32} value={sMinHz} onChange={(e) => setMinHz(e.target.value)} />
                        <Input label="Max Hz" labelPosition="left" type="number" width={100} height={32} value={sMaxHz} onChange={(e) => setMaxHz(e.target.value)} />
                        {!sIsChart2D ? (
                            <Page.DpRow style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '4px' }}>
                                <Input label="Interval" labelPosition="left" type="number" value={sInterval} onChange={(e) => setInterval(e.target.value)} />
                                <Dropdown.Root
                                    options={intervalOptions}
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
                    {!sIsLoading && sChartData ? <ShowVisualization pData={sChartData} pLoopMode={false} /> : null}
                </Modal.Body>
                <Modal.Footer>
                    <Modal.Cancel />
                </Modal.Footer>
            </Modal.Root>
        </div>
    );
};
