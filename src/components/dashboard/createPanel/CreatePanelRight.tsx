import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { ChartCommonOptions } from './option/ChartCommonOptions';
import { CheckCustomChartType, chartTypeConverter, getAvailableChartTypeKeys } from '@/utils/eChartHelper';
import { buildPanelOptionForType } from '@/utils/dashboardPanelTypeChange';
import { PieOptions } from './option/PieOptions';
import { LineOptions } from './option/LineOptions';
import { XAxisOptions } from './option/XAxisOptions';
import { useXAxis, useYAxis } from '@/utils/dashboardUtil';
import { YAxisOptions } from './option/YAxisOptions';
import { BarOptions } from './option/BarOptions';
import { ScatterOptions } from './option/ScatterOptions';
import { GaugeOptions } from './option/GaugeOptions';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { LiquidfillOptions } from './option/LiquidfillOptions';
import { TqlOptions } from './option/TqlOptions';
import { VideoOptions } from './option/VideoOptions';
import { TextOptions } from './option/TextOptions';
import { GeomapOptions } from './option/GeomapOptions';
import { AdvancedScatterOptions } from './option/AdvanceScatter';
import { ConfirmableSelect } from '@/components/inputs/ConfirmableSelect';
import { Page } from '@/design-system/components';
import { getFiles } from '@/api/repository/fileTree';

interface CreatePanelRightProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pType: undefined | 'create' | 'edit';
    pBoardInfo?: any;
}

const CreatePanelRight = (props: CreatePanelRightProps) => {
    const { pPanelOption, pSetPanelOption, pType, pBoardInfo } = props;
    const [sInstalledPkgs, setInstalledPkgs] = useState<Set<string>>(new Set());
    const sIsTql = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TQL;
    const sIsVideo = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.VIDEO;
    const sUseCommOpt = !(sIsTql || sIsVideo);

    const changeTypeOfSeriesOption = (aEvent: ChangeEvent<HTMLInputElement>) => {
        const sTypeKey = aEvent.target.value;
        pSetPanelOption((aPrev: any) => buildPanelOptionForType(aPrev, sTypeKey, pType));
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
                    pValue={pPanelOption.type}
                    pHeight={30}
                    onChange={(aEvent: any) => changeTypeOfSeriesOption(aEvent)}
                    pOptions={sChartTypeOptions}
                />
                {sUseCommOpt ? <ChartCommonOptions pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} /> : null}
                {useXAxis(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption?.xAxisOptions && (
                    <XAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                )}
                {useYAxis(chartTypeConverter(pPanelOption.type) as ChartType) && pPanelOption?.yAxisOptions && (
                    <YAxisOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                )}
                <Page.Divi />
                {CheckCustomChartType(pPanelOption.type) ? (
                    <>
                        {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.GEOMAP ? <GeomapOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TEXT ? <TextOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                        {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TQL ? <TqlOptions /> : null}
                        {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? (
                            <AdvancedScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                        ) : null}
                        {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.VIDEO ? (
                            <VideoOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} pBoardInfo={pBoardInfo} />
                        ) : null}
                    </>
                ) : (
                    <Page.Collapse pTrigger="Chart option">
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.LINE ? <LineOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.BAR ? <BarOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.SCATTER ? (
                                <ScatterOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.PIE ? <PieOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.GAUGE ? <GaugeOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} /> : null}
                            {chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.LIQUID_FILL ? (
                                <LiquidfillOptions pSetPanelOption={pSetPanelOption} pPanelOption={pPanelOption} />
                            ) : null}
                        </Page.ContentBlock>
                    </Page.Collapse>
                )}
            </Page.Body>
        </Page>
    );
};
export default CreatePanelRight;
