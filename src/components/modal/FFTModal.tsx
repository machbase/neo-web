import './FFTModal.scss';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/modal/Modal';
import { Select } from '@/components/inputs/Select';
import { Input } from '@/components/inputs/Input';
import { Close, LineChart, Play } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { getTqlChart } from '@/api/repository/machiot';
import { ShowChart } from '@/components/tql/ShowChart';
import { Spinner } from '@/components/spinner/Spinner';
import { convertMsUnitTime } from '@/utils/index';
import moment from 'moment';
import { Error } from '../toast/Toast';

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
}

const sIntervalList: string[] = ['ms', 'sec', 'min', 'hour'];

export const FFTModal = (props: FFTModalProps) => {
    const { pInfo, pStartTime, pEndTime, setIsOpen } = props;
    const modalRef = useRef<HTMLDivElement>(null);
    const [sSelectedInfo, setSelectedInfo] = useState<FFTInfo | null>(null);
    const [sChartData, setChartData] = useState<any>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sInterval, setInterval] = useState<string>('100');
    const [sIntervalUnit, setIntervalUnit] = useState<string>('ms');
    const [sMinHz, setMinHz] = useState<string>('0');
    const [sMaxHz, setMaxHz] = useState<string>('0');
    const sNewStartTime = moment(pStartTime).format('yyyy-MM-DD HH:mm:ss');
    const sNewEndTime = moment(pEndTime).format('yyyy-MM-DD HH:mm:ss');
    const sWindowWidth = window.innerWidth;
    const sTql2DQuery = `SQL("select time, value from {tableName} where NAME in ('{tagName}') AND time between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
    \nMAPKEY('fft')
    \nGROUPBYKEY()
    \nFFT({MinMaxHz})
    \nCHART_LINE(
        \nsize('${sWindowWidth * 0.55}px', '600px'),
        \nxAxis(0, 'Hz'),
        \nyAxis(1, 'Amplitude'),
        \ndataZoom('slider', 0, 10) 
    \n)`;
    const sTql3DQuery = `SQL("select time, value from {tableName} where NAME in ('{tagName}') AND time between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
    \nMAPKEY( roundTime(value(0), '{interval}ms') )
    \nGROUPBYKEY()
    \nFFT({MinMaxHz})
    \nFLATTEN()
    \nPUSHKEY('fft')
    \nCHART_BAR3D(
        \nxAxis(0, 'time', 'time'),
        \nyAxis(1, 'Hz'),
        \nzAxis(2, 'Amp'),
        \nsize('${sWindowWidth * 0.55}px', '600px'),
        \nvisualMap(0, {visualMax})
    \n)`;

    useEffect(() => {
        setSelectedInfo(pInfo[0]);
        getTqlChartData(sTql2DQuery.replace('{tableName}', pInfo[0].table).replace('{tagName}', pInfo[0].name).replace('{MinMaxHz}', ''));
    }, []);

    const handleSelectedTag = (aEvent: any) => {
        const sFindIndex = pInfo.findIndex((info: FFTInfo) => info.name === aEvent.target.value);
        if (sFindIndex !== -1) {
            setSelectedInfo(pInfo[sFindIndex]);
        }
    };

    const handle2DChart = () => {
        setIsChart2D((prev) => !prev);
        if (sIsChart2D) {
            setInterval('100');
        }
    };

    const handleRunCode = () => {
        if (sMinHz === '') setMinHz('0');
        if (sMaxHz === '') setMaxHz('0');
        const sMinHzValue = sMinHz === '' ? '0' : sMinHz;
        const sMaxHzValue = sMaxHz === '' ? '0' : sMaxHz;
        const sMinMaxHz = sMinHzValue === '0' && sMaxHzValue === '0' ? '' : `minHz(${sMinHzValue}), maxHz(${sMaxHzValue})`;
        if (sIsChart2D) {
            getTqlChartData(sTql2DQuery.replace('{tableName}', pInfo[0].table).replace('{tagName}', pInfo[0].name).replace('{MinMaxHz}', sMinMaxHz));
        } else {
            if (sInterval === '' || sInterval === '0') {
                Error('Please put an interval value');
                return;
            }
            const sIntervalValue = convertMsUnitTime(sInterval, sIntervalUnit).toString();
            const sVisualMax = Math.round(Number(sSelectedInfo?.max)).toFixed(1);
            getTqlChartData(
                sTql3DQuery
                    .replace('{tableName}', pInfo[0].table)
                    .replace('{tagName}', pInfo[0].name)
                    .replace('{MinMaxHz}', sMinMaxHz)
                    .replace('{interval}', sIntervalValue)
                    .replace('{visualMax}', sVisualMax || '1.5')
            );
        }
    };

    const handleSelectInterval = (aEvent: any) => {
        setIntervalUnit(aEvent.target.value);
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
            <Modal pIsDarkMode onOutSideClose={() => setIsOpen(false)}>
                <Modal.Header>
                    <div className="header">
                        <span className="title">
                            <LineChart />
                            <span>FFT</span>
                        </span>
                        <Close className="close" onClick={() => setIsOpen(false)} />
                    </div>
                    <div className="tool-bar">
                        <div className="select-group">
                            <Select
                                pInitValue={pInfo[0].alias || pInfo[0].name}
                                pOptions={pInfo.map((info: FFTInfo) => info.alias || info.name)}
                                pHeight={32}
                                onChange={(aEvent) => handleSelectedTag(aEvent)}
                                pWidth={200}
                            />
                            <div className="button-group">
                                <IconButton onClick={handle2DChart} pIcon={<div>{sIsChart2D ? '2D' : '3D'}</div>} pIsActiveHover />
                                <IconButton onClick={handleRunCode} pIcon={<Play />} pIsActiveHover />
                            </div>
                        </div>
                        <div className="input-group">
                            <span>Min Hz</span>
                            <Input pType="number" pWidth={100} pHeight={32} pValue={sMinHz} pSetValue={setMinHz} onChange={() => null} />
                            <span>Max Hz</span>
                            <Input pType="number" pWidth={100} pHeight={32} pValue={sMaxHz} pSetValue={setMaxHz} onChange={() => null} />
                            {!sIsChart2D ? (
                                <>
                                    <span>Interval</span>
                                    <Input pType="number" pWidth={100} pHeight={32} pValue={sInterval} pSetValue={setInterval} onChange={() => null} />
                                    <Select pInitValue={sIntervalList[0]} pOptions={sIntervalList} pHeight={32} onChange={(aEvent) => handleSelectInterval(aEvent)} pWidth={70} />
                                </>
                            ) : null}
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="body">
                        <div className="info">
                            <span>Min: {sSelectedInfo?.min}</span>
                            <span>Max: {sSelectedInfo?.max}</span>
                            <span>Avg: {sSelectedInfo?.avg}</span>
                            <span>
                                {sNewStartTime} ~ {sNewEndTime}
                            </span>
                        </div>
                    </div>
                    <div className="fft-chart">
                        {sIsLoading ? (
                            <div className="loading-center">
                                <Spinner />
                            </div>
                        ) : null}
                        {!sIsLoading && sChartData ? <ShowChart pData={sChartData} pLoopMode={false} /> : null}
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};
