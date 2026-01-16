import { getTableInfo, getVirtualTableInfo } from '@/api/repository/api';
import { getRollupTableList, getTqlChart } from '@/api/repository/machiot';
import { BsArrowsCollapse, BsArrowsExpand, Close, GoPencil, Refresh, TbMath, TbMathOff } from '@/assets/icons/Icon';
import { generateUUID } from '@/utils';
import { Button, Page, InputSelect, Input as DSInput, Textarea, ColorPicker } from '@/design-system/components';
import {
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
import { TableTypeOrderList } from '@/components/Side/DBExplorer/utils';
import { DIFF_LIST, isCountAllAggregator } from '@/utils/aggregatorConstants';
import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Filter from './Filter';
import Value from './Value';
import { useSetRecoilState } from 'recoil';
import { gRollupTableList } from '@/recoil/recoil';
import { CombineTableUser, SqlResDataType, mathValueConverter } from '@/utils/DashboardQueryParser';
import { Toast } from '@/design-system/components';
import { chartTypeConverter } from '@/utils/eChartHelper';
import TagSelectDialog from '@/components/inputs/TagSelectDialog';
import { Duration } from './Duration';
import { VARIABLE_REGEX } from '@/utils/CheckDataCompatibility';
import { FULL_TYPING_QUERY_PLACEHOLDER } from '@/utils/constants';
import { FullQueryHelper } from './Block/FullQueryHelper';
import { E_CHART_TYPE } from '@/type/eChart';
import { TransformBlockType } from './Transform/type';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import { replaceVariablesInTql } from '@/utils/TqlVariableReplacer';
import { BadgeStatus } from '@/components/badge';
import useDebounce from '@/hooks/useDebounce';
import { MdOutlineOpenInNew } from 'react-icons/md';
import useOutsideClick from '@/hooks/useOutsideClick';

export const Block = ({ pBlockInfo, pPanelOption, pVariables, pTableList, pType, pGetTables, pSetPanelOption, pBlockOrder, pBlockCount }: any) => {
    // const [sTagList, setTagList] = useState<any>([]);
    const [sTimeList, setTimeList] = useState<any>([]);
    const [sSelectedTableType, setSelectedTableType] = useState<any>('');
    const setRollupTabls = useSetRecoilState(gRollupTableList);
    const [sIsLoadingRollup, setIsLoadingRollup] = useState<boolean>(false);
    const [sColumnList, setColumnList] = useState<any>([]);
    const [sIsMath, setIsMath] = useState<boolean>(false);
    const [sMathPosition, setMathPosition] = useState({ top: 0, left: 0 });
    const [sFormulaSelection, setFormulaSelection] = useState<boolean>(false);
    const [sIsTagDialogOpen, setIsTagDialogOpen] = useState<boolean>(false);
    const [sFilterTagDialogInfo, setFilterTagDialogInfo] = useState<{ isOpen: boolean; filterId: string | null; initialValue: string }>({
        isOpen: false,
        filterId: null,
        initialValue: '',
    });
    const sMathRef = useRef<any>(null);
    const sCustomQueryRef = useRef<any>(null);
    const [sIsValidCustomQuery, setIsValidCustomQuery] = useState<boolean>(false);

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

            const sDiffVal: boolean = aData.target.value?.toUpperCase()?.includes('diff'.toUpperCase());
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
                            if (aKey === 'math') sTmpItem.isValidMath = true;
                            return sTmpItem;
                        } else return aItem;
                    }),
                };
            });
        }
    };
    const getFullCustomQuery = () => {
        const sTableName = CombineTableUser(pBlockInfo.table, pBlockInfo?.customTable);
        const sName = pBlockInfo?.name ?? '';
        const sTime = pBlockInfo?.time ?? '';
        let sIsAgg =
            pBlockInfo?.aggregator !== '' && pBlockInfo?.aggregator?.toUpperCase() !== 'value'.toUpperCase() && pBlockInfo?.aggregator?.toUpperCase() !== 'none'.toUpperCase();
        let sIsCountAll = isCountAllAggregator(pBlockInfo?.aggregator ?? '');
        let sValue = pBlockInfo?.value ?? '';
        let sAgg = pBlockInfo?.aggregator ?? '';
        let sWhereNameIn: any = [];
        let sAlias = pBlockInfo?.alias !== '' ? pBlockInfo?.alias : "'SERIES(0)'";

        if (pBlockInfo.useCustom) {
            sIsAgg =
                pBlockInfo?.values?.[0]?.aggregator !== '' &&
                pBlockInfo?.values?.[0]?.aggregator?.toUpperCase() !== 'value'.toUpperCase() &&
                pBlockInfo?.values?.[0]?.aggregator?.toUpperCase() !== 'none'.toUpperCase();
            sIsCountAll = isCountAllAggregator(pBlockInfo?.values?.[0]?.aggregator ?? '');
            sValue = pBlockInfo?.values?.[0]?.value !== '' ? pBlockInfo?.values?.[0]?.value : false;
            sAgg = pBlockInfo?.values?.[0]?.aggregator !== '' ? pBlockInfo?.values?.[0]?.aggregator : '';
            sAlias = pBlockInfo?.values?.[0]?.alias !== '' ? pBlockInfo?.values?.[0]?.alias : "'SERIES(0)'";
            const sFilterTmp = pBlockInfo?.filter?.filter((aItem: any) => {
                if (aItem?.useFilter) return aItem;
                else return false;
            });
            sWhereNameIn = sFilterTmp.map((bItem: any) => {
                if (bItem.useTyping) return bItem.typingValue;
                else {
                    // Check varchar type
                    const sUseQuote = pBlockInfo.tableInfo.find((aTable: any) => aTable[0] === bItem.column)?.[1] === 5;
                    const sValue = sUseQuote ? `'${bItem.value.includes(',') ? bItem.value.split(',').join("','") : bItem.value}'` : bItem.value;
                    const sTypingValue =
                        bItem.column === 'NAME' && bItem.operator === 'in' ? `${bItem.column} ${bItem.operator} (${sValue})` : `${bItem.column} ${bItem.operator} ${sValue}`;
                    return sTypingValue;
                }
            });
        } else sWhereNameIn = pBlockInfo?.tag !== '' ? [`${sName} IN ('${pBlockInfo?.tag}')`] : [];

        let sCombineValue = sIsAgg && sValue ? `${sAgg}(${sValue}) AS ${sAlias}` : !sIsCountAll ? `(${sValue}) AS ${sAlias}` : `COUNT(*) AS ${sAlias}`;

        if (sAgg && sValue && (sAgg?.toUpperCase() === 'first'.toUpperCase() || sAgg?.toUpperCase() == 'last'.toUpperCase()))
            sCombineValue = `${sAgg}(${sTime}, ${sValue}) AS ${sAlias}`;
        if (sAgg?.toUpperCase() === 'diff'.toUpperCase() || sAgg?.toUpperCase() === 'diff (abs)'.toUpperCase() || sAgg?.toUpperCase() === 'diff (no-negative)'.toUpperCase()) {
            sCombineValue = `COUNT(*) AS ${sAlias}`;
            sIsAgg = true;
        }
        const sQuery = `SELECT DATE_TRUNC('{{period_unit}}', ${sTime}, {{period_value}}) / 1000000 AS TIME, ${sCombineValue} FROM ${sTableName} WHERE ${sTime} BETWEEN FROM_TIMESTAMP({{from_ns}}) AND FROM_TIMESTAMP({{to_ns}}) ${
            sWhereNameIn?.length > 0 ? 'AND ' + sWhereNameIn?.join(' AND ') : ''
        }${sIsAgg ? ' GROUP BY TIME' : ''} ORDER BY TIME`;
        return sQuery;
    };

    const allowFullTyping = (): boolean => {
        if (pBlockInfo?.customFullTyping?.use) return true;
        else {
            if (pBlockInfo?.useCustom) {
                const hasDiffAggregator = pBlockInfo?.values?.some(
                    (item: any) =>
                        item?.aggregator?.toLowerCase() === 'diff' || item?.aggregator?.toLowerCase() === 'diff (abs)' || item?.aggregator?.toLowerCase() === 'diff (no-negative)'
                );
                return !hasDiffAggregator;
            } else {
                if (
                    pBlockInfo?.aggregator?.toLowerCase() === 'diff' ||
                    pBlockInfo?.aggregator?.toLowerCase() === 'diff (abs)' ||
                    pBlockInfo?.aggregator?.toLowerCase() === 'diff (no-negative)'
                ) {
                    return false;
                }
            }
        }
        return true;
    };

    const changedOptionFullTyping = (aKey: string, aData: any) => {
        if (aKey === 'use' && aData?.target?.value === true) {
            const checkDiff = allowFullTyping();
            if (!checkDiff) {
                Toast.error('Full typing is not available when using Diff aggregator.');
                return;
            }
        }

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
                        if (aKey === 'use' && aData?.target?.value === true) {
                            sTmpItem.customFullTyping.text = getFullCustomQuery();
                        }
                        if (aKey === 'text') {
                            if (aData?.target?.value?.trim() === '') setIsValidCustomQuery(true);
                            else setIsValidCustomQuery(() => false);
                        }
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
            ? await getVirtualTableInfo(sTable?.[6], aTable?.includes('.') ? (aTable.split('.').at(-1) as string) : aTable, sTable[1])
            : await getTableInfo(sTable?.[6], sTable?.[2]);
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
                                          const sValue = sUseQuote ? `'${bItem.value.includes(',') ? bItem.value.split(',').join("','") : bItem.value}'` : bItem.value;
                                          const sTypingValue =
                                              bItem.column === 'NAME' && bItem.operator === 'in'
                                                  ? `${bItem.column} ${bItem.operator} (${sValue})`
                                                  : `${bItem.column} ${bItem.operator} ${sValue}`;
                                          return { ...bItem, useFilter: sUseFilter, typingValue: sTypingValue, [aKey]: aData.target.value };
                                      }
                                      return { ...bItem, useFilter: sUseFilter, [aKey]: aData.target.value };
                                  } else if (aChangedKey === 'values' && aKey === 'aggregator' && !SEPARATE_DIFF) {
                                      const sDiffVal: boolean = aData?.target?.value?.toUpperCase().includes('diff'.toUpperCase());
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
    const handleCloseFilterTagDialog = () => {
        setFilterTagDialogInfo({ isOpen: false, filterId: null, initialValue: '' });
    };
    const handleFilterTagSelect = (aSelectedTag: string) => {
        if (!sFilterTagDialogInfo.filterId) return;
        changeValueOption('value', { target: { value: aSelectedTag } }, sFilterTagDialogInfo.filterId, 'filter');
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
        const sParsedFormula = replaceVariablesInTql(aFormula, pVariables, {
            interval: { IntervalType: '', IntervalValue: 0 },
            start: '',
            end: '',
        });
        if (sParsedFormula.match(VARIABLE_REGEX)) return false;
        const sResult: any = await getTqlChart(
            `FAKE(json({[1709779542, 1]}))\nMAPVALUE(2, ${mathValueConverter(SqlResDataType(pPanelOption.type) === 'TIME_VALUE' ? '1' : '2', sParsedFormula)})\nJSON()`,
            'dsh'
        );
        if (!sResult?.data?.success || !sResult?.data?.data?.rows?.length) return false;
        else return true;
    };
    const handleFormulaIconBtn = () => {
        if (sIsMath) {
            handleExitFormulaField();
        } else {
            // Calculate position for math input portal
            if (sMathRef.current) {
                const rect = sMathRef.current.getBoundingClientRect();
                setMathPosition({
                    top: rect.bottom + 4,
                    left: rect.left - 200,
                });
            }
            setIsMath(() => true);
        }
    };
    const handleExitFormulaField = async (aIsOutside?: boolean) => {
        if (aIsOutside && sFormulaSelection) return setFormulaSelection(() => false);
        if (!sIsMath) return;
        if (!pBlockInfo?.math || pBlockInfo?.math === '') return setIsMath(false);
        const sResValidation = await validationFormula(pBlockInfo?.math);
        if (sResValidation) {
            setIsMath(false);
            setOption('isValidMath', true);
        } else {
            setOption('isValidMath', false);
            Toast.error('Please check the entered formula.');
            setIsMath(false);
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
        const sChartDataType = SqlResDataType(sChartConvertType);

        if (sChartConvertType === 'geomap') return geomapAggregatorList;
        if (sChartDataType === 'TIME_VALUE') {
            let sAggregatorList = pBlockInfo.type === 'tag' ? tagAggregatorList : logAggregatorList;
            if (sChartConvertType === E_CHART_TYPE.ADV_SCATTER) sAggregatorList = sAggregatorList.filter((agg) => agg !== 'value');
            return SEPARATE_DIFF ? sAggregatorList : [...sAggregatorList, ...DIFF_LIST];
        }
        if (sChartDataType === 'NAME_VALUE') {
            if (pBlockInfo.table.includes('V$')) return nameValueVirtualAggList;
            else return nameValueAggregatorList;
        }
        return [];
    }, [pPanelOption.type]);
    /** return table list + virtual table list */
    // Check and fix invalid aggregator
    useEffect(() => {
        const sUseCustom = pBlockInfo.useCustom;
        const sChartDataType = SqlResDataType(chartTypeConverter(pPanelOption.type));
        let sAggList: string[] = [];
        if (sChartDataType === 'TIME_VALUE') sAggList = SEPARATE_DIFF ? tagAggregatorList : [...tagAggregatorList, ...DIFF_LIST];
        if (sChartDataType === 'NAME_VALUE') sAggList = nameValueAggregatorList;
        if (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER) sAggList = sAggList.filter((agg) => agg !== 'value');

        const sIsValidAgg = sAggList.includes(sUseCustom ? pBlockInfo.values[0]?.aggregator : pBlockInfo.aggregator);
        // Set valid agg
        if (!sIsValidAgg && pPanelOption.type !== 'Geomap') {
            const sTempBlockInfo = JSON.parse(JSON.stringify(pBlockInfo));
            sTempBlockInfo.aggregator = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? 'avg' : 'count';
            sTempBlockInfo.values[0]?.aggregator && (sTempBlockInfo.values[0].aggregator = chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER ? 'avg' : 'count');
            // Set option
            pSetPanelOption(() => {
                const sTmpBlockList = pPanelOption.blockList;
                sTmpBlockList[pBlockOrder] = sTempBlockInfo;
                return {
                    ...pPanelOption,
                    blockList: sTmpBlockList,
                };
            });
        }
    }, [pPanelOption.type, pBlockInfo.aggregator, pBlockInfo.values, pBlockInfo.useCustom]);

    const getTableList = useMemo((): string[] => {
        const sSortedTableList = [...pTableList].sort((aTable: any, bTable: any) => {
            const aType = getTableType(aTable[4]);
            const bType = getTableType(bTable[4]);
            return TableTypeOrderList.indexOf(aType) - TableTypeOrderList.indexOf(bType);
        });

        const sTableList = sSortedTableList.map((aItem: any) => aItem[3]);

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

    useEffect(() => {
        if (!sFilterTagDialogInfo.isOpen) return;
        const sFilterExists = pBlockInfo.filter?.some((aFilter: any) => aFilter.id === sFilterTagDialogInfo.filterId);
        if (!sFilterExists) handleCloseFilterTagDialog();
    }, [pBlockInfo.filter, sFilterTagDialogInfo.filterId, sFilterTagDialogInfo.isOpen]);

    const handleExitCustomField = async () => {
        if (sIsValidCustomQuery) return;
        const sQuery = replaceVariablesInTql(pBlockInfo?.customFullTyping.text, pVariables, {
            interval: { IntervalType: 'min', IntervalValue: 20 },
            start: '1700000000',
            end: '1700000000',
        });
        if (sQuery === '') return setIsValidCustomQuery(true);
        const sResult: any = await getTqlChart(`SQL("${sQuery}")\nJSON()`, 'dsh');
        if (!sResult?.data?.success) {
            Toast.error('Please check the entered formula.');
            setIsValidCustomQuery(false);
            return;
        }
        setIsValidCustomQuery(true);
    };

    useOutsideClick(sMathRef, () => handleExitFormulaField(true));
    useDebounce([pBlockInfo?.customFullTyping.text], handleExitCustomField, 1000);

    return (
        <>
            <Page style={{ borderRadius: '4px', border: '1px solid #b8c8da41', gap: '6px', height: 'auto', display: 'table' }}>
                {/* TABLE */}
                <Page.ContentBlock style={{ padding: '4px' }} pHoverNone>
                    <Page.DpRow style={{ width: '100%', justifyContent: 'end', paddingBottom: '8px' }}>
                        <Button.Group>
                            <FullQueryHelper pIsShow={pBlockInfo.customFullTyping.use} />
                            <Button
                                size="side"
                                variant="ghost"
                                active={pBlockInfo.customFullTyping.use}
                                disabled={!(pPanelOption.type === 'Line' || pPanelOption.type === 'Bar') || pBlockInfo.customFullTyping?.text?.trim() !== ''}
                                icon={<GoPencil size={14} />}
                                onClick={() => changedOptionFullTyping('use', { target: { value: !pBlockInfo.customFullTyping.use } })}
                                data-tooltip-id={pBlockInfo.id + '-block-change-full-query-mode'}
                                data-tooltip-content={pBlockInfo.customFullTyping.use ? 'Selecting' : 'Typing'}
                            />
                            <div ref={sMathRef} style={{ position: 'relative', display: 'flex', alignContent: 'center' }}>
                                <Button
                                    size="side"
                                    variant="ghost"
                                    active={pBlockInfo?.math && pBlockInfo?.math !== ''}
                                    disabled={chartTypeConverter(pPanelOption.type) === 'geomap' || pBlockInfo.customFullTyping.use}
                                    icon={
                                        <div style={{ width: '16px', height: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {pBlockInfo?.isValidMath ? (
                                                pBlockInfo?.math && pBlockInfo?.math !== '' ? (
                                                    <TbMath size={14} />
                                                ) : (
                                                    <TbMathOff size={14} />
                                                )
                                            ) : (
                                                <div style={{ width: '16px', height: '16px', display: 'flex' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'end', position: 'absolute', top: '-6px', right: '-3px' }}>
                                                        <BadgeStatus />
                                                    </div>
                                                    {pBlockInfo?.math && pBlockInfo?.math !== '' ? <TbMath size={16} /> : <TbMathOff size={16} />}
                                                </div>
                                            )}
                                        </div>
                                    }
                                    onClick={handleFormulaIconBtn}
                                    data-tooltip-id={pBlockInfo.id + '-block-math'}
                                    data-tooltip-content={!pBlockInfo?.math || pBlockInfo?.math === '' ? 'Enter formula' : pBlockInfo?.math}
                                />
                                {sIsMath &&
                                    createPortal(
                                        <div
                                            className="math-typing-wrap"
                                            style={{
                                                width: '200px',
                                                height: '26px',
                                                position: 'fixed',
                                                top: `${sMathPosition.top}px`,
                                                left: `${sMathPosition.left}px`,
                                                backgroundColor: '#2d2d2d',
                                                border: '1px solid rgba(255, 255, 255, 0.13)',
                                                borderRadius: '4px',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 9999,
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                            }}
                                            onKeyDown={handleEnterKey}
                                            onMouseDown={() => setFormulaSelection(() => true)}
                                            onMouseUp={() => setFormulaSelection(() => false)}
                                        >
                                            <DSInput
                                                type="text"
                                                autoFocus
                                                value={pBlockInfo?.math}
                                                placeholder={!pBlockInfo?.math || pBlockInfo?.math === '' ? 'value * 1.0' : ''}
                                                onChange={(e) => changedOption('math', e)}
                                                size="sm"
                                                style={{ width: '200px', height: '26px' }}
                                            />
                                        </div>,
                                        document.body
                                    )}
                            </div>
                            <Button
                                size="side"
                                variant="ghost"
                                disabled={pBlockCount.addable ? false : pBlockInfo?.isVisible ? false : true}
                                icon={pBlockInfo?.isVisible ? <VscEye size={16} /> : <VscEyeClosed size={16} />}
                                onClick={() => setOption('isVisible', !pBlockInfo?.isVisible)}
                                data-tooltip-id={pBlockInfo.id + '-block-visible'}
                                data-tooltip-content={pBlockInfo?.isVisible ? 'Visible' : 'Invisible'}
                            />
                            <ColorPicker
                                color={pBlockInfo.color}
                                onChange={(color: string) => setOption('color', color)}
                                disabled={
                                    chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.TEXT ||
                                    (chartTypeConverter(pPanelOption.type) === E_CHART_TYPE.ADV_SCATTER && pPanelOption.xAxisOptions[0].useBlockList[0] === pBlockOrder)
                                }
                                tooltipId={pBlockInfo.id + '-block-color'}
                                tooltipContent="Color"
                            />
                            <Button
                                size="side"
                                variant="ghost"
                                disabled={sSelectedTableType === 'log' || sSelectedTableType === 'vir_tag' || pPanelOption.type === 'Geomap' || pBlockInfo.customFullTyping.use}
                                icon={sSelectedTableType === 'tag' && pBlockInfo.useCustom ? <BsArrowsCollapse size={14} /> : <BsArrowsExpand size={14} />}
                                onClick={sSelectedTableType === 'log' || sSelectedTableType === 'vir_tag' ? () => {} : () => HandleFold()}
                                data-tooltip-id={pBlockInfo.id + '-block-expand'}
                                data-tooltip-content={pBlockInfo.useCustom ? 'Collapse' : 'Expand'}
                            />
                            <Button
                                size="side"
                                variant="ghost"
                                disabled={pPanelOption.blockList.length === 1 || checkTransformDataUsage()}
                                icon={<Close size={16} />}
                                onClick={pPanelOption.blockList.length !== 1 ? () => deleteSeries() : () => {}}
                                data-tooltip-id={pBlockInfo.id + '-block-delete'}
                                data-tooltip-content="Delete"
                            />
                        </Button.Group>
                    </Page.DpRow>
                    {pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use && (
                        <div style={{ display: !pBlockInfo.useCustom ? 'none' : '' }} className="row-header-left">
                            {/* TABLE */}
                            <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
                                <InputSelect
                                    label={
                                        <>
                                            Table
                                            <Button size="side" variant="ghost" icon={<Refresh size={12} />} onClick={HandleTable} disabled={sIsLoadingRollup} />
                                        </>
                                    }
                                    labelPosition="left"
                                    type="text"
                                    options={getTableList.map((opt: string) => ({ label: opt, value: opt }))}
                                    value={pBlockInfo.table}
                                    onChange={(aEvent: any) => changedOption('table', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                    selectValue={pBlockInfo.table}
                                    onSelectChange={(value: string) => changedOption('table', { target: { value, name: 'customSelect' } })}
                                    size="md"
                                    style={{ width: '160px' }}
                                />
                                {sSelectedTableType !== 'vir_tag' && (
                                    <InputSelect
                                        label="Time field"
                                        labelPosition="left"
                                        type="text"
                                        options={sTimeList.map((aItem: any) => ({ label: aItem[0], value: aItem[0] }))}
                                        value={pBlockInfo.time}
                                        onChange={(aEvent: any) => changedOption('time', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                        selectValue={pBlockInfo.time}
                                        onSelectChange={(value: string) => changedOption('time', { target: { value, name: 'customSelect' } })}
                                        disabled={!sTimeList[0]}
                                        size="md"
                                        style={{ width: '160px' }}
                                    />
                                )}
                            </Page.DpRow>
                        </div>
                    )}
                    {pBlockInfo.customFullTyping.use && (
                        <div ref={sCustomQueryRef} style={{ position: 'relative' }}>
                            <Textarea
                                placeholder={FULL_TYPING_QUERY_PLACEHOLDER}
                                defaultValue={pBlockInfo.customFullTyping.text}
                                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => changedOptionFullTyping('text', event)}
                                onFocus={(e) => e.target.setSelectionRange(0, pBlockInfo?.customFullTyping?.text?.length)}
                                autoFocus
                                fullWidth
                                size="md"
                                resize="vertical"
                            />
                            {!sIsValidCustomQuery && (
                                <div style={{ display: 'flex', justifyContent: 'end', position: 'absolute', top: '-4px', right: '0px' }}>
                                    <BadgeStatus />
                                </div>
                            )}
                        </div>
                    )}
                    {!pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use ? (
                        <div style={{ gap: '4px', display: 'flex', flexDirection: 'column' }}>
                            <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
                                <InputSelect
                                    label={
                                        <>
                                            Table <Button size="side" variant="ghost" icon={<Refresh size={12} />} onClick={HandleTable} disabled={sIsLoadingRollup} />
                                        </>
                                    }
                                    labelPosition="left"
                                    type="text"
                                    options={getTableList.map((opt: string) => ({ label: opt, value: opt }))}
                                    value={pBlockInfo.table}
                                    onChange={(aEvent: any) => changedOption('table', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                    selectValue={pBlockInfo.table}
                                    onSelectChange={(value: string) => changedOption('table', { target: { value, name: 'customSelect' } })}
                                    size="md"
                                    style={{ width: '160px' }}
                                />

                                {!pBlockInfo.table.match(VARIABLE_REGEX) && pBlockInfo?.tableInfo?.length > 0 ? (
                                    <DSInput
                                        label="Tag"
                                        labelPosition="left"
                                        type="text"
                                        value={pBlockInfo.tag}
                                        onChange={(e) => changedOption('tag', e)}
                                        size="md"
                                        style={{ maxWidth: '160px' }}
                                        rightIcon={<Button size="icon" variant="ghost" onClick={() => setIsTagDialogOpen(true)} icon={<MdOutlineOpenInNew />} />}
                                    />
                                ) : (
                                    <DSInput
                                        style={{ width: '160px' }}
                                        size="md"
                                        label="Tag"
                                        labelPosition="left"
                                        type="text"
                                        value={pBlockInfo.tag}
                                        onChange={(aEvent: any) => changedOption('tag', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                    />
                                )}
                            </Page.DpRow>
                            <Page.DpRow style={{ gap: '4px', flexFlow: 'wrap' }}>
                                <InputSelect
                                    label="Aggregator"
                                    labelPosition="left"
                                    type="text"
                                    options={getAggregatorList.map((opt: string) => ({ label: opt, value: opt }))}
                                    value={pBlockInfo.aggregator}
                                    onChange={(aEvent: any) => changedOption('aggregator', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                    selectValue={pBlockInfo.aggregator}
                                    onSelectChange={(value: string) => changedOption('aggregator', { target: { value, name: 'customSelect' } })}
                                    size="md"
                                    style={{ width: '160px' }}
                                />
                                {SEPARATE_DIFF && (
                                    <InputSelect
                                        label="Diff"
                                        labelPosition="left"
                                        type="text"
                                        options={['none'].concat(DIFF_LIST).map((opt: string) => ({ label: opt, value: opt }))}
                                        value={pBlockInfo?.diff || 'none'}
                                        onChange={(aEvent: any) => changedOption('diff', { target: { value: aEvent.target.value, name: 'customInput' } })}
                                        selectValue={pBlockInfo?.diff || 'none'}
                                        onSelectChange={(value: string) => changedOption('diff', { target: { value, name: 'customSelect' } })}
                                        size="sm"
                                    />
                                )}
                                <DSInput
                                    label="Alias"
                                    labelPosition="left"
                                    type="text"
                                    value={pBlockInfo.alias}
                                    onChange={(e) => changedOption('alias', e)}
                                    size="md"
                                    style={{ width: '160px' }}
                                />
                            </Page.DpRow>
                        </div>
                    ) : (
                        <></>
                    )}
                </Page.ContentBlock>
                {/* VALUE */}
                {!pBlockInfo.customFullTyping.use && pBlockInfo.useCustom ? (
                    pBlockInfo.values.map((aItem: any, aIdx: number) => {
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
                    })
                ) : (
                    <></>
                )}
                {/* FILTER */}
                {!pBlockInfo.customFullTyping.use && pBlockInfo.useCustom ? (
                    <>
                        <Page.Divi />
                        <Page.ContentBlock style={{ padding: '4px', gap: '4px', display: 'flex', flexWrap: 'wrap' }} pHoverNone>
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
                        </Page.ContentBlock>
                    </>
                ) : (
                    <></>
                )}
                {/* DURATION */}
                {pBlockInfo.useCustom && !pBlockInfo.customFullTyping.use && getUseDuration() ? <Duration pBlockInfo={pBlockInfo} pSetPanelOption={pSetPanelOption} /> : <></>}
            </Page>
            {sIsTagDialogOpen && (
                <TagSelectDialog
                    pTable={pBlockInfo.table}
                    pCallback={handleTagSelect}
                    pBlockOption={pBlockInfo}
                    pIsOpen={sIsTagDialogOpen}
                    pCloseModal={() => setIsTagDialogOpen(false)}
                    pInitialTag={pBlockInfo.tag}
                />
            )}
            {sFilterTagDialogInfo.isOpen && (
                <TagSelectDialog
                    pTable={pBlockInfo.table}
                    pCallback={handleFilterTagSelect}
                    pBlockOption={pBlockInfo}
                    pIsOpen={sFilterTagDialogInfo.isOpen}
                    pCloseModal={handleCloseFilterTagDialog}
                    pInitialTag={sFilterTagDialogInfo.initialValue}
                />
            )}
        </>
    );
};
