import { useMemo, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { fetchOnMinMaxTable, fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getId, getUserName } from '@/utils';
import { BiSolidChart, Search } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import Pagination from '@/design-system/components/Pagination';
import { Dropdown } from '@/design-system/components/Dropdown';
import List from '@/design-system/components/List';
import useDebounce from '@/hooks/useDebounce';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { Toast } from '@/design-system/components';
import { concatTagSet } from '@/utils/helpers/tags';
import { TAG_ANALYZER_AGGREGATION_MODES } from '../TagAnalyzerConstants';

type TagAnalyzerTableColumns = {
    name: string;
    time: string;
    value: string;
};

const EMPTY_TAG_ANALYZER_TABLE_COLUMNS: TagAnalyzerTableColumns = {
    name: '',
    time: '',
    value: '',
};

const buildTableColumns = (aRows: any[][]): TagAnalyzerTableColumns => {
    return {
        name: aRows?.[0]?.[0] ?? '',
        time: aRows?.[1]?.[0] ?? '',
        value: aRows?.[2]?.[0] ?? '',
    };
};

const buildDefaultRange = (aMinMillis: number, aMaxMillis: number) => {
    if (aMinMillis === aMaxMillis) {
        const sMinMaxDifference = 10;

        return {
            min: aMinMillis,
            max: aMaxMillis - aMinMillis < sMinMaxDifference ? aMaxMillis + sMinMaxDifference : 0,
        };
    }

    return {
        min: aMinMillis,
        max: aMaxMillis,
    };
};

// Collects table, tag, and chart-type choices for creating a new panel.
// It handles searching tags, paging results, and applying the new panel to the board.
const CreateChartModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => {
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
    const [sColumns, setColumns] = useState<TagAnalyzerTableColumns | undefined>();

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
            setSelectedTable(sTables?.[0] || '');
        }
    }, [isOpen, sTables]);

    const setChartType = (aType: string) => {
        setSelectedChartType(aType);
    };
    const fetchTableColumns = async () => {
        const sFetchTableInfo: any = await fetchTableName(sSelectedTable);
        if (!sFetchTableInfo.success) {
            return {
                columns: undefined,
                message: sFetchTableInfo.message ?? '',
            };
        }

        return {
            columns: buildTableColumns(sFetchTableInfo.data.rows),
            message: '',
        };
    };

    const fetchTagPage = async () => {
        if (!sSelectedTable) {
            return {
                rows: [],
                total: 0,
                columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                errorMessage: undefined,
            };
        }

        let sColumnsToUse = sColumns;
        if (!sColumnsToUse || sSearchText === '') {
            const sTableColumns = await fetchTableColumns();
            if (!sTableColumns.columns) {
                return {
                    rows: [],
                    total: 0,
                    columns: EMPTY_TAG_ANALYZER_TABLE_COLUMNS,
                    errorMessage: sTableColumns.message,
                };
            }
            sColumnsToUse = sTableColumns.columns;
        }

        let sTotal: number | undefined;
        if (!sSkipTagTotal) {
            const sTotalRes: any = await getTagTotal(sSelectedTable, sSearchText, sColumnsToUse.name);
            sTotal = sTotalRes.data.rows[0][0];
        }

        const sResult: any = await getTagPagination(sSelectedTable, sSearchText, sTagPagination, sColumnsToUse.name);

        return {
            rows: sResult.success ? sResult.data.rows : [],
            total: sTotal,
            columns: sColumnsToUse,
            errorMessage: undefined,
        };
    };

    const loadTagList = async () => {
        const sTagPage = await fetchTagPage();
        if (sTagPage.errorMessage) {
            setTagList([]);
            updateTotal(0);
            setColumns(EMPTY_TAG_ANALYZER_TABLE_COLUMNS);
            setSkipTagTotal(false);
            Toast.error(sTagPage.errorMessage);
            return;
        }

        setColumns(sTagPage.columns);
        if (typeof sTagPage.total === 'number' && !sSkipTagTotal) updateTotal(sTagPage.total);
        setTagList(sTagPage.rows);
        setSkipTagTotal(false);
    };

    const updateTotal = (aTotal: number) => {
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

    const aggregationModeOptions = TAG_ANALYZER_AGGREGATION_MODES.map((mode) => ({ value: mode.value, label: mode.key }));
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
        const minMillis = Math.floor(sMinMax.rows[0][0] / 1000000);
        const maxMillis = Math.floor(sMinMax.rows[0][1] / 1000000);
        if (sMinMax) {
            const sNewData = {
                chartType: sSelectedChartType,
                tagSet: concatTagSet([], sSelectedTag),
                defaultRange: buildDefaultRange(minMillis, maxMillis),
            };

            const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
            setBoardList(
                sBoardList.map((aItem) => {
                    return aItem.id === sSelectedTab ? { ...aItem, panels: aItem.panels.concat(chartFormat) } : aItem;
                })
            );
        }
        onClose();
    };
    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else loadTagList();
    };
    const setTag = async (aValue: any) => {
        if (sSelectedTag.length === 12) return Toast.error('The maximum number of tags in a chart is 12.');

        let sColumnsToUse = sColumns;
        if (!sColumnsToUse) {
            const sTableColumns = await fetchTableColumns();
            if (!sTableColumns.columns) {
                Toast.error(sTableColumns.message);
                return;
            }
            sColumnsToUse = sTableColumns.columns;
            setColumns(sColumnsToUse);
        }

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
                colName: sColumnsToUse,
            },
        ]);
    };
    const changedTable = (value: string) => {
        setSelectedTable(value);
        setSearchText('');
        setTagInputValue('');
        setTagPagination(1);
        setKeepPageNum(1);
    };

    const tableOptions = sTables?.map((table: string) => ({ value: table, label: table })) || [];

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useDebounce([sTagPagination, sSelectedTable], loadTagList, 200);

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
                                            <Dropdown.Root options={aggregationModeOptions} value={aItem.calculationMode || 'avg'} onChange={(value) => setTagMode(value, aItem)}>
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

export default CreateChartModal;
