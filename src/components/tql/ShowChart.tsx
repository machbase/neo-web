/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useRef } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';

interface ShowChartProps {
    pData: any;
    pIsCenter?: boolean;
    pLoopMode: boolean;
    pPanelType?: boolean;
    pPanelId?: string;
    pPanelSize?: any;
    pTheme?: string;
}

export const ShowChart = (props: ShowChartProps) => {
    const { pData, pIsCenter, pLoopMode, pPanelType, pPanelId, pPanelSize, pTheme } = props;
    const sTheme = pData.theme ? pData.theme : 'dark';
    const wrapRef = useRef<HTMLDivElement>(null);

    const LoadScript = async () => {
        if (pData && pData.jsAssets) await loadScriptsSequentially({ jsAssets: pData.jsAssets ? (ExistCommonScript(pData.jsAssets) as string[]) : [], jsCodeAssets: [] });
        const ChartDiv = document.createElement('div');
        if (wrapRef.current?.firstElementChild?.id !== pData.chartID) {
            ChartDiv.id = pData.chartID;
            if (pPanelType) {
                if (document.getElementsByName(pPanelId as string).length > 0 && pLoopMode) {
                    const sEchartList = document.getElementsByName(pPanelId as string);
                    for (const sEchart of sEchartList) {
                        sEchart.id = pData.chartID;
                        sEchart.style.width = pPanelSize.current.clientWidth + 'px';
                        sEchart.style.height = pPanelSize.current.clientHeight + 'px';
                        // @ts-ignore
                        sEchart && echarts.init(sEchart).resize();
                    }
                } else {
                    ChartDiv.style.height = pPanelSize.current.clientHeight + 'px';
                    ChartDiv.style.width = pPanelSize.current.clientWidth + 'px';
                    ChartDiv.setAttribute('name', pPanelId ?? pData.chartID);
                    ChartDiv.style.margin = pIsCenter ? 'auto' : 'initial';
                    wrapRef.current?.appendChild(ChartDiv);
                }
            } else {
                ChartDiv.style.width = pData.style.width;
                ChartDiv.style.height = pData.style.height;
                ChartDiv.style.margin = pIsCenter ? 'auto' : 'initial';
                ChartDiv.style.backgroundColor = sTheme === 'dark' ? '' : '#FFF';
                wrapRef.current?.appendChild(ChartDiv);
            }
        } else {
            const sEchart = document.getElementById(pData.chartID) as HTMLDivElement | HTMLCanvasElement;
            if (pLoopMode) {
                sEchart.style.width = pData.style.width;
                sEchart.style.height = pData.style.height;
                // @ts-ignore
                // sEchart && echarts.init(sEchart).resize();
                sEchart && echarts.getInstanceByDom(sEchart).resize();
            } else {
                // @ts-ignore
                // sEchart && echarts.init(sEchart).clear();
                sEchart && echarts.getInstanceByDom(sEchart).clear();
            }
        }

        pPanelType && document.getElementById(pData.chartID) && echarts.init(document.getElementById(pData.chartID) as any, pTheme ?? 'white');
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
            {pData && pData.style && <div className="chart_container" ref={wrapRef} />}
        </div>
    );
};
