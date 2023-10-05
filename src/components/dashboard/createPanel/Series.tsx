import { getTableInfo } from '@/api/repository/api';
import { fetchTags } from '@/api/repository/machiot';
import { Close, Refresh, VscSync } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import CheckBox from '@/components/inputs/CheckBox';
import { Select } from '@/components/inputs/Select';
import { getId } from '@/utils';
import { getTableType, tagAggregatorList } from '@/utils/dashboardUtil';
import { useEffect, useState } from 'react';
import Filter from './Filter';
import './Series.scss';
import Value from './Value';
const Series = ({ pSeriesInfo, pPanelOption, pTableList, pGetTables, pSetPanelOption }: any) => {
    const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>(pSeriesInfo.table[4]);

    const [sColumnList, setColumnList] = useState<any>([]);
    const [sCollapse, setCollapse] = useState(true);

    const changedOption = (aKey: string, aData: any) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, [aKey]: aData.target.value } : aItem;
            }),
        });
        const sTable = pTableList.find((aItem: any) => aItem[3] === aData.target.value);

        if (aKey === 'table') {
            setSelectedTableType(getTableType(sTable[4]));
            getTableType(sTable[4]) === 'tag' ? getTagList(aData.target.value) : sTable[4];
            getColumnList(aData.target.value);
        }
    };

    const getColumnList = async (aTable: string) => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === aTable);
        const sData = await getTableInfo(sTable[2]);
        setTimeList(sData.data.rows.filter((aItem: any) => aItem[1] === 6));

        setColumnList(sData.data.rows);
    };

    const getTagList = async (aTable: any) => {
        const sData: any = await fetchTags(aTable);
        setTagList(
            sData.data.rows.map((aItem: any) => {
                return aItem[1];
            })
        );
    };
    const changeValueOption = (aKey: string, aData: any, aId: string, aChangedKey: string) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id
                    ? {
                          ...aItem,
                          [aChangedKey]: aItem?.[aChangedKey].map((bItem: any) => {
                              return bItem.id === aId ? { ...bItem, [aKey]: aData.target.value } : bItem;
                          }),
                      }
                    : aItem;
            }),
        });
    };

    const addValue = () => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, values: [...aItem.values, { id: getId(), column: '', operator: '', value: '' }] } : aItem;
            }),
        });
    };
    const addFilter = () => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, filter: [...aItem.filter, { id: getId(), alias: '', value: '', aggregator: '' }] } : aItem;
            }),
        });
    };

    const deleteSeries = () => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.filter((aItem: any) => aItem.id !== pSeriesInfo.id),
        });
    };
    const removeValue = (aId: string) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any) => aItem.id !== aId) } : aItem;
            }),
        });
    };

    const removeFilter = (aId: string) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, filter: aItem.filter.filter((aItem: any) => aItem.id !== aId) } : aItem;
            }),
        });
    };
    useEffect(() => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === pSeriesInfo.table);
        setSelectedTableType(getTableType(sTable[4]));
        getTagList(pSeriesInfo.table);
        getColumnList(pSeriesInfo.table);
    }, []);

    useEffect(() => {
        sSelectedTableType === 'log' && setCollapse(false);
        sSelectedTableType === 'tag' &&
            pSetPanelOption({
                ...pPanelOption,
                series: pPanelOption.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any, aIdx: number) => aIdx === 0) } : aItem;
                }),
            });
    }, [sSelectedTableType]);

    return (
        <div className="series">
            <div className="row">
                <div className="row-header">
                    {!sCollapse && (
                        <div style={sCollapse ? { display: 'none' } : {}} className="row-header-left">
                            <div className="series-table">
                                <span className="series-title">
                                    Table
                                    <IconButton pWidth={25} pHeight={26} pIcon={<Refresh></Refresh>} onClick={() => pGetTables()}></IconButton>
                                </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pSeriesInfo.table}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('table', aEvent)}
                                    pOptions={pTableList.map((aItem: any) => aItem[3])}
                                />
                            </div>
                            <div className="details">
                                <div className="series-table">
                                    <span className="series-title"> TimeField </span>
                                    {sTimeList[0] && (
                                        <Select
                                            pFontSize={12}
                                            pAutoChanged={true}
                                            pWidth={175}
                                            pBorderRadius={4}
                                            pInitValue={sTimeList[0] && sTimeList[0][0]}
                                            pHeight={26}
                                            onChange={(aEvent: any) => changedOption('time', aEvent)}
                                            pOptions={sTimeList.map((aItem: any) => {
                                                return aItem[0];
                                            })}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="details">
                                <span className="series-title"> use </span>
                                <CheckBox
                                    pSize={12}
                                    onChange={(aEvent: any) => changedOption('useRollup', aEvent.target.value)}
                                    pDefaultChecked={pPanelOption.useRollup}
                                    pText={'Rollup'}
                                ></CheckBox>
                            </div>
                        </div>
                    )}
                    {sCollapse && (
                        <div className="row-header-left">
                            <div className="series-table">
                                <span className="series-title"> Table </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pSeriesInfo.table}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('table', aEvent)}
                                    pOptions={pTableList.map((aItem: any) => {
                                        return aItem[3];
                                    })}
                                />
                                <IconButton pWidth={25} pHeight={26} pIcon={<Refresh></Refresh>} onClick={() => pGetTables()}></IconButton>
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Tag </span>
                                {sTagList[0] && (
                                    <Select
                                        pFontSize={12}
                                        pWidth={200}
                                        pAutoChanged={true}
                                        pBorderRadius={4}
                                        pInitValue={pSeriesInfo.tag ? pSeriesInfo.tag : sTagList[0]}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                        pOptions={sTagList}
                                    />
                                )}
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Aggregator </span>
                                <Select
                                    pFontSize={12}
                                    pAutoChanged={true}
                                    pWidth={200}
                                    pBorderRadius={4}
                                    pInitValue={tagAggregatorList[0]}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                    pOptions={tagAggregatorList}
                                />
                            </div>
                        </div>
                    )}
                    <div className="row-header-right">
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsActive={!sCollapse}
                            pDisabled={sSelectedTableType !== 'tag'}
                            pIcon={!sCollapse ? <VscSync color="#FDB532"></VscSync> : <VscSync></VscSync>}
                            onClick={sSelectedTableType !== 'tag' ? () => {} : () => setCollapse(!sCollapse)}
                        ></IconButton>
                        <IconButton
                            pDisabled={pPanelOption.series.length === 1}
                            pWidth={20}
                            pHeight={20}
                            pIcon={<Close></Close>}
                            onClick={pPanelOption.series.length !== 1 ? () => deleteSeries() : () => {}}
                        ></IconButton>
                    </div>
                </div>
                {!sCollapse && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={sCollapse ? { display: 'none' } : {}} className="details">
                    <div>
                        {pSeriesInfo.values.map((aItem: any, aIdx: number) => {
                            return (
                                <Value
                                    key={aItem.id}
                                    pSelectedTableType={sSelectedTableType}
                                    pChangeValueOption={changeValueOption}
                                    pAddValue={addValue}
                                    pRemoveValue={removeValue}
                                    pSeriesInfo={pSeriesInfo}
                                    pValue={aItem}
                                    pIdx={aIdx}
                                    pCloumnList={sColumnList}
                                ></Value>
                            );
                        })}
                    </div>
                </div>
                {!sCollapse && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={sCollapse ? { display: 'none' } : {}} className="details">
                    <div>
                        {pSeriesInfo.filter.map((aItem: any, aIdx: number) => {
                            return (
                                <Filter
                                    key={aItem.id}
                                    pCloumnList={sColumnList}
                                    pSeriesInfo={pSeriesInfo}
                                    pFilterInfo={aItem}
                                    pChangeValueOption={changeValueOption}
                                    pIdx={aIdx}
                                    pAddFilter={addFilter}
                                    pRemoveFilter={removeFilter}
                                ></Filter>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Series;
