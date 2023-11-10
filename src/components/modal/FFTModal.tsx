import './FFTModal.scss';
import { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/modal/Modal';
import { Select } from '@/components/inputs/Select';
import { Close, LineChart } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { getTqlChart } from '@/api/repository/machiot';
import { ShowChart } from '@/components/tql/ShowChart';
import { Spinner } from '@/components/spinner/Spinner';
import moment from 'moment';

interface FFTInfo {
    table: string;
    name: string;
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
    // const [sSelectedTag, setSelectedTag] = useState<string>('');
    const [sSelectedInfo, setSelectedInfo] = useState<FFTInfo | null>(null);
    const [sChartData, setChartData] = useState<any>(null);
    const [sIsChart2D, setIsChart2D] = useState<boolean>(true);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const sNewStartTime = moment(pStartTime).format('yyyy-MM-DD HH:mm:ss');
    const sNewEndTime = moment(pEndTime).format('yyyy-MM-DD HH:mm:ss');
    const sTql2DQuery = `SQL("select * from {tableName} where name='{tagName}' AND time >= '${sNewStartTime}' AND time <= '${sNewEndTime}'")\nCHART_LINE(size('550px', '400px'))`;
    const sTql3DQuery = `SQL("select * from {tableName} where name='{tagName}' AND time >= '${sNewStartTime}' AND time <= '${sNewEndTime}'")\nCHART_LINE3D(size('550px', '400px'), autoRotate(20))`;

    useEffect(() => {
        // setSelectedTag(pInfo[0].name);
        setSelectedInfo(pInfo[0]);
        getTqlChartData(sTql2DQuery.replace('{tableName}', pInfo[0].table).replace('{tagName}', pInfo[0].name));
    }, []);

    const handleSelectedTag = (aEvent: any) => {
        // setSelectedTag(aEvent.target.value);
        const sFindIndex = pInfo.findIndex((info: FFTInfo) => info.name === aEvent.target.value);
        if (sFindIndex !== -1) {
            setSelectedInfo(pInfo[sFindIndex]);
            if (sIsChart2D) {
                getTqlChartData(sTql2DQuery.replace('{tableName}', pInfo[sFindIndex].table).replace('{tagName}', pInfo[sFindIndex].name));
            } else {
                getTqlChartData(sTql3DQuery.replace('{tableName}', pInfo[sFindIndex].table).replace('{tagName}', pInfo[sFindIndex].name));
            }
        }
    };

    const handle2DChart = () => {
        setIsChart2D(true);
        getTqlChartData(sTql2DQuery.replace('{tableName}', sSelectedInfo!.table).replace('{tagName}', sSelectedInfo!.name));
    };

    const handle3DChart = () => {
        setIsChart2D(false);
        getTqlChartData(sTql3DQuery.replace('{tableName}', sSelectedInfo!.table).replace('{tagName}', sSelectedInfo!.name));
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
                        <Select
                            pInitValue={pInfo[0].name}
                            pOptions={pInfo.map((info: FFTInfo) => info.name)}
                            pHeight={32}
                            onChange={(aEvent) => handleSelectedTag(aEvent)}
                            pWidth={250}
                        />
                        <div className="button-group">
                            <IconButton onClick={handle2DChart} pIcon={<div>2D</div>} pIsActive={sIsChart2D} pIsActiveHover />
                            <IconButton onClick={handle3DChart} pIcon={<div>3D</div>} pIsActive={!sIsChart2D} pIsActiveHover />
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
