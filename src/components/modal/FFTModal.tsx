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
import moment from 'moment';

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

export const FFTModal = (props: FFTModalProps) => {
    const { pInfo, pStartTime, pEndTime, setIsOpen } = props;
    const modalRef = useRef<HTMLDivElement>(null);
    const [sSelectedInfo, setSelectedInfo] = useState<FFTInfo | null>(null);
    const [sChartData, setChartData] = useState<any>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [sInterval, setInterval] = useState<string>('0');
    const [sMinHz, setMinHz] = useState<string>('0');
    const [sMaxHz, setMaxHz] = useState<string>('0');
    const sNewStartTime = moment(pStartTime).format('yyyy-MM-DD HH:mm:ss');
    const sNewEndTime = moment(pEndTime).format('yyyy-MM-DD HH:mm:ss');
    const sTql2DQuery = `SQL("select time, value from {tableName} where name='{tagName}' AND time between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
    \nMAPKEY('fft')
    \nGROUPBYKEY()
    \nFFT({MinMaxHz})
    \nCHART_LINE(
        \nsize('550px', '400px'),
        \nxAxis(0, 'Hz'),
        \nyAxis(1, 'Amplitude'),
        \ndataZoom('slider', 0, 10) 
    \n)`;
    const sTql3DQuery = `SQL("select time, value from {tableName} where name='{tagName}' AND time between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
    \nMAPKEY( roundTime(value(0), '{interval}ms') )
    \nGROUPBYKEY()
    \nFFT({MinMaxHz})
    \nFLATTEN()
    \nPUSHKEY('fft')
    \nCHART_BAR3D(
        \nxAxis(0, 'time', 'time'),
        \nyAxis(1, 'Hz'),
        \nzAxis(2, 'Amp'),
        \nsize('550px', '400px'), 
        \nvisualMap(0, 1.5), 
        \ntheme('westeros'),
        \nautoRotate(20)
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
            setInterval('0');
        }
    };

    const handleRunCode = () => {
        const sMinMaxHz = sMinHz === '0' && sMaxHz === '0' ? '' : `minHz(${sMinHz}), maxHz(${sMaxHz})`;
        if (sIsChart2D) {
            getTqlChartData(sTql2DQuery.replace('{tableName}', pInfo[0].table).replace('{tagName}', pInfo[0].name).replace('{MinMaxHz}', sMinMaxHz));
        } else {
            getTqlChartData(
                sTql3DQuery.replace('{tableName}', pInfo[0].table).replace('{tagName}', pInfo[0].name).replace('{MinMaxHz}', sMinMaxHz).replace('{interval}', sInterval)
            );
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

    const getDiffDay = (aStart: number, aEnd: number) => {
        const sMilliDiffTime = aEnd - aStart;
        const sSecondDiffTime = sMilliDiffTime / 1000;
        const sMinDiffTime = sSecondDiffTime / 60;
        const sHourDiffTime = sMinDiffTime / 60;
        const sDayDiffTime = sHourDiffTime / 24;

        if (sDayDiffTime >= 1) {
            return 'Duration: ' + sDayDiffTime.toFixed(0) + ' day';
        } else if (sHourDiffTime >= 1) {
            return 'Duration: ' + sHourDiffTime.toFixed(0) + ' hour';
        } else if (sMinDiffTime >= 1) {
            return 'Duration: ' + sMinDiffTime.toFixed(0) + ' min';
        } else if (sSecondDiffTime >= 1) {
            return 'Duration: ' + sSecondDiffTime.toFixed(0) + ' sec';
        } else {
            return 'Duration: ' + sMilliDiffTime.toFixed(0) + ' ms';
        }
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
                                pWidth={250}
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
                                </>
                            ) : null}
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    <div className="body">
                        <div className="info">
                            <span>{getDiffDay(pStartTime, pEndTime)}</span>
                            <span>Max: {sSelectedInfo?.max}</span>
                            <span>Min: {sSelectedInfo?.min}</span>
                            <span>Avg: {sSelectedInfo?.avg}</span>
                        </div>
                    </div>
                    <div className="fft-chart">
                        {sIsLoading ? (
                            <div className="loading-center">
                                <Spinner />
                            </div>
                        ) : null}
                        {!sIsLoading && sChartData ? <ShowChart pData={sChartData} /> : null}
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};
