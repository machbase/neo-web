import { ExtensionErrorBoundary, ExtensionFields, useExtensionEntries } from '../extensions/ExtensionPanels';
import { extensionKey, isExtensionPanel, type ExtensionDefinition } from '../extensions/types';
import type { ExtensionEditorProps } from '../extensions/types';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { CheckCustomChartType, CheckPlgChart, DefaultChartOption, DefaultCommonOption, chartTypeConverter, getAvailableChartTypeKeys, getDefaultSeriesOption } from '@/utils/eChartHelper';
import { validateAndRepairDashboardPanel } from '@/utils/panelValidator';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { createDefaultTagTableOption, getTableType, geomapAggregatorList, useXAxis, useYAxis } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';
import { ScatterOptions } from './option/ScatterOptions';
import { GaugeOptions } from './option/GaugeOptions';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { LiquidfillOptions } from './option/LiquidfillOptions';
import { TqlOptions } from './option/TqlOptions';
import { VideoOptions } from './option/VideoOptions';
import { TextOptions } from './option/TextOptions';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { GeomapOptions } from './option/GeomapOptions';
import { AdvancedScatterOptions } from './option/AdvanceScatter';
import { CalcBlockTotal, CalcBlockTotalType } from '@/utils/helpers/Dashboard/BlockHelper';
import { TrxParsedBlockType } from '@/utils/Chart/TransformDataParser';
import { ConfirmableSelect } from '@/components/inputs/ConfirmableSelect';
import { Page } from '@/design-system/components';
import { getFiles } from '@/api/repository/fileTree';
import { TableTypeOrderList } from '@/components/side/DBExplorer/utils';

interface CreatePanelRightProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pType: undefined | 'create' | 'edit';
    pBoardInfo?: any;
    pTableList?: any[];
    pExtensionDefinition?: ExtensionDefinition;
    pExtensionEditorProps: ExtensionEditorProps;
    pExtensionError?: string;
    pExtensionSaving?: boolean;
}

const CreatePanelRight = (props: CreatePanelRightProps) => {
    const { pPanelOption, pSetPanelOption, pType, pBoardInfo } = props;
    const entries = useExtensionEntries();
    const isExtension = isExtensionPanel(pPanelOption);
    const selected = isExtension ? (pPanelOption.extension ? extensionKey(pPanelOption.extension) : 'Extension') : pPanelOption.type;
    const options = props.pExtensionDefinition?.commonOptions;
    const [sInstalledPkgs, setInstalledPkgs] = useState<Set<string>>(new Set());
    const sPieLegendValue = { legendTop: 'top', legendLeft: 'right', legendOrient: 'vertical' };
    const sChartType = isExtension ? undefined : chartTypeConverter(pPanelOption.type);
    const sIsTql = sChartType === E_CHART_TYPE.TQL;
    const sIsVideo = sChartType === E_CHART_TYPE.VIDEO;
    const sUseCommOpt = !(sIsTql || sIsVideo);

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        if (props.pExtensionSaving || aEvent.target.value === selected) return;
        const entry = entries.find((item) => extensionKey(item) === aEvent.target.value);
        if (entry) {
            const { id, x, y, w, h, title, theme } = pPanelOption;
            pSetPanelOption({ id, x, y, w, h, title, theme, type: 'Extension', extensionPending: true, extension: { packageId: entry.packageId, typeId: entry.typeId } });
            return;
        }
        const sConvertedChartType = chartTypeConverter(aEvent.target.value);
        const sIsPlgChart = CheckPlgChart(sConvertedChartType as ChartType);
        const sChangeChartOption = getDefaultSeriesOption(sConvertedChartType as ChartType);
        const sIsPie = sConvertedChartType === E_CHART_TYPE.PIE;
        const sIsAdvScatter = sConvertedChartType === E_CHART_TYPE.ADV_SCATTER;
        const sIsGeomap = sConvertedChartType === E_CHART_TYPE.GEOMAP;
        const sIsTql = sConvertedChartType === E_CHART_TYPE.TQL;

        pSetPanelOption((aPrev: any) => {
            let source = aPrev;
            if (isExtension) {
                const table = [...(props.pTableList ?? [])].sort((left, right) =>
                    TableTypeOrderList.indexOf(getTableType(left[4])) - TableTypeOrderList.indexOf(getTableType(right[4]))
                )[0];
                source = {
                    ...structuredClone(DefaultChartOption),
                    id: aPrev.id,
                    x: aPrev.x,
                    y: aPrev.y,
                    w: aPrev.w,
                    h: aPrev.h,
                    blockList: createDefaultTagTableOption(table?.[1] ?? '', table, table ? getTableType(table[4]) : 'none', '', aEvent.target.value),
                };
            }
            const sResVal = {
                ...source,
                type: aEvent.target.value,
                chartInfo: sChangeChartOption,
                chartOptions: sChangeChartOption,
            };
            if (pType === 'create' || isExtension) {
                const sPieLegendOption = {
                    ...DefaultCommonOption,
                    ...sPieLegendValue,
                };
                if (sIsPie) sResVal.commonOptions = sPieLegendOption;
                else sResVal.commonOptions = isExtension ? structuredClone(DefaultCommonOption) : DefaultCommonOption;

                if (sIsAdvScatter) sResVal.commonOptions.tooltipTrigger = 'item';
            }
            if (sIsTql) sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };
            else sResVal.tqlInfo = { path: '', params: [{ name: '', value: '', format: '' }], chart_id: '' };

            if (sIsPlgChart) sResVal.plg = sIsPlgChart.plg;
            else sResVal.plg = undefined;

            if (sIsGeomap) sResVal.transformBlockList = [];

            // Normalize the panel for the NEW type BEFORE any block manipulation, using the same repair the
            // loader runs when opening a .dsh. Backfills blockList (to [] if a TQL/legacy panel never had one),
            // each block's values/customFullTyping/filter/table/aggregator, axis/common/chart options, and
            // type-specific deep fields. MUST run before the blockList.map/block.values[0] accesses below —
            // those crash on an un-backfilled (e.g. blockList-undefined) TQL/legacy panel.
            //
            // validateAndRepairDashboardPanel mutates in place, but sResVal is only a shallow copy of the
            // previous Recoil state (deep-frozen in dev) and chartOptions is a shared default-option constant.
            // Deep-clone the structures the repair writes to, so its in-place mutations land on fresh,
            // extensible objects — otherwise validateBlockItem's `block.customFullTyping = {...}` throws
            // "object is not extensible" on the frozen block, and the geomap deep validator would mutate the
            // shared default chartOptions.
            if (Array.isArray(sResVal.blockList)) sResVal.blockList = sResVal.blockList.map((aBlock: any) => structuredClone(aBlock));
            if (sResVal.chartOptions) {
                sResVal.chartOptions = structuredClone(sResVal.chartOptions);
                sResVal.chartInfo = sResVal.chartOptions;
            }
            validateAndRepairDashboardPanel(sResVal);
            // The loader patches xAxisOptions[0].useBlockList in a separate phase (not part of validateAndRepair);
            // YAxisOptions reads it, so ensure it for axis types here.
            if (Array.isArray(sResVal.xAxisOptions) && sResVal.xAxisOptions[0] && !Array.isArray(sResVal.xAxisOptions[0].useBlockList)) {
                sResVal.xAxisOptions = [{ ...sResVal.xAxisOptions[0], useBlockList: [0] }, ...sResVal.xAxisOptions.slice(1)];
            }

            const sBlockCntInfo: CalcBlockTotalType = CalcBlockTotal(sResVal);
            if (sBlockCntInfo.total > sBlockCntInfo.limit) {
                let sLimit = sBlockCntInfo.limit;
                const sQueryBlock = sResVal.blockList.map((qBlock: any) => {
                    if (sLimit > 0) {
                        --sLimit;
                        return { ...qBlock, isVisible: true };
                    } else return { ...qBlock, isVisible: false };
                });
                const sTrxBlock: TrxParsedBlockType[] = sResVal?.transformBlockList?.map((tBlock: TrxParsedBlockType) => {
                    if (sLimit > 0) {
                        --sLimit;
                        return { ...tBlock, isVisible: true };
                    } else return { ...tBlock, isVisible: false };
                });

                sResVal.blockList = sQueryBlock;
                sResVal.transformBlockList = sTrxBlock;
            }

            if (sConvertedChartType !== E_CHART_TYPE.GEOMAP) {
                if (sConvertedChartType !== E_CHART_TYPE.LINE && sConvertedChartType !== E_CHART_TYPE.BAR) {
                    sResVal.blockList = sResVal.blockList.map((block: any) => {
                        return { ...block, values: [block.values[0]], customFullTyping: { use: false, text: '' } };
                    });
                } else {
                    sResVal.blockList = sResVal.blockList.map((block: any) => {
                        return { ...block, values: [block.values[0]] };
                    });
                }
            } else {
                sResVal.blockList = sResVal.blockList.map((block: any) => {
                    const sTmpValues = block.values.map((value: any) => {
                        if (geomapAggregatorList.includes(value.aggregator) || value.aggregator?.match(VARIABLE_REGEX)) return value;
                        else return { ...value, aggregator: geomapAggregatorList[0] };
                    });
                    return { ...block, values: sTmpValues, useCustom: true };
                });
            }

            return sResVal;
        });
    };
    const getHasTrxBlock = useMemo(() => {
        if (pPanelOption?.transformBlockList?.length > 0) return true;
        else return false;
    }, [pPanelOption?.transformBlockList]);

    useEffect(() => {
        let isCancelled = false;
        (async () => {
            try {
                const sRes: any = await getFiles('/public/');
                const sChildren: any[] = sRes?.data?.children ?? sRes?.children ?? [];
                if (isCancelled) return;
                setInstalledPkgs(new Set(sChildren.filter((aChild: any) => aChild.isDir).map((aChild: any) => aChild.name)));
            } catch {
                if (!isCancelled) setInstalledPkgs(new Set());
            }
        })();
        return () => {
            isCancelled = true;
        };
    }, []);

    const sChartTypeOptions = useMemo(() => getAvailableChartTypeKeys(sInstalledPkgs), [sInstalledPkgs]);
    const extensionOptions = entries.filter((entry) => entry.contractVersion === 1).map((entry) => ({ label: entry.label, value: extensionKey(entry) }));
    if (isExtension && !extensionOptions.some((option) => option.value === selected)) {
        extensionOptions.push({ label: 'Unavailable extension', value: selected });
    }

    return (
        <Page style={{ padding: '8px 16px 8px 8px' }}>
            <Page.Body fullHeight style={{ padding: '8px', borderRadius: '4px', border: '1px solid #b8c8da41' }}>
                <ConfirmableSelect
                    pConfirmTrigger="Geomap"
                    pConfirmMessage={`Changing to geomap type will remove transform data.`}
                    pUseConfirmRule={getHasTrxBlock}
                    pFontSize={14}
                    pWidth={'100%'}
                    pBorderRadius={4}
                    pValue={selected}
                    pIsDisabled={props.pExtensionSaving}
                    pHeight={30}
                    onChange={(aEvent: any) => changeTypeOfSeriesOption(aEvent)}
                    pOptions={[...sChartTypeOptions, ...extensionOptions]}
                />
                {isExtension ? (
                    <>
                        {props.pExtensionError && <div role="alert">{props.pExtensionError}</div>}
                        {options?.length ? <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} pExtensionOptions={options} /> : null}
                        <ExtensionErrorBoundary key={selected}>
                            <ExtensionFields definition={props.pExtensionDefinition} area="Options" {...props.pExtensionEditorProps} />
                        </ExtensionErrorBoundary>
                    </>
                ) : <>
                {sUseCommOpt ? <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} /> : null}
                {useXAxis(sChartType as ChartType) && pPanelOption?.xAxisOptions && (
                    <XAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                )}
                {useYAxis(sChartType as ChartType) && pPanelOption?.yAxisOptions && (
                    <YAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                )}
                <Page.Divi />
                {CheckCustomChartType(pPanelOption.type) ? (
                    <>
                        {sChartType === E_CHART_TYPE.GEOMAP ? <GeomapOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {sChartType === E_CHART_TYPE.TEXT ? <TextOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {sChartType === E_CHART_TYPE.TQL ? <TqlOptions /> : null}
                        {sChartType === E_CHART_TYPE.ADV_SCATTER ? (
                            <AdvancedScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                        ) : null}
                        {sChartType === E_CHART_TYPE.VIDEO ? (
                            <VideoOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} pBoardInfo={pBoardInfo} />
                        ) : null}
                    </>
                ) : (
                    <Page.Collapse pTrigger="Chart option">
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            {sChartType === E_CHART_TYPE.LINE ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {sChartType === E_CHART_TYPE.BAR ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {sChartType === E_CHART_TYPE.SCATTER ? (
                                <ScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                            {sChartType === E_CHART_TYPE.PIE ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {sChartType === E_CHART_TYPE.GAUGE ? <GaugeOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {sChartType === E_CHART_TYPE.LIQUID_FILL ? (
                                <LiquidfillOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                        </Page.ContentBlock>
                    </Page.Collapse>
                )}
                </>}
            </Page.Body>
        </Page>
    );
};
export default CreatePanelRight;
