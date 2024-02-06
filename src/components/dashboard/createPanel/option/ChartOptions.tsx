import { Select } from '@/components/inputs/Select';
import { useState, ChangeEvent } from 'react';
import { ChartXAxisTypeList } from '@/utils/constants';

/** LiquidFill */
const LiquidFillDiv = ({ pSetPanelOption }: { pSetPanelOption: (preV: any) => void }) => {
    const shapeList = ['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'container'];
    const sInitVal = 'circle';

    const HandleLiquidShape = (event: any) => {
        pSetPanelOption((preV: any) => {
            return { ...preV, chartInfo: { series: { type: 'liquidFill', shape: event.target.value } } };
        });
    };

    return (
        <div className="panel-name-form">
            <div className="panel-name-wrap">Shape</div>
            <Select pFontSize={14} pWidth={'100%'} pBorderRadius={4} pInitValue={sInitVal} pHeight={30} onChange={HandleLiquidShape} pOptions={shapeList} />
        </div>
    );
};
/** Line */
const LineDiv = ({ pSetPanelOption }: { pSetPanelOption: () => void }) => {
    const sChartInfo = {
        series: [{ type: 'line' }],
        xAxis: { type: 'category' },
        yAxis: {},
    };

    return <XAxis pChartInfo={sChartInfo} pSetPanelOption={pSetPanelOption} />;
};
/** Bar */
const BarDiv = ({ pSetPanelOption }: { pSetPanelOption: (preV: any) => void }) => {
    const sChartInfo = {
        series: [{ type: 'bar' }],
        xAxis: { type: 'category' },
        yAxis: {},
    };

    return <XAxis pChartInfo={sChartInfo} pSetPanelOption={pSetPanelOption} />;
};
/** Scatter */
const ScatterDiv = ({ pSetPanelOption }: { pSetPanelOption: (preV: any) => void }) => {
    const sChartInfo = {
        series: [{ type: 'scatter' }],
        xAxis: { type: 'category' },
        yAxis: {},
    };

    return <XAxis pChartInfo={sChartInfo} pSetPanelOption={pSetPanelOption} />;
};
/** Gauge */
const GaugeDiv = ({ pSetPanelOption }: { pSetPanelOption: (preV: any) => void }) => {
    const [sProgress, setProgress] = useState<boolean>(true);
    const [sAxisTick, setAxisTick] = useState<boolean>(true);
    const sSplitLine = {
        length: 10,
        distance: -10,
        lineStyle: {
            width: 2,
            color: '#fff',
        },
    };
    const sAxisLabel = {
        distance: 25,
        color: '#999',
        fontSize: 16,
    };

    const HandleProgress = (e: any) => {
        setProgress(e.target.checked);
        pSetPanelOption((preV: any) => {
            return {
                ...preV,
                chartInfo: {
                    series: [
                        {
                            type: 'gauge',
                            progress: { show: e.target.checked },
                            axisTick: { show: sAxisTick },
                            splitLine: sSplitLine,
                            axisLabel: sAxisLabel,
                        },
                    ],
                },
            };
        });
    };

    const HandleAxisTick = (e: any) => {
        setAxisTick(e.target.checked);
        pSetPanelOption((preV: any) => {
            return {
                ...preV,
                chartInfo: { series: [{ type: 'gauge', progress: { show: sProgress }, axisTick: { show: e.target.checked }, splitLine: sSplitLine, axisLabel: sAxisLabel }] },
            };
        });
    };

    return (
        <>
            <div className="panel-name-form">
                <label className="panel-name-wrap" htmlFor="gauge-progress">
                    Progress
                </label>
                <input type="checkbox" id="gauge-progress" checked={sProgress} onChange={HandleProgress} />
                <label className="panel-name-wrap" htmlFor="gauge-axistick">
                    AxisTick
                </label>
                <input type="checkbox" id="gauge-axistick" checked={sAxisTick} onChange={HandleAxisTick} />
            </div>
        </>
    );
};
/** Axis X common */
const XAxis = ({ pChartInfo, pSetPanelOption }: { pChartInfo: any; pSetPanelOption: (preV: any) => void }) => {
    const handleXAxisType = (event: ChangeEvent<HTMLInputElement>) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                chartInfo: {
                    ...pChartInfo,
                    xAxis: { type: event.target.value },
                },
            };
        });
    };
    return (
        <>
            <div className="row title">XAxis Type</div>
            <div className="row">
                <Select pFontSize={13} pWidth={'100%'} pBorderRadius={4} pInitValue={pChartInfo.xAxis.type} pHeight={30} onChange={handleXAxisType} pOptions={ChartXAxisTypeList} />
            </div>
        </>
    );
};
export const ChartOptions = ({ pPanelOption, pSetPanelOption }: { pPanelOption: any; pSetPanelOption: () => void }) => {
    switch (pPanelOption.type.toLocaleLowerCase()) {
        case 'liquidfill':
            return <LiquidFillDiv pSetPanelOption={pSetPanelOption} />;
        case 'line':
            return <LineDiv pSetPanelOption={pSetPanelOption} />;
        case 'bar':
            return <BarDiv pSetPanelOption={pSetPanelOption} />;
        case 'gauge':
            return <GaugeDiv pSetPanelOption={pSetPanelOption} />;
        case 'scatter':
            return <ScatterDiv pSetPanelOption={pSetPanelOption} />;
    }
};
