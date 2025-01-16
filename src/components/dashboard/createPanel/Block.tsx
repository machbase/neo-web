import { getTableInfo, getVirtualTableInfo } from '@/api/repository/api';
import { getRollupTableList, getTqlChart } from '@/api/repository/machiot';
import { BsArrowsCollapse, BsArrowsExpand, Close, Refresh, TbMath, TbMathOff } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Select } from '@/components/inputs/Select';
import { generateUUID } from '@/utils';
import {
    DIFF_LIST,
    SEPARATE_DIFF,
    createDefaultTagTableOption,
    getTableType,
    isNumberTypeColumn,
    logAggregatorList,
    nameValueAggregatorList,
    nameValueVirtualAggList,
    tagAggregatorList,
} from '@/utils/dashboardUtil';
import { useEffect, useMemo, useState } from 'react';
import Filter from './Filter';
import './Block.scss';
import Value from './Value';
import { useSetRecoilState } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { CompactPicker } from 'react-color';
import useOutsideClick from '@/hooks/useOutsideClick';
import { useRef } from 'react';
import { Input } from '@/components/inputs/Input';
import { SqlResDataType, mathValueConverter } from '@/utils/DashboardQueryParser';
import { Error } from '@/components/toast/Toast';
import { chartTypeConverter } from '@/utils/eChartHelper';
import { TagSearchSelect } from '@/components/inputs/TagSearchSelect';
import { Duration } from './Duration';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';

export const Block = ({ pVariableList, pBlockInfo, pPanelOption, pTableList, pType, pGetTables, pSetPanelOption, pValueLimit }: any) => {
    // const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>('');
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sIsLoadingRollup, setIsLoadingRollup] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<any>([]);
    const [sIsColorPicker, setIsColorPicker] = useState<boolean>(false);
    const [sIsMath, setIsMath] = useState<boolean>(false);
    const [sFormulaSelection, setFormulaSelection] = useState<boolean>(false);
    const sColorPickerRef = useRef<any>(null);
    const sMathRef = useRef<any>(null);

    /** return variable list */
    const getVariableList = useMemo((): string[] => {
        return pVariableList?.map((variable: any) => variable.key);
    }, [pVariableList]);
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
            const sIsVirtualTable = aData.target.value.includes('V$');
            const sTargetTableName = sIsVirtualTable ? aData.target.value.replace('V$', '').replace('_STAT', '') : aData.target.value;
            const sTargetTable = pTableList.find((aItem: any) => aItem[3] === sTargetTableName);
            const sIsVariable = aData.target.value.match(VARIABLE_REGEX);

            if (sIsVirtualTable) setSelectedTableType('vir_tag');
            else if (sIsVariable) setSelectedTableType('variable_tag');
            else setSelectedTableType(getTableType(sTargetTable[4]));

            const sDefaultBlockOption = sTargetTable
                ? // TAG | LOG | VIR
                  createDefaultTagTableOption(sTargetTable[1], sTargetTable, getTableType(sTargetTable[4]), '')
                : // VARIABLE
                  createDefaultTagTableOption('', ['', '', '', aData.target.value], '', '');

            if (sIsVirtualTable) {
                sDefaultBlockOption[0].useCustom = true;
                sDefaultBlockOption[0].table = aData.target.value;
                sDefaultBlockOption[0].values = [{ id: sDefaultBlockOption[0].values[0].id, aggregator: 'sum', value: '', alias: '' }];
            }
            if (sIsVariable) {
                sDefaultBlockOption[0].useCustom = true;
                sDefaultBlockOption[0].table = aData.target.value;
            }

            const sTempTableList = JSON.parse(JSON.stringify(pPanelOption.blockList)).map((aTable: any) => {
                return aTable.id === pBlockInfo.id ? { ...sDefaultBlockOption[0], id: generateUUID(), color: aTable.color } : aTable;
            });

            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: sTempTableList,
                };
            });
        } else if (aKey === 'aggregator' && !SEPARATE_DIFF) {
            const sDiffVal: boolean = aData.target.value.includes('diff');
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: aPrev.blockList.map((aItem: any) => {
                        return aItem.id === pBlockInfo.id ? { ...aItem, aggregator: aData.target.value, diff: sDiffVal ? aData.target.value : 'none' } : aItem;
                    }),
                };
            });
        } else {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: aPrev.blockList.map((aItem: any) => {
                        if (aItem.id === pBlockInfo.id) {
                            const sTmpItem = {
                                ...aItem,
                                [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value,
                            };
                            if (aKey === 'time') sTmpItem.duration = { from: '', to: '' };
                            return sTmpItem;
                        } else return aItem;
                    }),
                };
            });
        }
    };
    const getColumnList = async (aTable: string) => {
        const sTable = pTableList.find(
            (aItem: any) =>
                aItem[3] === aTable ||
                `V$${aItem[3]}_STAT` === aTable ||
                (aItem[3].split('.').length === 2 && `${aItem[1]}.V$${aItem[3].split('.').at(-1)}_STAT` === pBlockInfo.table)
        );
        const sIsVirtualTable = aTable.includes('V$');
        const sData = sIsVirtualTable
            ? await getVirtualTableInfo(sTable[6], aTable?.includes('.') ? (aTable.split('.').at(-1) as string) : aTable, sTable[1])
            : await getTableInfo(sTable[6], sTable[2]);
        if (sData && sData?.data && sData?.data?.rows && sData?.data?.rows.length > 0) {
            if (pType === 'create') {
                pSetPanelOption((aPrev: any) => {
                    return {
                        ...aPrev,
                        blockList: aPrev.blockList.map((aItem: any) => {
                            return aItem.id === pBlockInfo.id
                                ? {
                                      ...aItem,
                                      name: sData.data.rows.filter((aItem: any) => {
                                          return aItem[1] === 5;
                                      })[0][0],
                                      time: sData.data.rows.filter((aItem: any) => {
                                          return aItem[1] === 6;
                                      })[0][0],
                                      value: sData.data.rows.filter((aItem: any) => {
                                          return isNumberTypeColumn(aItem[1]);
                                      })[0][0],
                                      type: getTableType(sTable[4]),
                                      tableInfo: sData.data.rows,
                                      values: aItem.values.map((aItem: any) => {
                                          return {
                                              ...aItem,
                                              value: sData.data.rows.filter((aItem: any) => {
                                                  return isNumberTypeColumn(aItem[1]);
                                              })[0][0],
                                          };
                                      }),
                                      filter: [
                                          {
                                              ...aItem.filter[0],
                                              column: sData.data.rows.filter((aItem: any) => {
                                                  return aItem[1] === 5;
                                              })[0][0],
                                          },
                                      ],
                                  }
                                : aItem;
                        }),
                    };
                });
            } else {
                pSetPanelOption((aPrev: any) => {
                    return {
                        ...aPrev,
                        blockList: aPrev.blockList.map((aItem: any) => {
                            return aItem.id === pBlockInfo.id
                                ? {
                                      ...aItem,
                                      name:
                                          aItem?.name ??
                                          sData.data.rows.filter((aItem: any) => {
                                              return aItem[1] === 5;
                                          })[0][0],
                                      time:
                                          aItem?.time ??
                                          sData.data.rows.filter((aItem: any) => {
                                              return aItem[1] === 6;
                                          })[0][0],
                                      value:
                                          aItem?.value ??
                                          sData.data.rows.filter((aItem: any) => {
                                              return isNumberTypeColumn(aItem[1]);
                                          })[0][0],
                                      type: getTableType(sTable[4]),
                                      tableInfo: sData.data.rows,
                                      values: aItem.values.map((aItem: any) => {
                                          return {
                                              ...aItem,
                                              value:
                                                  aItem.value ??
                                                  sData.data.rows.filter((bItem: any) => {
                                                      return isNumberTypeColumn(bItem[1]);
                                                  })[0][0],
                                          };
                                      }),
                                      filter: [
                                          {
                                              ...aItem.filter[0],
                                              column:
                                                  aItem.filter[0].column ??
                                                  sData.data.rows.filter((aItem: any) => {
                                                      return aItem[1] === 5;
                                                  })[0][0],
                                          },
                                      ],
                                  }
                                : aItem;
                        }),
                    };
                });
            }
            setTimeList(sData.data.rows.filter((aItem: any) => aItem[1] === 6));
            setColumnList(sData.data.rows);
        } else {
            setTimeList([]);
            setColumnList([]);
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
                                  if (bItem.id === aId && aChangedKey === 'filter') {
                                      let sUseFilter: boolean = false;
                                      if (aKey === 'column' || aKey === 'value' || aKey === 'operator') {
                                          // column | operator | value
                                          aKey === 'column' && bItem.value !== '' && bItem.operator !== '' && aData.target.value !== '' && (sUseFilter = true);
                                          aKey === 'value' && bItem.column !== '' && bItem.operator !== '' && aData.target.value !== '' && (sUseFilter = true);
                                          aKey === 'operator' && bItem.column !== '' && bItem.value !== '' && aData.target.value !== '' && (sUseFilter = true);
                                      } else sUseFilter = bItem.useFilter;
                                      if (aKey === 'useTyping' && aData.target.value && bItem.useFilter) {
                                          // Check varchar type
                                          const sUseQuote = pBlockInfo.tableInfo.find((aTable: any) => aTable[0] === bItem.column)[1] === 5;
                                          const sValue = sUseQuote ? `"${bItem.value.includes(',') ? bItem.value.split(',').join('","') : bItem.value}"` : bItem.value;
                                          const sTypingValue =
                                              bItem.column === 'NAME' && bItem.operator === 'in'
                                                  ? `${bItem.column} ${bItem.operator} (${sValue})`
                                                  : `${bItem.column} ${bItem.operator} ${sValue}`;
                                          return { ...bItem, useFilter: sUseFilter, typingValue: sTypingValue, [aKey]: aData.target.value };
                                      }
                                      return { ...bItem, useFilter: sUseFilter, [aKey]: aData.target.value };
                                  } else if (bItem.id === aId && aChangedKey === 'values' && aKey === 'aggregator' && !SEPARATE_DIFF) {
                                      const sDiffVal: boolean = aData.target.value.includes('diff');
                                      return { ...bItem, aggregator: aData.target.value, diff: sDiffVal ? aData.target.value : 'none' };
                                  } else
                                      return bItem.id === aId
                                          ? { ...bItem, [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value }
                                          : bItem;
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
                        ? { ...aItem, filter: [...aItem.filter, { id: generateUUID(), value: '', operator: '=', useFilter: false, useTyping: false, typingValue: '' }] }
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
    const HandleFold = () => {
        const sChangedBlockInfo = JSON.parse(JSON.stringify(pBlockInfo));
        sChangedBlockInfo.useCustom = !pBlockInfo.useCustom;
        if (pBlockInfo.useCustom) {
            sChangedBlockInfo.alias = sChangedBlockInfo.values[0].alias;
            sChangedBlockInfo.aggregator = sChangedBlockInfo.values[0].aggregator;
            sChangedBlockInfo.tag = '';
            sChangedBlockInfo.diff = pBlockInfo.values[0]?.diff ?? 'none';
        } else {
            sChangedBlockInfo.tag = '';
            sChangedBlockInfo.values = [{ ...sChangedBlockInfo.values[0], aggregator: pBlockInfo.aggregator, alias: pBlockInfo.alias, diff: pBlockInfo?.diff ?? 'none' }];
            sChangedBlockInfo.filter = [
                {
                    ...sChangedBlockInfo.filter[0],
                    column: sChangedBlockInfo.name,
                    useFilter: pBlockInfo.tag !== '' ? true : false,
                    operator: 'in',
                    value: pBlockInfo.tag && pBlockInfo.tag !== '' ? pBlockInfo.tag : '',
                    typingValue: pBlockInfo.tag !== '' ? `${sChangedBlockInfo.name} in ("${pBlockInfo.tag}")` : '',
                },
            ];
        }

        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    return aItem.id === pBlockInfo.id ? sChangedBlockInfo : aItem;
                }),
            };
        });
    };
    const validationFormula = async (aFormula: string): Promise<boolean> => {
        const sResult: any = await getTqlChart(
            `FAKE(json({[1709779542, 1]}))\nMAPVALUE(2, ${mathValueConverter(SqlResDataType(pPanelOption.type) === 'TIME_VALUE' ? '1' : '2', aFormula)})\nJSON()`
        );
        if (!sResult?.data?.success || !sResult?.data?.data?.rows?.length) return false;
        else return true;
    };
    const handleFormulaIconBtn = () => {
        if (sIsMath) handleExitFormulaField();
        else setIsMath(() => true);
    };
    const handleExitFormulaField = async (aIsOutside?: boolean) => {
        if (aIsOutside && sFormulaSelection) return setFormulaSelection(() => false);
        if (!sIsMath) return;
        if (!pBlockInfo?.math || pBlockInfo?.math === '') return setIsMath(false);
        const sResValidation = await validationFormula(pBlockInfo?.math);
        if (sResValidation) setIsMath(false);
        else {
            Error('Please check the entered formula.');
            // reset
            // changedOption('math', { target: { value: '' } });
        }
    };
    const handleEnterKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') handleExitFormulaField();
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
    const handleTagSelect = (aSelectedTag: string) => {
        changedOption('tag', { target: { value: aSelectedTag } });
    };
    /** return agg list based on chart type */
    const getAggregatorList = useMemo((): string[] => {
        const sChartDataType = SqlResDataType(chartTypeConverter(pPanelOption.type));
        if (sChartDataType === 'TIME_VALUE') {
            const sAggregatorList = pBlockInfo.type === 'tag' ? tagAggregatorList : logAggregatorList;
            return SEPARATE_DIFF ? sAggregatorList : sAggregatorList.concat(DIFF_LIST);
        }
        if (sChartDataType === 'NAME_VALUE') {
            if (pBlockInfo.table.includes('V$')) return nameValueVirtualAggList;
            else return nameValueAggregatorList;
        }
        return [];
    }, [pPanelOption.type]);
    /** return table list + virtual table list */
    const getTableList = useMemo((): string[] => {
        const sUseCustom = pBlockInfo.useCustom;
        const sChartDataType = SqlResDataType(chartTypeConverter(pPanelOption.type));
        let sAggList: string[] = [];
        if (sChartDataType === 'TIME_VALUE') sAggList = SEPARATE_DIFF ? tagAggregatorList : tagAggregatorList.concat(DIFF_LIST);
        if (sChartDataType === 'NAME_VALUE') sAggList = nameValueAggregatorList;
        const sIsVaildAgg = sAggList.includes(sUseCustom ? pBlockInfo.values[0].aggregator : pBlockInfo.aggregator);
        // Set vaild agg
        if (!sIsVaildAgg) {
            const sTempBlockList = JSON.parse(JSON.stringify(pBlockInfo));
            sTempBlockList.aggregator = 'count';
            sTempBlockList.values[0]?.aggregator && (sTempBlockList.values[0].aggregator = 'count');
            // Set option
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: [sTempBlockList],
                };
            });
        }
        let sTableList = pTableList.map((aItem: any) => aItem[3]);
        sTableList = sTableList.concat(getVariableList);

        if (pPanelOption.type === 'Gauge' || pPanelOption.type === 'Pie' || pPanelOption.type === 'Liquid fill') {
            // sTagTableList has only MACHBASEDB
            const sTagTableList = JSON.parse(JSON.stringify(pTableList)).filter((aTable: any) => getTableType(aTable[4]) === 'tag' && aTable[6] === -1);
            sTagTableList.filter((aTagTable: any) => {
                // check user
                if (aTagTable[3].includes('.')) {
                    const sSplitInfo = aTagTable[3].split('.');
                    const sTable = sSplitInfo[1];
                    const sUser = sSplitInfo[0];
                    return aTagTable.splice(3, 0, `${sUser}.V$${sTable}_STAT`);
                } else return aTagTable.splice(3, 0, `V$${aTagTable[3]}_STAT`);
            });
            const sResult = sTableList.concat(sTagTableList.map((bTagTable: any) => bTagTable[3]));
            return sResult;
        } else {
            // Time_value data chart reset
            const sChartDataType = SqlResDataType(chartTypeConverter(pPanelOption.type)) === 'TIME_VALUE';
            const sTargetChart = pPanelOption.blockList[0].table.includes('V$');
            if (sTargetChart && sChartDataType) {
                pSetPanelOption((aPrev: any) => {
                    return {
                        ...aPrev,
                        blockList: createDefaultTagTableOption(pTableList[0][1], pTableList[0], getTableType(pTableList[0][4]), ''),
                    };
                });
            }
            return sTableList;
        }
    }, [pPanelOption.type]);
    /** return use duration */
    const getUseDuration = () => {
        if (pBlockInfo.type.toUpperCase() === 'LOG' && pBlockInfo.time.toUpperCase() !== '_ARRIVAL_TIME') return true;
        else return false;
    };
    /** init */
    const init = async () => {
        const sTable = pTableList.find(
            (aItem: any) =>
                aItem[3] === pBlockInfo.table ||
                `V$${aItem[3]}_STAT` === pBlockInfo.table ||
                (aItem[3].split('.').length === 2 && `${aItem[1]}.V$${aItem[3].split('.').at(-1)}_STAT` === pBlockInfo.table)
        );
        if (!sTable) return;
        const sIsVirtualTable = pBlockInfo.table.includes('V$');
        const sTableType = getTableType(sTable[4]);
        const sSelectedType = sIsVirtualTable ? 'vir_tag' : sTableType;
        setSelectedTableType(sSelectedType);
        getColumnList(pBlockInfo.table);
        setOption(sTableType, pBlockInfo.tag);
    };
    useEffect(() => {
        init();
    }, []);

    useOutsideClick(sColorPickerRef, () => setIsColorPicker(false));
    useOutsideClick(sMathRef, () => handleExitFormulaField(true));

    return (
        <div className="series" id={Date()}>
            <div className="row">
                {/* TABLE */}
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
                                    pOptions={getTableList}
                                    pIsToolTip
                                />
                            </div>
                            {sSelectedTableType !== 'vir_tag' && (
                                <div className="details">
                                    <div className="series-table">
                                        <span className="series-title">Time field</span>
                                        <Select
                                            pIsDisabled={!sTimeList[0] && !getVariableList}
                                            pFontSize={12}
                                            pWidth={175}
                                            pBorderRadius={4}
                                            pInitValue={pBlockInfo.time}
                                            pHeight={26}
                                            onChange={(aEvent: any) => changedOption('time', aEvent)}
                                            pOptions={sTimeList
                                                .map((aItem: any) => {
                                                    return aItem[0];
                                                })
                                                .concat(getVariableList)}
                                        />
                                    </div>
                                </div>
                            )}
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
                                    pOptions={getTableList}
                                    pIsToolTip
                                />
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Tag </span>
                                <div className="tag-search-select-wrapper-custom">
                                    <Input
                                        pWidth={175}
                                        pHeight={26}
                                        pBorderRadius={4}
                                        pType="text"
                                        pValue={pBlockInfo.tag}
                                        onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                    />
                                    <TagSearchSelect pTable={pBlockInfo.table} pCallback={handleTagSelect} pBlockOption={pBlockInfo} />
                                </div>
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Aggregator </span>
                                {pBlockInfo.aggregator && (
                                    <Select
                                        pFontSize={12}
                                        pAutoChanged={false}
                                        pWidth={140}
                                        pBorderRadius={4}
                                        pInitValue={pBlockInfo.aggregator}
                                        pHeight={26}
                                        onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                        pOptions={getAggregatorList}
                                    />
                                )}
                                {SEPARATE_DIFF && (
                                    <div className="series-table">
                                        <span className="series-title"> Diff </span>
                                        <Select
                                            pFontSize={12}
                                            pAutoChanged={true}
                                            pWidth={175}
                                            pBorderRadius={4}
                                            pInitValue={pBlockInfo?.diff || 'none'}
                                            pHeight={26}
                                            onChange={(aEvent: any) => changedOption('diff', aEvent)}
                                            pOptions={['none'].concat(DIFF_LIST)}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Alias </span>
                                <Input
                                    pBorderRadius={4}
                                    pWidth={140}
                                    pHeight={26}
                                    pType="text"
                                    pValue={pBlockInfo.alias}
                                    pSetValue={() => null}
                                    onChange={(aEvent: any) => changedOption('alias', aEvent)}
                                />
                            </div>
                        </div>
                    )}
                    <div className="row-header-right">
                        <div ref={sMathRef} style={{ position: 'relative', marginRight: '4px' }}>
                            <IconButton
                                pWidth={20}
                                pHeight={20}
                                pIsToopTip
                                pIsActive={pBlockInfo?.math && pBlockInfo?.math !== ''}
                                pToolTipContent={!pBlockInfo?.math || pBlockInfo?.math === '' ? 'Enter formula' : pBlockInfo?.math}
                                pToolTipId={pBlockInfo.id + '-block-math'}
                                pIcon={<div style={{ width: '16px', height: '16px' }}>{pBlockInfo?.math && pBlockInfo?.math !== '' ? <TbMath /> : <TbMathOff />}</div>}
                                onClick={handleFormulaIconBtn}
                            />
                            {sIsMath && (
                                <div
                                    className="math-typing-wrap"
                                    style={{
                                        width: '200px',
                                        height: '26px',
                                        position: 'absolute',
                                        top: '20px',
                                        left: '-200px',
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '5px',
                                    }}
                                    onKeyDown={handleEnterKey}
                                    onMouseDown={() => setFormulaSelection(() => true)}
                                    onMouseUp={() => setFormulaSelection(() => false)}
                                >
                                    <Input
                                        pBorderRadius={4}
                                        pWidth={200}
                                        pHeight={26}
                                        pType="text"
                                        pAutoFocus
                                        pValue={pBlockInfo?.math}
                                        pPlaceHolder={!pBlockInfo?.math || pBlockInfo?.math === '' ? 'value * 1.0' : ''}
                                        pSetValue={() => null}
                                        onChange={(aEvent: any) => changedOption('math', aEvent)}
                                    />
                                </div>
                            )}
                        </div>
                        <div ref={sColorPickerRef} style={{ position: 'relative' }}>
                            <IconButton
                                pWidth={20}
                                pHeight={20}
                                pIsToopTip
                                pToolTipContent={'Color'}
                                pToolTipId={pBlockInfo.id + '-block-color'}
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
                            pIsToopTip
                            pToolTipContent={pBlockInfo.useCustom ? 'Collapse' : 'Expand'}
                            pToolTipId={pBlockInfo.id + '-block-expand'}
                            pDisabled={sSelectedTableType !== 'tag'}
                            // BsArrowsExpand, BsArrowsCollapse
                            pIcon={sSelectedTableType === 'tag' && pBlockInfo.useCustom ? <BsArrowsCollapse size={16} /> : <BsArrowsExpand size={16} />}
                            onClick={sSelectedTableType !== 'tag' ? () => {} : () => HandleFold()}
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
                {/* VALUE */}
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
                                    pAggList={getAggregatorList}
                                    pVariableList={getVariableList}
                                />
                            );
                        })}
                    </div>
                </div>
                {/* FILTER */}
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
                                    pVariableList={getVariableList}
                                />
                            );
                        })}
                    </div>
                </div>
                {/* DURATION */}
                {pBlockInfo.useCustom && getUseDuration() && (
                    <>
                        <div className="divider" style={{ margin: '6px 4px' }}></div>
                        <Duration pBlockInfo={pBlockInfo} pSetPanelOption={pSetPanelOption} />
                    </>
                )}
            </div>
        </div>
    );
};
