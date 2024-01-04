import { getTableInfo } from '@/api/repository/api';
import { fetchTags } from '@/api/repository/machiot';
import { Close, Refresh, VscSync } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import CheckBox from '@/components/inputs/CheckBox';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import { getTableType, isNumberTypeColumn, tagAggregatorList } from '@/utils/dashboardUtil';
import { useEffect, useState } from 'react';
import Filter from './Filter';
import './Series.scss';
import { CompactPicker } from 'react-color';

import Value from './Value';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef } from 'react';

const Series = ({ pTagTableInfo, pPanelOption, pTableList, pType, pGetTables, pSetPanelOption }: any) => {
    const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>('');
    // const [sTableInfo, setTableInfo] = useState<any>([]);

    const [sColumnList, setColumnList] = useState<any>([]);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);
    const sColorPickerRef = useRef<any>(null);

    const setOption = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, [aKey]: aData } : aItem;
                }),
            };
        });
    };

    const changedOption = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value } : aItem;
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
                    tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                        return aItem.id === pTagTableInfo.id ? { ...aItem, type: getTableType(sTable[4]) } : aItem;
                    }),
                };
            });
            getColumnList(aData.target.value);
        }
    };

    const getColumnList = async (aTable: string) => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === aTable);
        const sData = await getTableInfo(sTable[6], sTable[2]);
        setTimeList(sData.data.rows.filter((aItem: any) => aItem[1] === 6));

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, type: getTableType(sTable[4]), tableInfo: sData.data.rows } : aItem;
                }),
            };
        });

        setColumnList(sData.data.rows);
        if (pType === 'create') {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                        return aItem.id === pTagTableInfo.id
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
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id
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
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, values: [...aItem.values, { id: generateUUID(), column: '', operator: '=', value: '' }] } : aItem;
                }),
            };
        });
    };
    const addFilter = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, filter: [...aItem.filter, { id: generateUUID(), value: '', operator: '=', useFilter: true }] } : aItem;
                }),
            };
        });
    };

    const deleteSeries = () => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.filter((aItem: any) => aItem.id !== pTagTableInfo.id),
            };
        });
    };
    const removeValue = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };

    const removeFilter = (aId: string) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                tagTableInfo: aPrev.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id ? { ...aItem, filter: aItem.filter.filter((aItem: any) => aItem.id !== aId) } : aItem;
                }),
            };
        });
    };

    useEffect(() => {
        sSelectedTableType === 'log' && setOption('useCustom', true);
        sSelectedTableType === 'tag' &&
            pSetPanelOption({
                ...pPanelOption,
                tagTableInfo: pPanelOption.tagTableInfo.map((aItem: any) => {
                    return aItem.id === pTagTableInfo.id
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
        const sTable = pTableList.find((aItem: any) => aItem[3] === pTagTableInfo.table);
        const sTableType = getTableType(sTable[4]);
        setSelectedTableType(sTableType);

        getColumnList(pTagTableInfo.table);
        if (sTableType === 'tag') {
            getTagList(pTagTableInfo.table);
        }
    }, []);

    useEffect(() => {
        if (pType === 'create') {
            setOption('tag', sTagList[0]);
        }
    }, [sTagList]);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));

    return (
        <div className="series">
            <div className="row">
                <div className="row-header">
                    {pTagTableInfo.useCustom && (
                        <div style={{ display: !pTagTableInfo.useCustom ? 'none' : '' }} className="row-header-left">
                            <div className="series-table">
                                <span className="series-title">
                                    Table
                                    <IconButton pWidth={25} pHeight={26} pIcon={<Refresh />} onClick={() => pGetTables()}></IconButton>
                                </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pTagTableInfo.table}
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
                                    pIsDisabled={sSelectedTableType !== 'tag'}
                                    onChange={(aEvent: any) => changedOption('useRollup', aEvent)}
                                    pDefaultChecked={pPanelOption.useRollup}
                                    pText={'Rollup'}
                                ></CheckBox>
                            </div>
                        </div>
                    )}
                    {!pTagTableInfo.useCustom && (
                        <div className="row-header-left">
                            <div className="series-table">
                                <span className="series-title"> Table </span>
                                <Select
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pTagTableInfo.table}
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
                                        pInitValue={pTagTableInfo.tag ? pTagTableInfo.tag : sTagList[0]}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                        pOptions={sTagList}
                                    />
                                )}
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Aggregator </span>
                                {pTagTableInfo.aggregator && (
                                    <Select
                                        pFontSize={12}
                                        pAutoChanged={true}
                                        pWidth={200}
                                        pBorderRadius={4}
                                        pInitValue={pTagTableInfo.aggregator}
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
                                        style={{ width: '14px', cursor: 'pointer', height: '14px', marginRight: '4px', borderRadius: '50%', backgroundColor: pTagTableInfo.color }}
                                    ></div>
                                }
                                onClick={() => setIsColorPicker(!sIsColorPicker)}
                            ></IconButton>

                            {sIsColorPicker && (
                                <div className="color-picker">
                                    <CompactPicker
                                        color={pTagTableInfo.color}
                                        onChangeComplete={(aInfo: any) => {
                                            setOption('color', aInfo.hex);
                                        }}
                                    ></CompactPicker>
                                </div>
                            )}
                        </div>
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsActive={pTagTableInfo.useCustom}
                            pDisabled={sSelectedTableType !== 'tag'}
                            pIcon={<VscSync />}
                            onClick={sSelectedTableType !== 'tag' ? () => {} : () => setOption('useCustom', !pTagTableInfo.useCustom)}
                        ></IconButton>
                        <IconButton
                            pDisabled={pPanelOption.tagTableInfo.length === 1}
                            pWidth={20}
                            pHeight={20}
                            pIcon={<Close></Close>}
                            onClick={pPanelOption.tagTableInfo.length !== 1 ? () => deleteSeries() : () => {}}
                        ></IconButton>
                    </div>
                </div>
                {pTagTableInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={{ display: !pTagTableInfo.useCustom ? 'none' : '' }} className="details">
                    <div>
                        {pTagTableInfo.values.map((aItem: any, aIdx: number) => {
                            return (
                                <Value
                                    key={aItem.id}
                                    pSelectedTableType={sSelectedTableType}
                                    pChangeValueOption={changeValueOption}
                                    pAddValue={addValue}
                                    pRemoveValue={removeValue}
                                    pTagTableInfo={pTagTableInfo}
                                    pValue={aItem}
                                    pIdx={aIdx}
                                    pColumnList={sColumnList.filter((aItem: any) => isNumberTypeColumn(aItem[1]))}
                                ></Value>
                            );
                        })}
                    </div>
                </div>
                {pTagTableInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}

                <div style={{ display: !pTagTableInfo.useCustom ? 'none' : '' }} className="details">
                    <div>
                        {pTagTableInfo.filter.map((aItem: any, aIdx: number) => {
                            return (
                                <Filter
                                    key={aItem.id}
                                    pColumnList={sColumnList}
                                    pTagTableInfo={pTagTableInfo}
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
