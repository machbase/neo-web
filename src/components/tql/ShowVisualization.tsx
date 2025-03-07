/* eslint-disable @typescript-eslint/ban-ts-comment */
import './ShowVisualization.scss';
import { useEffect, useRef, useState } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';
import { CheckObjectKey, E_VISUAL_LOAD_ID, PanelIdParser } from '@/utils/dashboardUtil';

interface ShowChartProps {
    pData: any;
    pLoopMode: boolean;
    pIsCenter?: boolean;
    pPanelType?: string;
    pPanelId?: string;
    pPanelRef?: any;
    pSize?: any;
    pTheme?: string;
}

export const ShowVisualization = (props: ShowChartProps) => {
    const { pData, pIsCenter, pLoopMode, pPanelType, pPanelId, pPanelRef, pSize, pTheme } = props;
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

    const GetIsTqlType = () => pPanelType && pPanelType === 'Tql chart';
    const GetElementByResId = () => document.getElementById(pData[GetVisualID()]) as HTMLDivElement | HTMLCanvasElement;
    const GetElementByPanelName = () => document.getElementsByName(PanelIdParser(pPanelId) as string);
    const IsExistElement = () => {
        if (GetIsTqlType()) return wrapRef.current?.firstElementChild?.getAttribute('name') === PanelIdParser(pPanelId);
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

        GetIsTqlType() && Element.setAttribute('name', PanelIdParser(pPanelId) ?? pData[GetVisualID()]);

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
    const EchartInstance = (domElement: any) => {
        const sCommand = pLoopMode ? 'resize' : 'clear';
        const sSize = GetPanelSize();

        domElement.style.width = sSize.w;
        domElement.style.height = sSize.h;

        if (GetIsTqlType()) domElement.id = pData[GetVisualID()];
        if (sCommand === 'clear') CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && echarts['getInstanceByDom'](domElement)?.['resize']();

        CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && echarts['getInstanceByDom'](domElement)?.[sCommand]();
    };
    const LeafletInstance = (domElement: HTMLElement) => {
        const sDomId = PanelIdParser(pPanelId);
        const sMapInstance = (window as any)[sDomId];
        if (!sMapInstance) return;
        domElement.style.height = pData.style.height;
        domElement.style.width = pData.style.width;
        sMapInstance.map?.invalidateSize();
    };
    const InstanceController = () => {
        const sDomElement = GetIsTqlType() ? GetElementByPanelName()[0] : GetElementByResId();
        CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && EchartInstance(sDomElement);
        CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && LeafletInstance(sDomElement);
    };

    const LoadCommonScripts = async () => {
        if (pData?.jsAssets) await loadScriptsSequentially({ jsAssets: pData.jsAssets ? (ExistCommonScript(pData.jsAssets) as string[]) : [], jsCodeAssets: [] });
    };
    const LoadCodeScripts = async () => {
        let sCodeAsset = pData.jsCodeAssets;
        // Excluding _opt.js = initialize skip
        if (CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && pPanelRef?.current.getAttribute('data-processed')) {
            if (GetIsTqlType() && sMapPreviousUniqueName === wrapRef.current?.firstElementChild?.getAttribute('name')) sCodeAsset = [];
            else sCodeAsset = sCodeAsset.filter((codeAsset: string) => !codeAsset.includes('_opt.js'));
        }

        if (sCodeAsset) await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: sCodeAsset });
    };

    const LoadScript = async () => {
        await LoadCommonScripts();

        if (IsExistElement()) InstanceController();
        else AppendElement(CreateElement());

        GetIsTqlType() && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && OverrideChartTheme();
        (CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) || !pLoopMode) && ShakeNode();
        await LoadCodeScripts();
        pPanelRef && AddRenderCompleteAttr();
        pLoopMode && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && ShakeNode();

        GetIsTqlType() && CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && setMapPreviousUniqueName(PanelIdParser(pPanelId));
    };

    useEffect(() => {
        if (pData) LoadScript();
    }, [pData]);

    return (
        <div className="tql-form">
            {pPanelType === 'Text' && <div className={'text-panel-value'} id={`${PanelIdParser(pPanelId)}-text`} />}
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
