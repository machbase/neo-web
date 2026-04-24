import { useMemo, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { fetchDashboardJsonColumnSamples, fetchOnMinMaxTable, fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getId, getUserName } from '@/utils';
import { BiSolidChart, Search } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { InputSelect } from '@/design-system/components/InputSelect';
import Pagination from '@/design-system/components/Pagination';
import { Dropdown } from '@/design-system/components/Dropdown';
import List from '@/design-system/components/List';
import useDebounce from '@/hooks/useDebounce';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Toast } from '@/design-system/components';
import { concatTagSet } from '@/utils/helpers/tags';
import { avgMode } from './constants';
import { extractJsonPathsFromSamples, isJsonTypeColumn, normalizeJsonPath } from '@/utils/dashboardJsonValue';
import {
    createTagAnalyzerColumnInfo,
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
    TagAnalyzerColumnInfo,
} from '@/utils/tagAnalyzerFields';
import { convertDashboardMinMaxRows } from '@/utils/dashboardBlockColumns';

const FIELD_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' } as const;
const FIELD_LABEL_STYLE = { width: '120px', flexShrink: 0, color: '#c4c4c4', fontSize: '13px', fontWeight: 500 } as const;
const FIELD_CONTROL_GROUP_STYLE = { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 } as const;
const FIELD_CONTROL_CONTAINER_STYLE = { flex: 1, minWidth: 0 } as const;
const JSON_KEY_LABEL_STYLE = { color: '#c4c4c4', fontSize: '13px', fontWeight: 500, flexShrink: 0 } as const;
const FIELD_INPUT_STYLE = { height: '30px' } as const;

interface ModalCreateChartProps {
    isOpen: boolean;
    onClose: () => void;
}

const ModalCreateChart = ({ isOpen, onClose }: ModalCreateChartProps) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(sTables?.[0] || '');
    const [sTagList, setTagList] = useState<any[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sSelectedChartType, setSelectedChartType] = useState<string>('Line');
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSearchText, setSearchText] = useState<string>('');
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sColumns, setColumns] = useState<TagAnalyzerColumnInfo>();
    const [sTableColumns, setTableColumns] = useState<any[]>([]);
    const [sJsonPathOptions, setJsonPathOptions] = useState<Record<string, string[]>>({});

    // Reset all state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTagPagination(1);
            setKeepPageNum(1);
            setSelectedTag([]);
            setSelectedChartType('Line');
            setTagInputValue('');
            setSearchText('');
            setTagTotal(0);
            setSkipTagTotal(false);
            setColumns(undefined);
            setTableColumns([]);
            setJsonPathOptions({});
            setSelectedTable(sTables?.[0] || '');
        }
    }, [isOpen, sTables]);

    const setChartType = (aType: string) => {
        setSelectedChartType(aType);
    };
    const getTableInfo = async () => {
        const sFetchTableInfo: any = await fetchTableName(sSelectedTable);
        if (sFetchTableInfo.success) {
            const sRows = sFetchTableInfo.data.rows ?? [];
            const sColumnInfo = createTagAnalyzerColumnInfo(sRows, sColumns);
            setTableColumns(sRows);
            setColumns(sColumnInfo);
            return sColumnInfo;
        } else {
            setTagList([]);
            setTotal(0);
            setTableColumns([]);
            setColumns(() => {
                return { name: '', time: '', value: '', jsonKey: '' };
            });
            Toast.error(sFetchTableInfo.message ?? '');
            return undefined;
        }
    };
    const getTagList = async () => {
        if (sSelectedTable) {
            let sTotalRes: any = undefined;
            let sColumn: any = sColumns;
            if (!sColumn) sColumn = await getTableInfo();
            if (!sColumn?.name) {
                setTagList([]);
                setSkipTagTotal(false);
                return;
            }
            if (!sSkipTagTotal) {
                sColumn = sSearchText === '' ? await getTableInfo() : sColumn;
                sTotalRes = await getTagTotal(sSelectedTable, sSearchText, sColumn.name);
            }
            const sResult: any = await getTagPagination(sSelectedTable, sSearchText, sTagPagination, sColumn.name);
            if (sResult.success) {
                if (!sSkipTagTotal) setTotal(sTotalRes.data.rows[0][0]);
                setTagList(sResult.data.rows);
            } else setTagList([]);
            setSkipTagTotal(false);
        }
    };
    const setTotal = (aTotal: number) => {
        sTagTotal !== aTotal && setTagTotal(aTotal);
    };
    const filterTag = (aEvent: any) => {
        setSkipTagTotal(false);
        setSearchText(aEvent.target.value);
    };
    const removeSelectedTag = (aIdx: any) => {
        setSelectedTag(
            sSelectedTag.filter((aItem: any, bIdx: number) => {
                aItem;
                return bIdx !== aIdx;
            })
        );
    };
    const setTagMode = (value: string, aValue: any) => {
        setSelectedTag(
            sSelectedTag.map((aItem) => {
                return aItem.table === aValue.table && aItem.key === aValue.key ? { ...aItem, calculationMode: value } : aItem;
            })
        );
    };

    const updateColumns = (aColumnInfo: TagAnalyzerColumnInfo) => {
        setColumns(aColumnInfo);
        setSelectedTag((aPrev) => aPrev.map((aItem) => (aItem.table === sSelectedTable ? { ...aItem, colName: aColumnInfo } : aItem)));
    };

    const changeTimeField = (aValue: string) => {
        updateColumns(createTagAnalyzerColumnInfo(sTableColumns, { ...sColumns, time: aValue }));
    };

    const changeValueField = (aValue: string) => {
        const sJsonKey = isTagAnalyzerJsonValue(sTableColumns, aValue) && sColumns?.value === aValue ? sColumns?.jsonKey ?? '' : '';
        updateColumns(createTagAnalyzerColumnInfo(sTableColumns, { ...sColumns, value: aValue, jsonKey: sJsonKey }));
    };

    const changeJsonKey = (aValue: string) => {
        updateColumns(createTagAnalyzerColumnInfo(sTableColumns, { ...sColumns, jsonKey: normalizeJsonPath(aValue) }));
    };

    const avgModeOptions = avgMode.map((mode) => ({ value: mode.value, label: mode.key }));
    const setPanels = async () => {
        if (sSelectedTag.length === 0) {
            Toast.error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sRes: any = await fetchOnMinMaxTable(sSelectedTag, sCurrentUserName);
        const sMinMax = sRes.data;

        if (!sMinMax.rows[0][0] || !sMinMax.rows[0][1]) {
            Toast.error('Please insert Data.');
            return;
        }
        const sMinMaxRows = convertDashboardMinMaxRows(sMinMax.rows, sColumns);
        if (!sMinMaxRows) {
            Toast.error('Please insert Data.');
            return;
        }
        const minMillis = sMinMaxRows.min;
        const maxMillis = sMinMaxRows.max;
        if (sMinMax) {
            if (sMinMax.rows[0][0] === sMinMax.rows[0][1]) {
                const sRangeData = {
                    max: 0,
                    min: 0,
                };

                const minMaxDifference = 10;

                if (maxMillis - minMillis < minMaxDifference) {
                    sRangeData.max = maxMillis + minMaxDifference;
                }
                sRangeData.min = minMillis;

                const sNewData = {
                    chartType: sSelectedChartType,
                    tagSet: concatTagSet([], sSelectedTag),
                    defaultRange: sRangeData,
                };

                const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
                setBoardList(
                    sBoardList.map((aItem) => {
                        return aItem.id === sSelectedTab ? { ...aItem, panels: aItem.panels.concat(chartFormat) } : aItem;
                    })
                );
            } else {
                const sNewData = {
                    chartType: sSelectedChartType,
                    tagSet: concatTagSet([], sSelectedTag),
                    defaultRange: { min: minMillis, max: maxMillis },
                };

                const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
                setBoardList(
                    sBoardList.map((aItem) => {
                        return aItem.id === sSelectedTab ? { ...aItem, panels: aItem.panels.concat(chartFormat) } : aItem;
                    })
                );
            }
        }
        onClose();
    };
    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else getTagList();
    };
    const setTag = async (aValue: any) => {
        if (sSelectedTag.length === 12) return Toast.error('The maximum number of tags in a chart is 12.');

        // Ensure columns are loaded
        let columns = sColumns;
        if (!columns) {
            columns = await getTableInfo();
        }
        if (!columns?.time) return Toast.error('please select time field.');
        if (!columns?.value) return Toast.error('please select value field.');
        if (isTagAnalyzerJsonValue(sTableColumns, columns.value) && !columns.jsonKey) return Toast.error('please select JSON key.');

        setSelectedTag([
            ...sSelectedTag,
            {
                key: getId(),
                tagName: aValue,
                table: sSelectedTable,
                calculationMode: 'avg',
                alias: '',
                weight: 1.0,
                // onRollup: false,
                colName: columns,
            },
        ]);
    };
    const changedTable = (value: string) => {
        setSelectedTable(value);
        setSearchText('');
        setTagInputValue('');
        setTagPagination(1);
        setKeepPageNum(1);
        setColumns(undefined);
        setTableColumns([]);
        setJsonPathOptions({});
    };

    const tableOptions = sTables?.map((table: string) => ({ value: table, label: table })) || [];
    const timeColumnOptions = getTagAnalyzerTimeColumns(sTableColumns).map((aItem) => ({ label: aItem[0], value: aItem[0] }));
    const valueColumnOptions = getTagAnalyzerValueColumns(sTableColumns).map((aItem) => ({
        label: isJsonTypeColumn(aItem[1]) ? `${aItem[0]} (JSON)` : aItem[0],
        value: aItem[0],
    }));
    const isJsonValue = isTagAnalyzerJsonValue(sTableColumns, sColumns?.value ?? '');
    const jsonKeyOptions = ((sColumns?.value && sJsonPathOptions[sColumns.value]) || []).map((aPath) => ({ label: aPath, value: aPath }));

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useDebounce([sTagPagination, sSelectedTable], getTagList, 200);

    useEffect(() => {
        if (!isOpen || !sSelectedTable) return;
        getTableInfo();
    }, [isOpen, sSelectedTable]);

    useEffect(() => {
        const getJsonKeyOptions = async () => {
            if (!sSelectedTable || !sColumns?.value || !isTagAnalyzerJsonValue(sTableColumns, sColumns.value) || sJsonPathOptions[sColumns.value]) return;
            const sData: any = await fetchDashboardJsonColumnSamples(sSelectedTable, sColumns.value);
            if (sData?.success) {
                const sSamples = sData.data?.rows?.map((aRow: any) => aRow?.[0]) ?? [];
                setJsonPathOptions((aPrev) => ({ ...aPrev, [sColumns.value]: extractJsonPathsFromSamples(sSamples) }));
            }
        };

        getJsonKeyOptions();
    }, [sColumns?.value, sSelectedTable, sTableColumns, sJsonPathOptions]);

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose} style={{ maxWidth: '600px', width: '100%' }}>
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Chart
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                {/* Table Selection */}
                <Dropdown.Root label="Table" labelPosition="left" options={tableOptions} value={sSelectedTable} onChange={changedTable} fullWidth>
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
                <InputSelect
                    label="Time field"
                    labelPosition="left"
                    type="text"
                    options={timeColumnOptions}
                    value={sColumns?.time ?? ''}
                    onChange={(aEvent: any) => changeTimeField(aEvent.target.value)}
                    selectValue={sColumns?.time ?? ''}
                    onSelectChange={changeTimeField}
                    disabled={!sSelectedTable}
                    fullWidth
                    size="sm"
                    style={{ height: '30px' }}
                />
                <div style={FIELD_ROW_STYLE}>
                    <label style={FIELD_LABEL_STYLE}>Value field</label>
                    <div style={FIELD_CONTROL_GROUP_STYLE}>
                        <div style={FIELD_CONTROL_CONTAINER_STYLE}>
                            <InputSelect
                                aria-label="Value field"
                                type="text"
                                options={valueColumnOptions}
                                value={sColumns?.value ?? ''}
                                onChange={(aEvent: any) => changeValueField(aEvent.target.value)}
                                selectValue={sColumns?.value ?? ''}
                                onSelectChange={changeValueField}
                                disabled={!sSelectedTable}
                                fullWidth
                                size="sm"
                                style={FIELD_INPUT_STYLE}
                            />
                        </div>
                        {isJsonValue ? (
                            <>
                                <span style={JSON_KEY_LABEL_STYLE}>-&gt;$</span>
                                <div style={FIELD_CONTROL_CONTAINER_STYLE}>
                                    <InputSelect
                                        aria-label="JSON key"
                                        type="text"
                                        options={jsonKeyOptions}
                                        value={sColumns?.jsonKey ?? ''}
                                        onChange={(aEvent: any) => changeJsonKey(aEvent.target.value)}
                                        selectValue={sColumns?.jsonKey ?? ''}
                                        onSelectChange={changeJsonKey}
                                        fullWidth
                                        size="sm"
                                        style={FIELD_INPUT_STYLE}
                                    />
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
                {/* Chart Type Selection */}
                <Button.Group label="Chart" labelPosition="left">
                    <Button variant="ghost" size="md" onClick={() => setChartType('Zone')} active={sSelectedChartType === 'Zone'}>
                        <img src={InnerLine} alt="Zone Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setChartType('Dot')} active={sSelectedChartType === 'Dot'}>
                        <img src={Scatter} alt="Scatter Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setChartType('Line')} active={sSelectedChartType === 'Line'}>
                        <img src={Line} alt="Line Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                </Button.Group>
                {/* Tag Selection */}
                <Input
                    label={`Tag (${sTagTotal})`}
                    labelPosition="left"
                    value={sTagInputValue}
                    onChange={(e) => {
                        setTagInputValue(e.target.value);
                        filterTag(e);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    fullWidth
                    size="sm"
                    height={'30px'}
                    rightIcon={<Button variant="ghost" size="icon" icon={<Search size={16} />} onClick={handleSearch} aria-label="Search tags" />}
                />
                <div style={{ display: 'flex', gap: '12px', flex: '1 1 auto', minWidth: 0 }}>
                    <div style={{ flex: '1 1 0', minWidth: '120px', maxWidth: '120px' }} />
                    {/* Available Tags */}
                    <div style={{ flex: '2 1 0', minWidth: 0 }}>
                        <List
                            maxHeight={200}
                            items={sTagList.map((aItem: any) => ({
                                id: aItem[0],
                                label: aItem[1],
                                tooltip: aItem[1],
                            }))}
                            onItemClick={(id) => {
                                const item = sTagList.find((aItem: any) => aItem[0] === id);
                                if (item) setTag(item[1]);
                            }}
                        />
                        <Pagination
                            currentPage={sTagPagination}
                            totalPages={getMaxPageNum}
                            onPageChange={(page) => {
                                setTagPagination(page);
                                setKeepPageNum(page);
                            }}
                            inputValue={String(sKeepPageNum)}
                            onPageInputChange={(val) => setKeepPageNum(val)}
                            style={{ marginTop: '8px' }}
                        />
                    </div>
                    {/* Selected Tags */}
                    <div style={{ flex: '2 1 0', minWidth: 0 }}>
                        <List
                            maxHeight={200}
                            items={sSelectedTag.map((aItem: any) => ({
                                id: aItem.key,
                                label: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aItem.tagName}</span>
                                        <div style={{ width: '80px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                            <Dropdown.Root options={avgModeOptions} value={aItem.calculationMode || 'avg'} onChange={(value) => setTagMode(value, aItem)}>
                                                <Dropdown.Trigger className="dropdown-trigger-sm" />
                                                <Dropdown.Menu>
                                                    <Dropdown.List />
                                                </Dropdown.Menu>
                                            </Dropdown.Root>
                                        </div>
                                    </div>
                                ),
                                tooltip: aItem.tagName,
                            }))}
                            onItemClick={(id) => {
                                const idx = sSelectedTag.findIndex((aItem: any) => aItem.key === id);
                                if (idx !== -1) removeSelectedTag(idx);
                            }}
                        />
                        <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '12px', color: sSelectedTag.length === 12 ? '#ef6e6e' : 'inherit' }}>
                            Select: {sSelectedTag.length} / 12
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={setPanels}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default ModalCreateChart;
