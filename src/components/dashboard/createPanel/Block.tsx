import { getTableInfo, getVirtualTableInfo } from '@/api/repository/api';
import { getRollupTableList, getTqlChart } from '@/api/repository/machiot';
import { BsArrowsCollapse, BsArrowsExpand, Close, GoPencil, Refresh, TbMath, TbMathOff } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { generateUUID } from '@/utils';
import {
    DIFF_LIST,
    SEPARATE_DIFF,
    createDefaultTagTableOption,
    geomapAggregatorList,
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
import { InputSelector } from '@/components/inputs/InputSelector';
import { FULL_TYPING_QUERY_PLACEHOLDER } from '@/utils/constants';
import { FullQueryHelper } from './Block/FullQueryHelper';
import { E_CHART_TYPE } from '@/type/eChart';
import { TransformBlockType } from './Transform/type';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';

export const Block = ({ pBlockInfo, pPanelOption, pTableList, pType, pGetTables, pSetPanelOption, pBlockOrder }: any) => {
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
    const changedOption = (aKey: string, aData: any) => {
        if (aKey === 'table') {
            const sIsVirtualTable = aData.target.value.includes('V$');
            const sTargetTableName = sIsVirtualTable ? aData.target.value.replace('V$', '').replace('_STAT', '') : aData.target.value;
            const sTargetTable = pTableList.find((aItem: any) => aItem[3] === sTargetTableName);
            const sIsVariable = aData.target.value.match(VARIABLE_REGEX);

            if (aData.target.name === 'customInput') {
                setSelectedTableType('variable_tag');
                pSetPanelOption((aPrev: any) => {
                    return {
                        ...aPrev,
                        blockList: aPrev.blockList.map((block: any) => {
                            if (block.id === pBlockInfo.id) return { ...block, table: aData.target.value, userName: '', tableInfo: [], customTable: true };
                            else return block;
                        }),
                    };
                });
                return;
            }

            if (sIsVirtualTable) setSelectedTableType('vir_tag');
            else if (sIsVariable) setSelectedTableType('variable_tag');
            else setSelectedTableType(getTableType(sTargetTable[4]));

            const sDefaultBlockOption = sTargetTable
                ? // TAG | LOG | VIR
                  createDefaultTagTableOption(sTargetTable[1], sTargetTable, getTableType(sTargetTable[4]), '', pPanelOption.type)
                : // VARIABLE
                  createDefaultTagTableOption('', ['', '', '', aData.target.value], '', '', pPanelOption.type);

            if (sIsVirtualTable) {
                sDefaultBlockOption[0].useCustom = true;
                sDefaultBlockOption[0].table = aData.target.value;
                sDefaultBlockOption[0].values = [{ id: sDefaultBlockOption[0].values[0].id, aggregator: 'sum', value: '', alias: '' }];
            }
            if (sIsVariable) {
                sDefaultBlockOption[0].table = aData.target.value;
            }

            if (pPanelOption.type === 'Geomap') {
                sDefaultBlockOption[0].values = [{ id: sDefaultBlockOption[0].values[0].id, aggregator: 'value', value: '', alias: '' }];
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
            if (aData.target.name === 'customInput') setSelectedTableType('variable_tag');

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
            if (aData.target.name === 'customInput') setSelectedTableType('variable_tag');
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
    const changedOptionFullTyping = (aKey: string, aData: any) => {
        pSetPanelOption((aPrev: any) => {
            return {
                ...aPrev,
                blockList: aPrev.blockList.map((aItem: any) => {
                    if (aItem.id === pBlockInfo.id) {
                        const sTmpItem = {
                            ...aItem,
                            customFullTyping: {
                                ...aItem.customFullTyping,
                                [aKey]: Object.keys(aData.target).includes('checked') ? aData.target.checked : aData.target.value,
                            },
                        };
                        return sTmpItem;
                    } else return aItem;
                }),
            };
        });
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
                            if (aItem.id === pBlockInfo.id) {
                                const filteredItems = sData.data.rows.filter((aItem: any) => {
                                    return aItem[1] === 5;
                                });
                                return {
                                    ...aItem,
                                    name: filteredItems.length > 0 ? filteredItems[0][0] : '',
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
                                            column: filteredItems.length > 0 ? filteredItems[0][0] : '',
                                        },
                                    ],
                                };
                            } else return aItem;
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
                                          if (pBlockInfo.customTable) return { ...bItem, useFilter: sUseFilter, typingValue: '', [aKey]: aData.target.value };

                                          if (pBlockInfo.tableInfo?.length < 1) return { ...bItem, useFilter: sUseFilter, typingValue: '', [aKey]: aData.target.value };
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
                                  } else if (aChangedKey === 'values' && aKey === 'aggregator' && !SEPARATE_DIFF) {
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
                    return aItem.id === pBlockInfo.id
                        ? { ...aItem, values: [...aItem.values, { id: generateUUID(), alias: '', value: '', aggregator: aItem.values[0].aggregator }] }
                        : aItem;
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
            let sDelIdx: any = undefined;
            const sTmpPanelOpt = JSON.parse(
                JSON.stringify({
                    ...aPrev,
                    blockList: aPrev.blockList.filter((aItem: any, aIdx: number) => {
                        if (aItem.id !== pBlockInfo.id) return aItem;
                        else sDelIdx = aIdx;
                    }),
                })
            );
            if (aPrev.type === 'Geomap') {
                const sLat = sTmpPanelOpt.chartOptions.coorLat;
                const sLon = sTmpPanelOpt.chartOptions.coorLon;
                const sMarker = sTmpPanelOpt.chartOptions.marker;
                sLat.splice(sDelIdx, 1);
                sLon.splice(sDelIdx, 1);
                sMarker.splice(sDelIdx, 1);
                sTmpPanelOpt.chartOptions = { ...sTmpPanelOpt.chartOptions, coorLat: sLat, coorLon: sLon, marker: sMarker };
            }
            if ((aPrev.type === 'Line' || aPrev.type === 'Bar' || aPrev.type === 'Scatter') && aPrev.yAxisOptions.length > 1) {
                sTmpPanelOpt.yAxisOptions[1].useBlockList = sTmpPanelOpt.yAxisOptions[1].useBlockList.filter((aItem: any) => aItem !== sDelIdx);
            }
            return sTmpPanelOpt;
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
        else Error('Please check the entered formula.');
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
    const checkTransformDataUsage = () => {
        if (getUsedTransformList.includes(pBlockOrder)) return true;
        return false;
    };
    const getUsedTransformList = useMemo(() => {
        let result: number[] = [];
        if (pPanelOption?.transformBlockList && pPanelOption?.transformBlockList?.length > 0) {
            const tmpRes: Set<number> = new Set();
            pPanelOption?.transformBlockList.map((trxBlock: TransformBlockType) => {
                trxBlock.selectedBlockIdxList.forEach((idx: number) => tmpRes.add(idx));
            });
            result = Array.from(tmpRes);
        }
        return result;
    }, [pPanelOption.transformBlockList]);
    /** return agg list based on chart type */
    const getAggregatorList = useMemo((): string[] => {
        const sChartConvertType = chartTypeConverter(pPanelOption.type);
        let sChartDataType = SqlResDataType(sChartConvertType);

        if (sChartConvertType === 'text' && pBlockOrder === 0) sChartDataType = 'NAME_VALUE';
        if (sChartConvertType === 'geomap') return geomapAggregatorList;
        if (sChartDataType === 'TIME_VALUE') {
            let sAggregatorList = pBlockInfo.type === 'tag' ? tagAggregatorList : logAggregatorList;
            if (sChartConvertType === E_CHART_TYPE.ADV_SCATTER) sAggregatorList = sAggregatorList.filter((agg) => agg !== 'value');
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
        let sChartDataType = SqlResDataType(chartTypeConverter(pPanelOption.type));
        if (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TEXT && pBlockOrder === 0) sChartDataType = 'NAME_VALUE';
        let sAggList: string[] = [];
        if (sChartDataType === 'TIME_VALUE') sAggList = SEPARATE_DIFF ? tagAggregatorList : tagAggregatorList.concat(DIFF_LIST);
        if (sChartDataType === 'NAME_VALUE') sAggList = nameValueAggregatorList;
        if (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER) sAggList = sAggList.filter((agg) => agg !== 'value');

        const sIsValidAgg = sAggList.includes(sUseCustom ? pBlockInfo.values[0].aggregator : pBlockInfo.aggregator);
        // Set vaild agg
        if (!sIsValidAgg && pPanelOption.type !== 'Geomap') {
            const sTempBlockList = JSON.parse(JSON.stringify(pBlockInfo));
            sTempBlockList.aggregator = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? 'avg' : 'count';
            sTempBlockList.values[0]?.aggregator && (sTempBlockList.values[0].aggregator = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? 'avg' : 'count');
            // Set option
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    blockList: [sTempBlockList],
                };
            });
        }
        const sTableList = pTableList.map((aItem: any) => aItem[3]);

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
                    {pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use && (
                        <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="row-header-left">
                            {/* TABLE */}
                            <div className="series-table">
                                <span className="series-title">
                                    Table <IconButton pDisabled={sIsLoadingRollup} pWidth={25} pHeight={26} pIcon={<Refresh />} onClick={HandleTable} />
                                </span>
                                <InputSelector
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pBlockInfo.table}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('table', aEvent)}
                                    pOptions={getTableList}
                                />
                            </div>
                            {sSelectedTableType !== 'vir_tag' && (
                                <div className="details">
                                    <div className="series-table">
                                        <span className="series-title">Time field</span>
                                        <InputSelector
                                            pIsDisabled={!sTimeList[0]}
                                            pFontSize={12}
                                            pWidth={175}
                                            pBorderRadius={4}
                                            pInitValue={pBlockInfo.time}
                                            pHeight={26}
                                            onChange={(aEvent: any) => changedOption('time', aEvent)}
                                            pOptions={sTimeList.map((aItem: any) => {
                                                return aItem[0];
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {pBlockInfo.customFullTyping.use && (
                        <div className="row-header-left row-header-left-textarea">
                            <textarea
                                placeholder={FULL_TYPING_QUERY_PLACEHOLDER}
                                defaultValue={pBlockInfo.customFullTyping.text}
                                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => changedOptionFullTyping('text', event)}
                                style={{ height: 100 + 'px', width: '100%', padding: '4px 8px' }}
                            />
                        </div>
                    )}
                    {!pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use && (
                        <div className="row-header-left">
                            <div className="series-table">
                                <span className="series-title">
                                    Table <IconButton pDisabled={sIsLoadingRollup} pWidth={25} pHeight={26} pIcon={<Refresh />} onClick={HandleTable} />
                                </span>
                                <InputSelector
                                    pFontSize={12}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pBlockInfo.table}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('table', aEvent)}
                                    pOptions={getTableList}
                                />
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Tag </span>
                                {!pBlockInfo.table.match(VARIABLE_REGEX) && pBlockInfo?.tableInfo?.length > 0 ? (
                                    <div className="tag-search-select-wrapper-custom">
                                        <Input
                                            pWidth={150}
                                            pHeight={26}
                                            pBorderRadius={4}
                                            pType="text"
                                            pValue={pBlockInfo.tag}
                                            onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                        />
                                        <TagSearchSelect pTable={pBlockInfo.table} pCallback={handleTagSelect} pBlockOption={pBlockInfo} />
                                    </div>
                                ) : (
                                    <div className="tag-search-select-wrapper-custom">
                                        <InputSelector
                                            pBorderRadius={4}
                                            pWidth={175}
                                            pHeight={26}
                                            pInitValue={pBlockInfo.tag}
                                            onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                            pOptions={[]}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="series-table">
                                <span className="series-title"> Aggregator </span>
                                <InputSelector
                                    pFontSize={12}
                                    pAutoChanged={false}
                                    pWidth={175}
                                    pBorderRadius={4}
                                    pInitValue={pBlockInfo.aggregator}
                                    pHeight={26}
                                    onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                    pOptions={getAggregatorList}
                                />
                                {SEPARATE_DIFF && (
                                    <div className="series-table">
                                        <span className="series-title"> Diff </span>
                                        <InputSelector
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
                                    pWidth={175}
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
                        <FullQueryHelper pIsShow={pBlockInfo.customFullTyping.use} />
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsActive={pBlockInfo.customFullTyping.use}
                            pDisabled={!(pPanelOption.type === 'Line' || pPanelOption.type === 'Bar')}
                            pIsToopTip
                            pToolTipId={pBlockInfo.id + '-block-change-full-query-mode'}
                            pToolTipContent={pBlockInfo.customFullTyping.use ? 'Selecting' : 'Typing'}
                            pIcon={<GoPencil />}
                            onClick={() => changedOptionFullTyping('use', { target: { value: !pBlockInfo.customFullTyping.use } })}
                        />
                        <div ref={sMathRef} style={{ position: 'relative', marginRight: '4px' }}>
                            <IconButton
                                pWidth={20}
                                pHeight={20}
                                pIsToopTip
                                pDisabled={chartTypeConverter(pPanelOption.type) === 'geomap' || pBlockInfo.customFullTyping.use}
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
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIsToopTip
                            pToolTipContent={pBlockInfo?.isVisible ? 'Visible' : 'Invisible'}
                            pToolTipId={pBlockInfo.id + '-block-visible'}
                            pIcon={pBlockInfo?.isVisible ? <VscEye /> : <VscEyeClosed />}
                            onClick={() => setOption('isVisible', !pBlockInfo?.isVisible)}
                        />
                        <div ref={sColorPickerRef} style={{ position: 'relative' }}>
                            {pPanelOption.type !== 'Text' && (
                                <IconButton
                                    pDisabled={
                                        chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TEXT ||
                                        (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && pPanelOption.xAxisOptions[0].useBlockList[0] === pBlockOrder)
                                    }
                                    pWidth={20}
                                    pHeight={20}
                                    pIsToopTip
                                    pToolTipContent={'Color'}
                                    pToolTipId={pBlockInfo.id + '-block-color'}
                                    pIcon={
                                        <div
                                            style={{ width: '14px', cursor: 'pointer', height: '14px', marginRight: '4px', borderRadius: '50%', backgroundColor: pBlockInfo.color }}
                                        />
                                    }
                                    onClick={() => setIsColorPicker(!sIsColorPicker)}
                                />
                            )}

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
                            pDisabled={sSelectedTableType === 'log' || sSelectedTableType === 'vir_tag' || pPanelOption.type === 'Geomap'}
                            pIcon={sSelectedTableType === 'tag' && pBlockInfo.useCustom ? <BsArrowsCollapse size={16} /> : <BsArrowsExpand size={16} />}
                            onClick={sSelectedTableType === 'log' || sSelectedTableType === 'vir_tag' ? () => {} : () => HandleFold()}
                        />
                        <IconButton
                            pDisabled={pPanelOption.blockList.length === 1 || checkTransformDataUsage()}
                            pWidth={20}
                            pHeight={20}
                            pIcon={<Close />}
                            onClick={pPanelOption.blockList.length !== 1 ? () => deleteSeries() : () => {}}
                        />
                    </div>
                </div>
                {/* VALUE */}
                {!pBlockInfo.customFullTyping.use && pBlockInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}
                {!pBlockInfo.customFullTyping.use && (
                    <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="details">
                        <div style={{ width: '100%' }}>
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
                                        pPanelOption={pPanelOption}
                                        pAggList={getAggregatorList}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* FILTER */}
                {!pBlockInfo.customFullTyping.use && pBlockInfo.useCustom && <div className="divider" style={{ margin: '6px 4px' }}></div>}
                {!pBlockInfo.customFullTyping.use && (
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
                )}

                {/* DURATION */}
                {pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use && getUseDuration() && (
                    <>
                        <div className="divider" style={{ margin: '6px 4px' }}></div>
                        <Duration pBlockInfo={pBlockInfo} pSetPanelOption={pSetPanelOption} />
                    </>
                )}
            </div>
        </div>
    );
};
