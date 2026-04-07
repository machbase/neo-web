import { useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { convertTagChartType } from '@/utils/utils';
import { getId } from '@/utils';
import { BiSolidChart, Search } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal, Button, Input, Dropdown, Pagination, List } from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { concatTagSet } from '@/utils/helpers/tags';
import { TAG_ANALYZER_AGGREGATION_MODES } from '../TagAnalyzerConstants';
import type { TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';

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

// Adds more tags to an existing panel.
// It searches available tags, tracks selected additions, and merges the chosen tags into the current panel config.
const AddTagsModal = ({
    pCloseModal,
    pTagSet,
    pOnChangeTagSet,
}: {
    pCloseModal: () => void;
    pTagSet: TagAnalyzerTagItem[];
    pOnChangeTagSet: (aTagSet: TagAnalyzerTagItem[]) => void;
}) => {
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(sTables[0]);
    const [sTagList, setTagList] = useState<any[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSearchText, setSearchText] = useState<string>('');
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sColumns, setColumns] = useState<TagAnalyzerTableColumns | undefined>();

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
        setSelectedTag(sSelectedTag.filter((_aItem: any, bIdx: number) => bIdx !== aIdx));
    };

    const setTagMode = (value: string, aValue: any) => {
        setSelectedTag(
            sSelectedTag.map((aItem) => {
                return aItem.table === aValue.table && aItem.tagName === aValue.tagName ? { ...aItem, calculationMode: value } : aItem;
            })
        );
    };

    const setPanels = async () => {
        if (sSelectedTag.length === 0) {
            Toast.error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12 - pTagSet.length) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }
        const tagSet = convertTagChartType(sSelectedTag);

        pOnChangeTagSet(concatTagSet(pTagSet, tagSet));
        pCloseModal();
    };

    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else loadTagList();
    };

    const setTag = async (aValue: any) => {
        if (sSelectedTag.length === 12 - pTagSet.length) return;
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
    const aggregationModeOptions = TAG_ANALYZER_AGGREGATION_MODES.map((aItem) => ({ label: aItem.value, value: aItem.value }));

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useDebounce([sTagPagination, sSelectedTable], loadTagList, 200);

    return (
        <Modal.Root isOpen={true} onClose={pCloseModal} style={{ maxWidth: '600px', width: '100%' }}>
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Tag
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
                                                <Dropdown.Trigger style={{ width: '100%', height: '25px', fontSize: '12px' }} />
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
                        <div
                            style={{
                                marginTop: '8px',
                                textAlign: 'right',
                                fontSize: '12px',
                                color: sSelectedTag.length === 12 - pTagSet.length ? '#ef6e6e' : 'inherit',
                            }}
                        >
                            Select: {sSelectedTag.length} / {12 - pTagSet.length}
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={setPanels}>OK</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default AddTagsModal;
