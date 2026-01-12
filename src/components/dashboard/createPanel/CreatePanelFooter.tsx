import { Block } from './Block';
import { useEffect, useMemo, useState } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { generateUUID } from '@/utils';
import { TqlBlock } from './TqlBlock';
import { getTagColor, getUseColorList } from '@/utils/helpers/tags';
import { Transform } from './Transform';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { ChartType, E_CHART_TYPE } from '@/type/eChart';
import { ALLOWED_TRX_CHART_TYPE, CheckAllowedTransformChartType, E_ALLOW_CHART_TYPE } from '@/utils/Chart/TransformDataParser';
import { CalcBlockTotal, CalcBlockTotalType } from '@/utils/helpers/Dashboard/BlockHelper';
import { Button, Page } from '@/design-system/components';
import { TimeRangeBlock } from './TimeRangeBlock';

type FOOTER_MENU_TYPE = 'Series' | 'Transform' | 'Time';

const CreatePanelFooter = ({ pTableList, pVariables, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const [sTab, setTab] = useState<FOOTER_MENU_TYPE>('Series');

    const HandleAddBlock = () => {
        pSetPanelOption((aPrev: any) => {
            const sTmpPanelOpt = JSON.parse(
                JSON.stringify({
                    ...aPrev,
                    blockList: [
                        ...aPrev.blockList,
                        {
                            ...aPrev.blockList.at(-1),
                            aggregator: aPrev.type === 'Text' ? 'value' : aPrev.blockList.at(-1).aggregator,
                            id: generateUUID(),
                            color: getTagColor(getUseColorList(aPrev.blockList)),
                            math: '',
                            isValidMath: true,
                            alias: '',
                            tag: '',
                            values: aPrev.blockList.at(-1).values.map((val: any) => {
                                return { ...val, aggregator: aPrev.type === 'Text' ? 'value' : aPrev.blockList.at(-1).aggregator, id: generateUUID(), alias: '' };
                            }),
                            filter: aPrev.blockList.at(-1).filter.map((val: any) => {
                                return { ...val, value: '' };
                            }),
                        },
                    ],
                })
            );

            if (aPrev.type === 'Geomap')
                sTmpPanelOpt.chartOptions = {
                    ...sTmpPanelOpt.chartOptions,
                    coorLat: sTmpPanelOpt.chartOptions.coorLat.concat([0]),
                    coorLon: sTmpPanelOpt.chartOptions.coorLon.concat([1]),
                    marker: sTmpPanelOpt.chartOptions.marker.concat({ shape: 'circle', radius: 150 }),
                };
            return sTmpPanelOpt;
        });
    };

    const getBlockCount = useMemo(() => {
        const sResult: CalcBlockTotalType = CalcBlockTotal(pPanelOption);
        return sResult;
    }, [pPanelOption.blockList, pPanelOption.transformBlockList, pPanelOption.type]);

    useEffect(() => {
        if (!ALLOWED_TRX_CHART_TYPE.includes(chartTypeConverter(pPanelOption.type) as E_CHART_TYPE & E_ALLOW_CHART_TYPE)) setTab('Series');
    }, [pPanelOption.type]);

    return (
        <Page style={{ padding: '8px 8px 8px 16px' }}>
            {pPanelOption.type !== 'Tql chart' && pPanelOption.type !== 'Blackbox' && (
                <>
                    <Page.TabContainer>
                        <Page.TabList>
                            <Page.TabItem active={sTab === 'Series'} onClick={() => setTab('Series')} badge={getBlockCount.query}>
                                Series
                            </Page.TabItem>
                            {CheckAllowedTransformChartType(chartTypeConverter(pPanelOption.type) as ChartType) && (
                                <Page.TabItem active={sTab === 'Transform'} onClick={() => setTab('Transform')} badge={getBlockCount.trx}>
                                    Transform
                                </Page.TabItem>
                            )}
                            {pTableList.length !== 0 && (
                                <Page.TabItem active={sTab === 'Time'} onClick={() => setTab('Time')}>
                                    Time
                                </Page.TabItem>
                            )}
                        </Page.TabList>
                        <Page.TabInfo>
                            <span>Total</span>
                            <span className="page-tab-badge" style={{ width: '36px' }}>{`${getBlockCount.total} / ${getBlockCount.limit}`}</span>
                        </Page.TabInfo>
                    </Page.TabContainer>
                    <Page.Body style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', border: '1px solid #b8c8da41', padding: '6px', gap: '8px' }}>
                        {sTab === 'Series' ? (
                            <>
                                {pTableList.length !== 0 &&
                                    pPanelOption.blockList.map((aItem: any, aIdx: number) => {
                                        return (
                                            <Block
                                                key={aItem.id}
                                                pBlockOrder={aIdx}
                                                pVariables={pVariables}
                                                pType={pType}
                                                pPanelOption={pPanelOption}
                                                pTableList={pTableList}
                                                pGetTables={pGetTables}
                                                pBlockInfo={aItem}
                                                pSetPanelOption={pSetPanelOption}
                                                pBlockCount={getBlockCount}
                                            />
                                        );
                                    })}
                                {/* ADD Block */}
                                {pTableList?.length !== 0 ? (
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        shadow
                                        autoFocus={false}
                                        disabled={!getBlockCount.addable}
                                        icon={<PlusCircle size={16} />}
                                        onClick={HandleAddBlock}
                                        style={{ height: '60px' }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        Please create a table.
                                    </div>
                                )}
                            </>
                        ) : (
                            <></>
                        )}
                        {sTab === 'Transform' ? (
                            <Transform pPanelOption={pPanelOption} pVariables={pVariables} pSetPanelOption={pSetPanelOption} pBlockCount={getBlockCount} />
                        ) : (
                            <></>
                        )}
                        {sTab === 'Time' ? <TimeRangeBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} /> : <></>}
                    </Page.Body>
                </>
            )}
            {pPanelOption.type === 'Tql chart' && <TqlBlock pPanelOption={pPanelOption} pSetPanelOption={pSetPanelOption} />}
            {pPanelOption.type === 'Blackbox' && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Blackbox panel has no series configuration.
                </div>
            )}
        </div>
        </Page>
    );
};
export default CreatePanelFooter;
