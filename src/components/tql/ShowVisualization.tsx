import './ShowVisualization.scss';
import { useEffect, useRef, useState } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '@/assets/ts/ScriptRegister';
import { CheckObjectKey, E_VISUAL_LOAD_ID, PanelIdParser } from '@/utils/dashboardUtil';
import { ChartThemeBackgroundColor } from '@/utils/constants';
import { ChartTheme } from '@/type/eChart';

interface ShowChartProps {
    pData: any;
    pLoopMode: boolean;
    pIsCenter?: boolean;
    pPanelType?: string;
    pPanelId?: string;
    pPanelRef?: any;
    pSize?: any;
    pTheme?: string;
    pChartOpt?: any;
    pTitle?: any;
    /**
     * When true, discard any captured legend selection state before this render.
     * Used by Refresh button (explicit user reset). For arrow-based time moves,
     * panel auto-refresh, and TimeRangeModal Save, this stays false so the
     * previously toggled legend (tag) selection is preserved across re-renders.
     */
    pResetLegendSelection?: boolean;
}

export const ShowVisualization = (props: ShowChartProps) => {
    const { pData, pIsCenter, pLoopMode, pPanelType, pPanelId, pPanelRef, pSize, pTheme, pChartOpt, pTitle, pResetLegendSelection } = props;
    const sTheme = pTheme ? pTheme : pData?.theme ? pData.theme : 'dark';
    const wrapRef = useRef<HTMLDivElement>(null);
    const [sMapPreviousUniqueName, setMapPreviousUniqueName] = useState<string | undefined>(undefined);
    // Legend selection (per-panel). Captured via 'legendselectchanged' event and re-applied
    // after each re-render so user-toggled tag visibility survives time-shift / auto-refresh.
    const selectedLegendRef = useRef<Record<string, boolean> | null>(null);
    // Track which panel the ref currently belongs to. When pPanelId changes the panel's
    // series identity changes too, so previous selection must be discarded.
    const selectedLegendPanelKeyRef = useRef<string | undefined>(undefined);

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
        Element.style.backgroundColor = ChartThemeBackgroundColor[sTheme as ChartTheme] ?? '#252525';

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
    const OverrideChartTheme = () => {
        if (!CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) || !GetElementByResId()) return;
        const sDom = GetElementByResId() as any;
        const sExisting = echarts.getInstanceByDom(sDom);
        if (sExisting && !pLoopMode) {
            // Synchronous capture immediately before dispose() so the legend
            // selection survives even if the registered 'legendselectchanged'
            // listener was already detached by the disposing instance.
            CaptureLegendSelectionFromInstance(sExisting);
            sExisting.dispose();
        }
        const sInstance = echarts.init(sDom, sTheme);
        if (sTheme === 'dark') sInstance.setOption({ backgroundColor: ChartThemeBackgroundColor['dark'] });
    };
    const EchartInstance = (domElement: any) => {
        const sCommand = pLoopMode ? 'resize' : 'clear';
        const sSize = GetPanelSize();

        domElement.style.width = sSize.w;
        domElement.style.height = sSize.h;

        if (GetIsTqlType()) domElement.id = pData[GetVisualID()];
        if (sCommand === 'clear') CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && echarts['getInstanceByDom'](domElement)?.['resize']();

        if (CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART)) {
            const sChart = echarts['getInstanceByDom'](domElement);
            // clear() wipes the option (including legend.selected). Capture
            // current selection synchronously beforehand so RestoreLegendSelection
            // can re-inject after the next setOption from jsCodeAssets executes.
            if (sChart && sCommand === 'clear') CaptureLegendSelectionFromInstance(sChart);
            sChart?.[sCommand]();
        }
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

    const RemoveMapZoomOpt = () => {
        const sDomId = PanelIdParser(pPanelId);
        const sMapInstance = (window as any)[sDomId];
        if (!sMapInstance) return;
        const sDomElement = GetIsTqlType() ? GetElementByPanelName()[0] : GetElementByResId();
        if (pChartOpt && pChartOpt.useZoomControl) {
            sMapInstance.map?.touchZoom.enable();
            sMapInstance.map?.doubleClickZoom.enable();
            sMapInstance.map?.scrollWheelZoom.enable();
            sMapInstance.map?.boxZoom.enable();
            sMapInstance.map?.keyboard.enable();
            sMapInstance.map?.dragging.enable();
            sDomElement?.getElementsByClassName('leaflet-control-zoom')?.[0]?.setAttribute('style', 'visibility: visible');
        } else {
            sMapInstance.map?.touchZoom.disable();
            sMapInstance.map?.doubleClickZoom.disable();
            sMapInstance.map?.scrollWheelZoom.disable();
            sMapInstance.map?.boxZoom.disable();
            sMapInstance.map?.keyboard.disable();
            sMapInstance.map?.dragging.disable();
            sDomElement?.getElementsByClassName('leaflet-control-zoom')?.[0]?.setAttribute('style', 'visibility: hidden');
        }
    };

    /**
     * Locate the echarts instance bound to this panel's chart DOM node. Returns
     * undefined if the chart isn't initialized yet or the DOM has been replaced.
     */
    const GetChartInstance = (): any | undefined => {
        if (!CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART)) return undefined;
        const sDomElement = GetIsTqlType() ? GetElementByPanelName()[0] : GetElementByResId();
        if (!sDomElement) return undefined;
        try {
            return (echarts as any)?.getInstanceByDom?.(sDomElement);
        } catch {
            return undefined;
        }
    };

    /**
     * Synchronous fallback capture used at dispose/clear sites. The
     * 'legendselectchanged' event listener is the primary capture path; this
     * helper exists so we never lose state if dispose() races a pending event
     * or if a clear() happens between renders before the handler ran. Reads
     * legend.selected directly from getOption() — best-effort, silently no-ops
     * on a disposed/empty instance.
     */
    const CaptureLegendSelectionFromInstance = (chart: any) => {
        if (!chart) return;
        try {
            const sOption = chart.getOption?.();
            const sLegendList: any[] = Array.isArray(sOption?.legend) ? sOption.legend : [];
            // ECharts merges per-legend `selected` into the first entry of the
            // legend array; iterate to be defensive against multi-legend layouts.
            const sMerged: Record<string, boolean> = {};
            sLegendList.forEach((sLegend: any) => {
                const sSelected = sLegend?.selected;
                if (sSelected && typeof sSelected === 'object') {
                    Object.entries(sSelected).forEach(([sKey, sVal]) => {
                        if (typeof sVal === 'boolean') sMerged[sKey] = sVal;
                    });
                }
            });
            if (Object.keys(sMerged).length === 0) return;
            selectedLegendRef.current = sMerged;
            selectedLegendPanelKeyRef.current = pPanelId;
        } catch {
            // Disposed or transitional instance — ignore.
        }
    };

    /**
     * Re-attach the legendselectchanged handler. We always `off` first so a
     * disposed-and-recreated instance doesn't accumulate duplicate listeners.
     * The handler stores the user's current selection map (series-name -> bool)
     * into a ref that survives subsequent re-renders.
     */
    const AttachLegendCaptureHandler = () => {
        const sChart = GetChartInstance();
        if (!sChart) return;
        try {
            sChart.off('legendselectchanged');
            sChart.on('legendselectchanged', (params: any) => {
                if (!params || !params.selected) return;
                // Clone to detach from echarts' internal mutable reference
                selectedLegendRef.current = { ...params.selected };
                selectedLegendPanelKeyRef.current = pPanelId;
            });
        } catch {
            // Instance may be in a transitional state; skip silently.
        }
    };

    /**
     * Re-apply the previously captured legend selection. Only keys that exist
     * in the freshly rendered chart's legend/series are re-injected, so a
     * series renamed or removed by config edits is naturally dropped and any
     * new series defaults to active (true).
     */
    const RestoreLegendSelection = () => {
        const sStored = selectedLegendRef.current;
        if (!sStored || Object.keys(sStored).length === 0) return;
        const sChart = GetChartInstance();
        if (!sChart) return;
        try {
            const sCurrentOption = sChart.getOption?.();
            // ECharts canonical source for legend keys: legend.data (or legend[*].data)
            const sLegendList: any[] = Array.isArray(sCurrentOption?.legend) ? sCurrentOption.legend : [];
            const sValidKeys = new Set<string>();
            sLegendList.forEach((sLegend: any) => {
                const sData = sLegend?.data;
                if (!Array.isArray(sData)) return;
                sData.forEach((entry: any) => {
                    const name = typeof entry === 'string' ? entry : entry?.name;
                    if (typeof name === 'string') sValidKeys.add(name);
                });
            });
            // Fallback: derive from series names if legend.data wasn't declared
            if (sValidKeys.size === 0 && Array.isArray(sCurrentOption?.series)) {
                sCurrentOption.series.forEach((s: any) => {
                    if (typeof s?.name === 'string') sValidKeys.add(s.name);
                });
            }
            const sFiltered: Record<string, boolean> = {};
            Object.entries(sStored).forEach(([sKey, sValue]) => {
                if (sValidKeys.has(sKey)) sFiltered[sKey] = sValue;
            });
            if (Object.keys(sFiltered).length === 0) {
                // Discard the ref ONLY when the chart actually has legend keys
                // we could compare against. An empty sValidKeys means series
                // data hasn't loaded yet (jsCodeAssets fires async fetches in
                // forEach and the await only waits for the script load, not the
                // network rounds), so we must preserve the ref for the deferred
                // 'finished' pass to apply once series populate.
                if (sValidKeys.size > 0) selectedLegendRef.current = null;
                return;
            }
            // setOption with a partial { legend } merges; we never touch graphic
            // / series / xAxis here so EventSyncChart's overlay survives.
            sChart.setOption({ legend: { selected: sFiltered } });
        } catch {
            // Best-effort: if restoration fails the chart still renders normally.
        }
    };

    /**
     * Restore now, and keep listening for 'finished' until the chart has
     * legend/series keys that overlap with the stored selection. jsCodeAssets
     * fires per-series async fetches via forEach (DashboardChartCodeParser),
     * so the chart starts empty and series populate over multiple setOption
     * calls — a one-shot listener would fire on the very first paint (still
     * empty) and never re-fire. Detaches itself the instant it manages to
     * apply selection, before our own setOption schedules another 'finished'
     * (preventing a self-triggered loop).
     */
    const RestoreLegendSelectionWhenReady = () => {
        RestoreLegendSelection();
        const sChart = GetChartInstance();
        if (!sChart) return;
        try {
            const sHandler = () => {
                const sStored = selectedLegendRef.current;
                if (!sStored || Object.keys(sStored).length === 0) {
                    try {
                        sChart.off?.('finished', sHandler);
                    } catch {
                        // ignore
                    }
                    return;
                }
                let sHasOverlap = false;
                try {
                    const sOpt = sChart.getOption?.();
                    const sLegendList: any[] = Array.isArray(sOpt?.legend) ? sOpt.legend : [];
                    const sValidKeys = new Set<string>();
                    sLegendList.forEach((sLegend: any) => {
                        const sData = sLegend?.data;
                        if (!Array.isArray(sData)) return;
                        sData.forEach((entry: any) => {
                            const name = typeof entry === 'string' ? entry : entry?.name;
                            if (typeof name === 'string') sValidKeys.add(name);
                        });
                    });
                    if (sValidKeys.size === 0 && Array.isArray(sOpt?.series)) {
                        sOpt.series.forEach((s: any) => {
                            if (typeof s?.name === 'string') sValidKeys.add(s.name);
                        });
                    }
                    sHasOverlap = Object.keys(sStored).some((sKey) => sValidKeys.has(sKey));
                } catch {
                    sHasOverlap = false;
                }
                if (!sHasOverlap) return;
                // Detach BEFORE our setOption fires another 'finished' to avoid
                // re-entering this handler from our own restore.
                try {
                    sChart.off?.('finished', sHandler);
                } catch {
                    // ignore
                }
                RestoreLegendSelection();
            };
            sChart.on?.('finished', sHandler);
        } catch {
            // Instance disposed between calls — RestoreLegendSelection above
            // already attempted the synchronous path.
        }
    };

    const LoadScript = async () => {
        // Discard captured legend state when the panel identity changed (series re-keyed)
        // or when the parent explicitly signals a reset (Refresh button click).
        if (selectedLegendPanelKeyRef.current !== pPanelId) {
            selectedLegendRef.current = null;
            selectedLegendPanelKeyRef.current = pPanelId;
        }
        if (pResetLegendSelection) {
            selectedLegendRef.current = null;
        }

        await LoadCommonScripts();

        if (IsExistElement()) InstanceController();
        else AppendElement(CreateElement());

        CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && OverrideChartTheme();
        (CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) || !pLoopMode) && ShakeNode();
        await LoadCodeScripts();
        pPanelRef && AddRenderCompleteAttr();
        pLoopMode && CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART) && ShakeNode();

        CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && RemoveMapZoomOpt();

        // After the dynamic JS asset has executed setOption(), the echarts instance
        // is fully populated. Restore prior legend selection then (re-)attach the
        // capture handler. Order matters: restoring first prevents the handler
        // from firing on our own programmatic setOption. RestoreLegendSelectionWhenReady
        // also schedules a one-shot 'finished' restore so any async setOption from
        // jsCodeAssets that runs after this point still gets the selection merged in.
        if (CheckObjectKey(pData, E_VISUAL_LOAD_ID.CHART)) {
            RestoreLegendSelectionWhenReady();
            AttachLegendCaptureHandler();
        }

        GetIsTqlType() && CheckObjectKey(pData, E_VISUAL_LOAD_ID.MAP) && setMapPreviousUniqueName(PanelIdParser(pPanelId));
    };

    useEffect(() => {
        if (pData) LoadScript();
    }, [pData]);

    // Detach legend listener on unmount to avoid leaking handlers on the cached
    // echarts instance (which can survive across panel remounts via dom reuse).
    useEffect(() => {
        return () => {
            try {
                const sChart = GetChartInstance();
                sChart?.off?.('legendselectchanged');
            } catch {
                // ignore — instance may already be disposed
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="tql-form">
            {pPanelType === 'Text' && <div className={'text-panel-value'} id={`${PanelIdParser(pPanelId)}-text`} />}
            {pPanelType === 'Geomap' && (
                <div className={'geomap-panel-title'} style={{ color: pTitle?.color && pTitle.color !== '' ? pTitle?.color : '#000000' }}>
                    {pTitle?.title}
                </div>
            )}
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
