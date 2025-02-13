import './FFTModal.scss';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/modal/Modal';
import { Select } from '@/components/inputs/Select';
import { Input } from '@/components/inputs/Input';
import { ArrowDown, Close, LineChart, Play } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { getTqlChart } from '@/api/repository/machiot';
import { Spinner } from '@/components/spinner/Spinner';
import { convertMsUnitTime } from '@/utils/index';
import moment from 'moment';
import { Error } from '../toast/Toast';
import { Tooltip } from 'react-tooltip';
import useOutsideClick from '@/hooks/useOutsideClick';
import { ShowVisualization } from '../tql/ShowVisualization';

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
    const sWindowWidth = window.innerWidth;
    const optionRef = useRef<HTMLDivElement>(null);
    const [isDropboxOpen, setIsDropboxOpen] = useState<boolean>(false);
    const sTql2DQuery = `SQL("select {time}, {value} from {tableName} where {name} in ('{tagName}') AND {time} between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
    \nMAPKEY('fft')
    \nGROUPBYKEY()
    \nFFT({MinMaxHz})
    \nCHART_LINE(
        \nsize('${sWindowWidth * 0.55}px', '600px'),
        \nxAxis(0, 'Hz'),
        \nyAxis(1, 'Amplitude'),
        \ndataZoom('slider', 0, 10) 
    \n)`;
    const sTql3DQuery = `SQL("select {time}, {value} from {tableName} where {name} in ('{tagName}') AND {time} between to_date('${sNewStartTime}') AND to_date('${sNewEndTime}')")
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

    const handleSelectedTag = (aEvent: any) => {
        // CHECK NAME && TABLE
        const sFindIndex = pInfo.findIndex((info: FFTInfo) => info.name.toUpperCase() === aEvent.name.toUpperCase() && info.table.toUpperCase() === aEvent.table.toUpperCase());
        if (sFindIndex !== -1) {
            setSelectedInfo(pInfo[sFindIndex]);
            setSelectedColInfo(pTagColInfo[sFindIndex].colName);
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
                Error('Please put an interval value');
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
    const handleClick = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        aEvent.stopPropagation();
        setIsDropboxOpen(!isDropboxOpen);
    };

    useOutsideClick(optionRef, () => setIsDropboxOpen(false));

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
                            <div
                                className="custom-select-wrapper"
                                style={{
                                    borderRadius: '8px',
                                    width: '200px',
                                    minWidth: '200px',
                                    height: '40px',
                                    cursor: 'pointer',
                                }}
                            >
                                <div className="select-input" onClick={handleClick}>
                                    <span style={{ fontSize: '13', cursor: 'pointer', flexGrow: 1 }}>{sSelectedInfo?.alias || sSelectedInfo?.name}</span>
                                    <ArrowDown />
                                </div>
                                <div
                                    ref={optionRef}
                                    className="select-options"
                                    style={{ display: isDropboxOpen ? 'block' : 'none', maxHeight: '200px', borderRadius: '8px' }}
                                    onClick={(aEvent) => aEvent.stopPropagation()}
                                >
                                    <div className="select-options-item-wrapper" style={{ maxHeight: '160px' }}>
                                        {pInfo.map((aOption: FFTInfo, aIdx: number) => (
                                            <button
                                                key={aIdx}
                                                className={`select-tooltip-${aIdx} options-item`}
                                                onClick={() => handleSelectedTag(aOption)}
                                                style={{ fontSize: '13' }}
                                            >
                                                <Tooltip anchorSelect={`.select-tooltip-${aIdx}`} content={aOption.alias || aOption.name} />
                                                <div className="select-text">{aOption.alias || aOption.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
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
                        {!sIsLoading && sChartData ? <ShowVisualization pData={sChartData} pLoopMode={false} /> : null}
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};
