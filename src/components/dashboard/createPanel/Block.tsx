import { getTableInfo } from '@/api/repository/api';
import { fetchTags, getRollupTableList } from '@/api/repository/machiot';
import { Close, Refresh, VscSync } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import { createDefaultTagTableOption, getTableType, isNumberTypeColumn, tagAggregatorList } from '@/utils/dashboardUtil';
import { useEffect, useState } from 'react';
import Filter from './Filter';
import './Block.scss';
import Value from './Value';
import { useSetRecoilState } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { CompactPicker } from 'react-color';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef } from 'react';
import { Input } from '@/components/inputs/Input';
import { TagColorList } from '@/utils/constants';

export const Block = ({ pBlockInfo, pPanelOption, pTableList, pType, pGetTables, pSetPanelOption, pValueLimit }: any) => {
    const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>('');
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sIsLoadingRollup, setIsLoadingRollup] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<any>([]);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);
    const sColorPickerRef = useRef<any>(null);

    const setOption = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? { ...aItem, [aKey]: aData } : aItem;
                }),
            };
        });
    };

    const changedOption = async (aKey: string, aData: any) => {
        if (aKey === 'table') {
            const sTargetTable = pTableList.find((aItem: any) => aItem[3] === aData.target.value);
            setSelectedTableType(getTableType(sTargetTable[4]));
            let sTagList: any = [];
            if (getTableType(sTargetTable[4]) === 'tag') sTagList = await getTagList(aData.target.value);
            const sDefaultBlockOption = createDefaultTagTableOption(sTargetTable[1], sTargetTable, getTableType(sTargetTable[4]), sTagList[0]);
            const sTempTableList = JSON.parse(JSON.stringify(pPanelOption.blockList)).map((aTable: any, aIdx: number) => {
                return aTable.id === pBlockInfo.id ? { ...sDefaultBlockOption[0], id: generateUUID(), color: TagColorList[aIdx] } : aTable;
            });
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: sTempTableList,
                };
            });
            getColumnList(aData.target.value);
        } else {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: aPrev.blockList.map((aItem: any) => {
                        return aItem.id === pBlockInfo.id ? { ...aItem, [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value } : aItem;
                    }),
                };
            });
        }
    };

    const getColumnList = async (aTable: string) => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === aTable);
        const sData = await getTableInfo(sTable[6], sTable[2]);

        setTimeList(sData.data.rows.filter((aItem: any) => aItem[1] === 6));

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? { ...aItem, type: getTableType(sTable[4]), tableInfo: sData.data.rows } : aItem;
                }),
            };
        });

        setColumnList(sData.data.rows);
        if (pType === 'create') {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: aPrev.blockList.map((aItem: any) => {
                        return aItem.id === pBlockInfo.id
                            ? {
                                  ...aItem,
                                  time: sData.data.rows.filter((aItem: any) => {
                                      return aItem[1] === 6;
                                  })[0][0],
                                  value: sData.data.rows.filter((aItem: any) => {
                                      return isNumberTypeColumn(aItem[1]);
                                  })[0][0],
                                  name: sData.data.rows.filter((aItem: any) => {
                                      return aItem[1] === 5;
                                  }),
                                  values: aItem.values.map((aItem: any) => {
                                      return {
                                          ...aItem,
                                          value: sData.data.rows.filter((aItem: any) => {
                                              return isNumberTypeColumn(aItem[1]);
                                          })[0][0],
                                      };
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
        if (sData && sData.success && sData.data && sData.data.rows && sData.data.rows.length > 0) {
            const sTagList = sData.data.rows.map((aItem: any) => {
                return aItem[1];
            });
            setTagList(sTagList);
            return sTagList;
        } else {
            setTagList([]);
            return [];
        }
    };
    const changeValueOption = (aKey: string, aData: any, aId: string, aChangedKey: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id
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
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? { ...aItem, values: [...aItem.values, { id: generateUUID(), alias: '', value: '', aggregator: 'avg' }] } : aItem;
                }),
            };
        });
    };
    const addFilter = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id
                        ? { ...aItem, filter: [...aItem.filter, { id: generateUUID(), value: '', operator: '=', useFilter: true, useTyping: false }] }
                        : aItem;
                }),
            };
        });
    };

    const deleteSeries = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.filter((aItem: any) => aItem.id !== pBlockInfo.id),
            };
        });
    };
    const removeValue = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };

    const removeFilter = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? { ...aItem, filter: aItem.filter.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };
    /** Update Table + Rollup */
    const HandleTable = async () => {
        setIsLoadingRollup(() => true);
        // Rollup
        setRollupTabls(await getRollupTableList());
        // Table
        await pGetTables();
        setIsLoadingRollup(() => false);
    };

    useEffect(() => {
        sSelectedTableType === 'log' && setOption('useCustom', true);
        sSelectedTableType === 'tag' &&
            pSetPanelOption({
                ...pPanelOption,
                blockList: pPanelOption.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id
                        ? {
                              ...aItem,
                              values: aItem.values.filter((aItem: any, aIdx: number) => {
                                  aItem;
                                  return aIdx === 0;
                              }),
                          }
                        : aItem;
                }),
            });
    }, [sSelectedTableType]);

    useEffect(() => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === pBlockInfo.table);
        const sTableType = getTableType(sTable[4]);
        setSelectedTableType(sTableType);

        getColumnList(pBlockInfo.table);
        if (sTableType === 'tag') getTagList(pBlockInfo.table);
    }, []);

    useEffect(() => {
        if (pBlockInfo.type === 'tag') setOption('tag', pBlockInfo.tag !== '' ? pBlockInfo.tag : sTagList[0]);
    }, [sTagList]);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

    return (
        <div className="series">
            <div className="row">
                <div className="row-header">
                    {pBlockInfo.useCustom && (
                        <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="row-header-left">
                            {/* TABLE */}
                            <div className="series-table">
                                <span className="series-title">
                                    Table <IconButton pDisabled={sIsLoadingRollup} pWidth={25} pHeight={26} pIcon={<Refresh />} onClick={HandleTable} />
                                </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pBlockInfo.table}
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
                        </div>
                    )}
                    {!pBlockInfo.useCustom && (
                        <div className="row-header-left">
                            <div className="series-table">
                                <span className="series-title">
                                    Table <IconButton pDisabled={sIsLoadingRollup} pWidth={25} pHeight={26} pIcon={<Refresh />} onClick={HandleTable} />
                                </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pBlockInfo.table}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('table', aEvent)}
                                    pOptions={pTableList.map((aItem: any) => {
                                        return aItem[3];
                                    })}
                                />
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Tag </span>
                                {sTagList[0] && (
                                    <Select
                                        pFontSize={12}
                                        pWidth={175}
                                        pAutoChanged={true}
                                        pBorderRadius={4}
                                        pInitValue={pBlockInfo.tag}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                        pOptions={sTagList}
                                        pIsDisabled={sTagList.length <= 0}
                                    />
                                )}
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Alias </span>
                                <Input
                                    pBorderRadius={4}
                                    pWidth={175}
                                    pHeight={26}
                                    pType="text"
                                    pValue={pBlockInfo.alias}
                                    pSetValue={() => null}
                                    onChange={(aEvent: any) => changedOption('alias', aEvent)}
                                />
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Aggregator </span>
                                {pBlockInfo.aggregator && (
                                    <Select
                                        pFontSize={12}
                                        pAutoChanged={true}
                                        pWidth={175}
                                        pBorderRadius={4}
                                        pInitValue={pBlockInfo.aggregator}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                        pOptions={tagAggregatorList}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                    <div className="row-header-right">
                        <div ref={sColorPickerRef} style={{ position: 'relative' }}>
                            <IconButton
                                pWidth={20}
                                pHeight={20}
                                pIcon={
                                    <div
                                        style={{ width: '14px', cursor: 'pointer', height: '14px', marginRight: '4px', borderRadius: '50%', backgroundColor: pBlockInfo.color }}
                                    ></div>
                                }
                                onClick={() => setIsColorPicker(!sIsColorPicker)}
                            />

                            {sIsColorPicker && (
                                <div className="color-picker">
                                    <CompactPicker
                                        color={pBlockInfo.color}
                                        onChangeComplete={(aInfo: any) => {
                                            setOption('color', aInfo.hex);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsActive={pBlockInfo.useCustom}
                            pDisabled={sSelectedTableType !== 'tag'}
                            pIcon={<VscSync />}
                            onClick={sSelectedTableType !== 'tag' ? () => {} : () => setOption('useCustom', !pBlockInfo.useCustom)}
                        />
                        <IconButton
                            pDisabled={pPanelOption.blockList.length === 1}
                            pWidth={20}
                            pHeight={20}
                            pIcon={<Close />}
                            onClick={pPanelOption.blockList.length !== 1 ? () => deleteSeries() : () => {}}
                        />
                    </div>
                </div>
                {pBlockInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}
                <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="details">
                    <div>
                        {pBlockInfo.values.map((aItem: any, aIdx: number) => {
                            return (
                                <Value
                                    key={aItem.id}
                                    pChangeValueOption={changeValueOption}
                                    pAddValue={addValue}
                                    pRemoveValue={removeValue}
                                    pBlockInfo={pBlockInfo}
                                    pValue={aItem}
                                    pIdx={aIdx}
                                    pColumnList={sColumnList.filter((aItem: any) => isNumberTypeColumn(aItem[1]))}
                                    pValueLimit={pValueLimit}
                                ></Value>
                            );
                        })}
                    </div>
                </div>
                {pBlockInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="details">
                    <div>
                        {pBlockInfo.filter.map((aItem: any, aIdx: number) => {
                            return (
                                <Filter
                                    key={aItem.id}
                                    pColumnList={sColumnList}
                                    pBlockInfo={pBlockInfo}
                                    pFilterInfo={aItem}
                                    pChangeValueOption={changeValueOption}
                                    pIdx={aIdx}
                                    pAddFilter={addFilter}
                                    pRemoveFilter={removeFilter}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};