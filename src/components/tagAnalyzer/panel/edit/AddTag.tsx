import { useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchDashboardJsonColumnSamples, fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { convertTagChartType } from '@/utils/utils';
import { getId } from '@/utils';
import { BiSolidChart, Search } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal, Button, Input, Dropdown, Pagination, List, InputSelect } from '@/design-system/components';
import useDebounce from '@/hooks/useDebounce';
import { concatTagSet } from '@/utils/helpers/tags';
import { avgMode } from '../../constants';
import { displayJsonPathLabel, extractJsonPathsFromSamples, isJsonTypeColumn, jsonPathInputToStoredPath } from '@/utils/dashboardJsonValue';
import {
    createTagAnalyzerColumnInfo,
    getTagAnalyzerTimeColumns,
    getTagAnalyzerValueColumns,
    isTagAnalyzerJsonValue,
    TagAnalyzerColumnInfo,
} from '@/utils/tagAnalyzerFields';

const FIELD_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' } as const;
const FIELD_LABEL_STYLE = { width: '120px', flexShrink: 0, color: '#c4c4c4', fontSize: '13px', fontWeight: 500 } as const;
const FIELD_CONTROL_GROUP_STYLE = { display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 } as const;
const FIELD_CONTROL_CONTAINER_STYLE = { flex: 1, minWidth: 0 } as const;
const JSON_KEY_LABEL_STYLE = { color: '#c4c4c4', fontSize: '13px', fontWeight: 500, flexShrink: 0 } as const;
const FIELD_INPUT_STYLE = { height: '30px' } as const;

const AddTag = ({ pCloseModal, pSetCopyPanelInfo, pPanelInfo }: any) => {
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(sTables?.[0] || '');
    const [sTagList, setTagList] = useState<any[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSearchText, setSearchText] = useState<string>('');
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sColumns, setColumns] = useState<TagAnalyzerColumnInfo>();
    const [sTableColumns, setTableColumns] = useState<any[]>([]);
    const [sJsonPathOptions, setJsonPathOptions] = useState<Record<string, string[]>>({});

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
        if (!sSelectedTable) return;
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
    };

    const setTotal = (aTotal: number) => {
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
        const sKnownPaths = (sColumns?.value && sJsonPathOptions[sColumns.value]) || [];
        updateColumns(createTagAnalyzerColumnInfo(sTableColumns, { ...sColumns, jsonKey: jsonPathInputToStoredPath(aValue, sKnownPaths) }));
    };

    const setPanels = async () => {
        if (sSelectedTag.length === 0) {
            Toast.error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12 - pPanelInfo.tag_set.length) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }
        const tagSet = convertTagChartType(sSelectedTag);

        pSetCopyPanelInfo({ ...pPanelInfo, tag_set: concatTagSet(pPanelInfo.tag_set, tagSet) });
        pCloseModal();
    };

    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else getTagList();
    };

    const setTag = async (aValue: any) => {
        if (sSelectedTag.length === 12 - pPanelInfo.tag_set.length) return;
        let columns = sColumns;
        if (!columns) columns = await getTableInfo();
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
    const avgModeOptions = avgMode.map((aItem) => ({ label: aItem.value, value: aItem.value }));
    const timeColumnOptions = getTagAnalyzerTimeColumns(sTableColumns).map((aItem) => ({ label: aItem[0], value: aItem[0] }));
    const valueColumnOptions = getTagAnalyzerValueColumns(sTableColumns).map((aItem) => ({
        label: isJsonTypeColumn(aItem[1]) ? `${aItem[0]} (JSON)` : aItem[0],
        value: aItem[0],
    }));
    const isJsonValue = isTagAnalyzerJsonValue(sTableColumns, sColumns?.value ?? '');
    const jsonKeyOptions = ((sColumns?.value && sJsonPathOptions[sColumns.value]) || []).map((aPath) => {
        const sLabel = displayJsonPathLabel(aPath);
        return { label: sLabel, value: sLabel };
    });

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useDebounce([sTagPagination, sSelectedTable], getTagList, 200);

    useEffect(() => {
        if (!sSelectedTable && sTables?.[0]) {
            setSelectedTable(sTables[0]);
        }
    }, [sSelectedTable, sTables]);

    useEffect(() => {
        if (!sSelectedTable) return;
        getTableInfo();
    }, [sSelectedTable]);

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
                                        value={displayJsonPathLabel(sColumns?.jsonKey ?? '')}
                                        onChange={(aEvent: any) => changeJsonKey(aEvent.target.value)}
                                        selectValue={displayJsonPathLabel(sColumns?.jsonKey ?? '')}
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
                                            <Dropdown.Root options={avgModeOptions} value={aItem.calculationMode || 'avg'} onChange={(value) => setTagMode(value, aItem)}>
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
                                color: sSelectedTag.length === 12 - pPanelInfo.tag_set.length ? '#ef6e6e' : 'inherit',
                            }}
                        >
                            Select: {sSelectedTag.length} / {12 - pPanelInfo.tag_set.length}
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

export default AddTag;
