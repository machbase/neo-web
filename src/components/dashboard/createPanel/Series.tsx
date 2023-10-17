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
const Series = ({ pSeriesInfo, pPanelOption, pTableList, pType, pGetTables, pSetPanelOption }: any) => {
    const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>(pSeriesInfo.table[4]);
    // const [sTableInfo, setTableInfo] = useState<any>([]);

    const [sColumnList, setColumnList] = useState<any>([]);

    const setOption = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, [aKey]: aData } : aItem;
                }),
            };
        });
    };

    const changedOption = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value } : aItem;
                }),
            };
        });
        const sTable = pTableList.find((aItem: any) => aItem[3] === aData.target.value);

        if (aKey === 'table') {
            setSelectedTableType(getTableType(sTable[4]));
            getTableType(sTable[4]) === 'tag' && getTagList(aData.target.value);
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    series: aPrev.series.map((aItem: any) => {
                        return aItem.id === pSeriesInfo.id ? { ...aItem, type: getTableType(sTable[4]) } : aItem;
                    }),
                };
            });
            getColumnList(aData.target.value);
        }
    };

    const getColumnList = async (aTable: string) => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === aTable);
        const sData = await getTableInfo(sTable[2]);
        setTimeList(sData.data.rows.filter((aItem: any) => aItem[1] === 6));

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, type: getTableType(sTable[4]), tableInfo: sData.data.rows } : aItem;
                }),
            };
        });

        setColumnList(sData.data.rows);
        if (pType === 'create') {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    series: aPrev.series.map((aItem: any) => {
                        return aItem.id === pSeriesInfo.id
                            ? {
                                  ...aItem,
                                  time: sData.data.rows.filter((aItem: any) => {
                                      return aItem[1] === 6;
                                  })[0][0],
                                  value: sData.data.rows.filter((aItem: any) => {
                                      return (
                                          aItem[1] === 4 ||
                                          aItem[1] === 8 ||
                                          aItem[1] === 12 ||
                                          aItem[1] === 16 ||
                                          aItem[1] === 20 ||
                                          aItem[1] === 104 ||
                                          aItem[1] === 108 ||
                                          aItem[1] === 112
                                      );
                                  })[0][0],
                                  name: sData.data.rows.filter((aItem: any) => {
                                      return aItem[1] === 5;
                                  }),
                              }
                            : aItem;
                    }),
                };
            });
        }
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
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id
                        ? {
                              ...aItem,
                              [aChangedKey]: aItem?.[aChangedKey].map((bItem: any) => {
                                  return bItem.id === aId ? { ...bItem, [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value } : bItem;
                              }),
                          }
                        : aItem;
                }),
            };
        });
    };

    const addValue = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, values: [...aItem.values, { id: getId(), column: '', operator: '=', value: '' }] } : aItem;
                }),
            };
        });
    };
    const addFilter = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, filter: [...aItem.filter, { id: getId(), alias: '', value: '', aggregator: 'avg', useFilter: true }] } : aItem;
                }),
            };
        });
    };

    const deleteSeries = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.filter((aItem: any) => aItem.id !== pSeriesInfo.id),
            };
        });
    };
    const removeValue = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };

    const removeFilter = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                series: aPrev.series.map((aItem: any) => {
                    return aItem.id === pSeriesInfo.id ? { ...aItem, filter: aItem.filter.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };
    useEffect(() => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === pSeriesInfo.table);
        setSelectedTableType(getTableType(sTable[4]));
        getTagList(pSeriesInfo.table);
        getColumnList(pSeriesInfo.table);
    }, []);

    useEffect(() => {
        if (pType === 'create') {
            setOption('tag', sTagList[0]);
        }
    }, [sTagList]);

    useEffect(() => {
        sSelectedTableType === 'log' && setOption('useCustom', true);
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
                    {pSeriesInfo.useCustom && (
                        <div style={!pSeriesInfo.useCustom ? { display: 'none' } : {}} className="row-header-left">
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
                            <div className="details padding-4">
                                <CheckBox
                                    pSize={12}
                                    onChange={(aEvent: any) => changedOption('useRollup', aEvent)}
                                    pDefaultChecked={pPanelOption.useRollup}
                                    pText={'Rollup'}
                                ></CheckBox>
                            </div>
                        </div>
                    )}
                    {!pSeriesInfo.useCustom && (
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
                                {pSeriesInfo.aggregator && (
                                    <Select
                                        pFontSize={12}
                                        pAutoChanged={true}
                                        pWidth={200}
                                        pBorderRadius={4}
                                        pInitValue={pSeriesInfo.aggregator}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                        pOptions={tagAggregatorList}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    <div className="row-header-right">
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsActive={pSeriesInfo.useCustom}
                            pDisabled={sSelectedTableType !== 'tag'}
                            pIcon={pSeriesInfo.useCustom ? <VscSync color="#FDB532"></VscSync> : <VscSync></VscSync>}
                            onClick={sSelectedTableType !== 'tag' ? () => {} : () => setOption('useCustom', !pSeriesInfo.useCustom)}
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
                {pSeriesInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={!pSeriesInfo.useCustom ? { display: 'none' } : {}} className="details">
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
                {pSeriesInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={!pSeriesInfo.useCustom ? { display: 'none' } : {}} className="details">
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
