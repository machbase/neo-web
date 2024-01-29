/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowChartProps {
    pData: any;
    pIsCenter?: boolean;
    pLoopMode: boolean;
    pClearChartOpt?: string;
    pSetClearChartOpt?: (status: string) => void;
}

export const ShowChart = (props: ShowChartProps) => {
    const { pData, pIsCenter, pLoopMode, pClearChartOpt, pSetClearChartOpt } = props;
    const sTheme = pData.theme ? pData.theme : 'dark';
    const wrapRef = useRef<HTMLDivElement>(null);

    const LoadScript = async () => {
        if (pData && pData.jsAssets) await loadScriptsSequentially({ jsAssets: pData.jsAssets ? (ExistCommonScript(pData.jsAssets) as string[]) : [], jsCodeAssets: [] });
        const ChartDiv = document.createElement('div');
        if (wrapRef.current?.firstElementChild?.id !== pData.chartID) {
            ChartDiv.id = pData.chartID;
            ChartDiv.style.width = pData.style.width;
            ChartDiv.style.height = pData.style.height;
            ChartDiv.style.margin = pIsCenter ? 'auto' : 'initial';
            ChartDiv.style.backgroundColor = sTheme === 'dark' ? '' : '#FFF';
            wrapRef.current?.appendChild(ChartDiv);
        } else {
            const sEchart = document.getElementById(pData.chartID) as HTMLDivElement | HTMLCanvasElement;
            if (pLoopMode) {
                if (pClearChartOpt && pSetClearChartOpt) {
                    pSetClearChartOpt('');
                    // @ts-ignore
                    echarts.init(sEchart).clear();
                }
                sEchart.style.width = pData.style.width;
                sEchart.style.height = pData.style.height;
                // @ts-ignore
                echarts.init(sEchart).resize();
            } else {
                // @ts-ignore
                echarts.init(sEchart).clear();
            }
        }

        pData && pData.jsCodeAssets && (await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: pData.jsCodeAssets }));
        const tmpNodeList = wrapRef.current?.childNodes;
        if (tmpNodeList && tmpNodeList?.length > 1) tmpNodeList[0].remove();
    };

    useEffect(() => {
        if (pData) LoadScript();
    }, [pData]);

    return (
        <div className="tql-form">
            {pData && pData.cssAssets && <link rel="stylesheet" href={pData.cssAssets[0]} />}
            {pData && pData.style && <div className="chart_container" ref={wrapRef}></div>}
        </div>
    );
};
