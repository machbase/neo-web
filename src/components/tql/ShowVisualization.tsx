/* eslint-disable @typescript-eslint/ban-ts-comment */
import './ShowVisualization.scss';
import { useEffect, useRef, useState } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';
import { CheckObjectKey, E_VISUAL_LOAD_ID, PanelIdParser } from '@/utils/dashboardUtil';

interface ShowChartProps {
    pData: any;
    pLoopMode: boolean;
    pIsCenter?: boolean;
    pIsTqlPanel?: boolean;
    pPanelId?: string;
    pPanelRef?: any;
    pSize?: any;
    pTheme?: string;
}

export const ShowVisualization = (props: ShowChartProps) => {
    const { pData, pIsCenter, pLoopMode, pIsTqlPanel, pPanelId, pPanelRef, pSize, pTheme } = props;
    const sTheme = pData?.theme ? pData.theme : 'dark';
    const wrapRef = useRef<HTMLDivElement>(null);
    const [sMapPreviousUniqueName, setMapPreviousUniqueName] = useState<string | undefined>(undefined);

    const GetVisualID = () => (CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) ? E_VISUAL_LOAD_ID.CHART : E_VISUAL_LOAD_ID.MAP);
    const GetPanelSize = () => {
        let size = { w: pData.style?.width, h: pData.style?.height };
        if (pPanelRef) size = { w: pPanelRef.current.clientWidth + 'px', h: pPanelRef.current.clientHeight + 'px' };
        if (pSize) size = { w: pSize?.w + 'px', h: pSize?.h + 'px' };
        return size;
    };

    const GetElementByResId = () => document.getElementById(pData[GetVisualID()]) as HTMLDivElement | HTMLCanvasElement;
    const GetElementByPanelName = () => document.getElementsByName(PanelIdParser(pPanelId) as string);
    const IsExistElement = () => {
        if (pIsTqlPanel) return wrapRef.current?.firstElementChild?.getAttribute('name') === PanelIdParser(pPanelId);
        return wrapRef.current?.firstElementChild?.id === pData[GetVisualID()];
    };
    const CreateElement = (): HTMLDivElement => {
        const Element = document.createElement('div');
        const sSize = GetPanelSize();
        Element.id = pData[GetVisualID()];
        Element.style.width = sSize.w;
        Element.style.height = sSize.h;
        Element.style.margin = pIsCenter ? 'auto' : 'initial';
        Element.style.backgroundColor = sTheme === 'dark' ? '' : '#FFF';

        pIsTqlPanel && Element.setAttribute('name', PanelIdParser(pPanelId) ?? pData[GetVisualID()]);

        return Element;
    };
    const AppendElement = (element: HTMLDivElement) => wrapRef?.current?.appendChild(element);
    const ShakeNode = () => {
        const tmpNodeList = wrapRef.current?.childNodes;
        if (tmpNodeList && tmpNodeList?.length > 1) tmpNodeList[0].remove();
    };

    const AddRenderCompleteAttr = () => {
        pPanelRef?.current && pPanelRef.current.setAttribute('data-processed', true);
    };
    const OverrideChartTheme = () => CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && GetElementByResId() && echarts.init(GetElementByResId() as any, pTheme ?? 'white');
    const EchartInstance = (key: 'getInstanceByDom' | 'init', domElement: any, command: 'resize' | 'clear') => {
        CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && echarts[key](domElement)[command]();
    };
    // Currently, geomap type panels are not supported.
    // const LeafletInstance = () => {
    //     const sMapContainer = (window as any)[pData[GetVisualID()]];
    //     // const sMapContainer = (window as any)[GetElementByPanelName()[0].id];
    //     if (!sMapContainer) return;
    //     // @ts-ignore
    //     // L.marker([38.9925, -105.5], {}).addTo(sMapContainer.map);
    // };
    const InstanceController = () => {
        const sCommand = pLoopMode ? 'resize' : 'clear';
        const sDomElement = pIsTqlPanel ? GetElementByPanelName()[0] : GetElementByResId();

        if (sCommand === 'resize') {
            const sSize = GetPanelSize();
            sDomElement.style.width = sSize.w;
            sDomElement.style.height = sSize.h;

            if (pIsTqlPanel) sDomElement.id = pData[GetVisualID()];
        }

        CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && EchartInstance('getInstanceByDom', sDomElement, sCommand);
        // CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && LeafletInstance();
    };

    const LoadCommonScripts = async () => {
        if (pData?.jsAssets) await loadScriptsSequentially({ jsAssets: pData.jsAssets ? (ExistCommonScript(pData.jsAssets) as string[]) : [], jsCodeAssets: [] });
    };
    const LoadCodeScripts = async () => {
        let sCodeAsset = pData.jsCodeAssets;
        // Excluding _opt.js = initialize skip
        if (CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && pPanelRef?.current.getAttribute('data-processed')) {
            if (pIsTqlPanel && sMapPreviousUniqueName === wrapRef.current?.firstElementChild?.getAttribute('name')) sCodeAsset = [];
            else sCodeAsset = sCodeAsset.filter((codeAsset: string) => !codeAsset.includes('_opt.js'));
        }

        if (sCodeAsset) await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: sCodeAsset });
    };

    const LoadScript = async () => {
        await LoadCommonScripts();

        if (IsExistElement()) InstanceController();
        else AppendElement(CreateElement());

        pIsTqlPanel && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && OverrideChartTheme();
        (CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) || !pLoopMode) && ShakeNode();
        await LoadCodeScripts();
        pPanelRef && AddRenderCompleteAttr();
        pLoopMode && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && ShakeNode();

        pIsTqlPanel && CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && setMapPreviousUniqueName(PanelIdParser(pPanelId));
    };

    useEffect(() => {
        if (pData) LoadScript();
    }, [pData]);

    return (
        <div className="tql-form">
            {pData &&
                pData?.cssAssets &&
                pData?.cssAssets?.map((cssAsset: string, idx: number) => {
                    return <link key={`css-asset-${idx?.toString()}`} rel="stylesheet" href={cssAsset} />;
                })}
            {pData && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && <div className="chart_container" ref={wrapRef} />}
            {pData && CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && (
                <>
                    <style>.leaflet-tile-pane{`{-webkit-filter: grayscale(${pData?.style?.grayscale}%); filter: grayscale(${pData?.style?.grayscale}%);}`}</style>
                    <div id="map_container" className="map_container" ref={wrapRef} />
                </>
            )}
        </div>
    );
};
