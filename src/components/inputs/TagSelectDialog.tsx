import { useMemo, useRef, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { BiSolidChart, Search } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components/Modal';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import useDebounce from '@/hooks/useDebounce';
import { Pagination, List } from '@/design-system/components';
import { IoBackspaceOutline } from 'react-icons/io5';

interface TagSelectDialogProps {
    pTable: string;
    pCallback: (aSelectTag: string) => void;
    pBlockOption: any;
    pIsOpen: boolean;
    pCloseModal: () => void;
    pInitialTag?: string;
}

const TagSelectDialog = ({ pTable, pCallback, pBlockOption, pIsOpen, pCloseModal, pInitialTag }: TagSelectDialogProps) => {
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(pTable || '');
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sTagInputValue, setTagInputValue] = useState<string>(pInitialTag || '');
    const [sSearchText, setSearchText] = useState<string>(pInitialTag || '');
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sColumns, setColumns] = useState<any>();
    const pageRef = useRef(null);

    const getTableInfo = async () => {
        const sFetchTableInfo: any = await fetchTableName(sSelectedTable);
        if (sFetchTableInfo.success) {
            const sColumnInfo = { name: sFetchTableInfo.data.rows[0][0], time: sFetchTableInfo.data.rows[1][0], value: sFetchTableInfo.data.rows[2][0] };
            setColumns(sColumnInfo);
            return sColumnInfo;
        } else {
            setTagList([]);
            setTotal(0);
            setColumns(() => {
                return { name: '', time: '', value: '' };
            });
            return Toast.error(sFetchTableInfo.message ?? '');
        }
    };

    const getTagList = async () => {
        if (!pBlockOption.tableInfo || pBlockOption.tableInfo.length < 1) return;
        if (!sSelectedTable) return;

        const sTable = sSelectedTable.split('.').length > 1 ? sSelectedTable : pBlockOption.userName + '.' + sSelectedTable;
        let sTotalRes: any = undefined;
        let sColumn: any = sColumns;
        if (!sSkipTagTotal) {
            sColumn = !sColumns ? await getTableInfo() : sColumns;
            if (!sColumn) return;
            sTotalRes = await getTagTotal(sTable, sSearchText, sColumn.name);
        }
        const sColumnName = sColumn?.name || (pBlockOption.tableInfo && pBlockOption.tableInfo[0] && pBlockOption.tableInfo[0][0]);
        if (!sColumnName) return;
        const sResult: any = await getTagPagination(sTable, sSearchText, sTagPagination, sColumnName);
        if (sResult.success) {
            if (!sSkipTagTotal && sTotalRes) setTotal(sTotalRes.data.rows[0][0]);
            setTagList(sResult.data.rows);
        } else setTagList([]);
        setSkipTagTotal(false);
    };

    const setTotal = (aTotal: number) => {
        sTagTotal !== aTotal && setTagTotal(aTotal);
    };

    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else getTagList();
    };

    const setTag = async (aValue: any) => {
        pCallback(aValue);
        pCloseModal();
    };

    const handleClear = () => {
        setTagInputValue('');
        setSearchText('');
        getTagList();
    };

    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useEffect(() => {
        if (!pIsOpen || !sSelectedTable) return;
        getTagList();
    }, [pIsOpen, sSelectedTable]);

    useEffect(() => {
        if (!pIsOpen) return;

        const sInitialTable = pTable || (sTables?.[0] ?? '');
        if (sInitialTable === sSelectedTable) return;

        setSelectedTable(sInitialTable);
        setTagPagination(1);
        setKeepPageNum(1);
    }, [pIsOpen, pTable, sTables, sSelectedTable]);

    useEffect(() => {
        if (!pIsOpen) return;

        if (pInitialTag) {
            setTagInputValue(pInitialTag);
            setSearchText(pInitialTag);
        } else {
            setTagInputValue('');
            setSearchText('');
        }
    }, [pIsOpen, pInitialTag]);

    useDebounce([sTagPagination, sSearchText], getTagList, 200);

    return (
        <Modal.Root isOpen={pIsOpen} onClose={pCloseModal} closeOnEscape={true} closeOnOutsideClick={true}>
            <Modal.Header className="tag-select-header">
                <Modal.Title>
                    <BiSolidChart />
                    Select
                    <Modal.TitleSub>{sSelectedTable}</Modal.TitleSub>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                    <Input
                        value={sTagInputValue}
                        onChange={(e) => {
                            setTagInputValue(e.target.value);
                            setSkipTagTotal(false);
                            setSearchText(e.target.value);
                        }}
                        autoFocus
                        label={`Tag(${sTagTotal})`}
                        labelPosition="left"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search tags..."
                        fullWidth
                        size="md"
                        rightIcon={<Button isToolTip toolTipContent="Clear" icon={<IoBackspaceOutline size={16} />} variant="ghost" size="icon" onClick={handleClear} />}
                    />
                    <Button icon={<Search size={16} />} isToolTip toolTipContent="Search" variant="primary" size="sm" onClick={handleSearch} />
                </div>

                <List
                    items={sTagList.map((aItem: string) => ({
                        id: aItem[1],
                        label: aItem[1],
                        tooltip: aItem[1],
                    }))}
                    onItemClick={(itemId) => setTag(itemId as string)}
                    emptyMessage="no-data"
                    maxHeight="100%"
                />

                <Pagination
                    ref={pageRef}
                    currentPage={sTagPagination}
                    totalPages={getMaxPageNum}
                    onPageChange={(page) => {
                        setSkipTagTotal(true);
                        setTagPagination(page);
                        setKeepPageNum(page);
                    }}
                    onPageInputChange={(value) => setKeepPageNum(Number(value) || '')}
                    onPageInputApply={(event) => {
                        if (sKeepPageNum === sTagPagination) return;
                        if (event === 'outsideClick' || (event as React.KeyboardEvent).key === 'Enter') {
                            if (!Number(sKeepPageNum)) {
                                setKeepPageNum(1);
                                setTagPagination(1);
                                return;
                            }
                            if (getMaxPageNum < Number(sKeepPageNum)) {
                                setKeepPageNum(getMaxPageNum);
                                setTagPagination(getMaxPageNum);
                                return;
                            }
                            setSkipTagTotal(true);
                            setTagPagination(Number(sKeepPageNum));
                        }
                    }}
                    inputValue={sKeepPageNum.toString()}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={pCloseModal}>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default TagSelectDialog;
