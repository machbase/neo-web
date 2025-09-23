import './TagSelectDialog.scss';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { BiSolidChart, Close, ArrowLeft, ArrowRight, Search } from '@/assets/icons/Icon';
import { Error } from '@/components/toast/Toast';
import { Input } from '@/components/inputs/Input';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import useDebounce from '@/hooks/useDebounce';
import useOutsideClick from '@/hooks/useOutsideClick';
import useEsc from '@/hooks/useEsc';
import { Tooltip } from 'react-tooltip';

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
    const [sIsStartInner, setIsStartInner] = useState<any>(null);
    const pageRef = useRef(null);
    const modalRef = useRef<HTMLDivElement>(null);

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
            return Error(sFetchTableInfo.message ?? '');
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

    const filterTag = (aEvent: any) => {
        setSkipTagTotal(false);
        setSearchText(aEvent.target.value);
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
    const handlePaginationInput = (aEvent: any) => {
        setKeepPageNum(aEvent.target.value);
    };
    const handleApplyPagenationInput = (aEvent: any) => {
        if (sKeepPageNum === sTagPagination) return;
        if (aEvent.keyCode === 13 || aEvent === 'outsideClick') {
            if (!Number(sKeepPageNum)) {
                setKeepPageNum(1);
                setTagPagination(1);
                return;
            }
            if (getMaxPageNum < sKeepPageNum) {
                setKeepPageNum(getMaxPageNum);
                setTagPagination(getMaxPageNum);
                return;
            }
            setSkipTagTotal(true);
            setTagPagination(sKeepPageNum);
        }
    };
    const setpagination = (aStatus: boolean) => {
        setSkipTagTotal(true);
        setTagPagination(aStatus ? sTagPagination + 1 : sTagPagination - 1);
        setKeepPageNum(aStatus ? sTagPagination + 1 : sTagPagination - 1);
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

    // ESC key handler
    useEsc(() => pCloseModal());

    // Outside click handler for modal
    useEffect(() => {
        const handleInner = (event: MouseEvent) => {
            if (modalRef.current) {
                setIsStartInner(modalRef.current.contains(event.target as Node));
            }
        };

        document.addEventListener('mousedown', handleInner);
        return () => {
            document.removeEventListener('mousedown', handleInner);
        };
    }, []);

    const handleOverlayClick = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && !modalRef.current.contains(aEvent.target as Node) && !sIsStartInner) {
            pCloseModal();
        }
    };
    const handleClear = () => {
        setTagInputValue('');
        setSearchText('');
        getTagList();
    };

    useDebounce([sTagPagination, sSearchText], getTagList, 200);
    useOutsideClick(pageRef, () => handleApplyPagenationInput('outsideClick'));

    if (!pIsOpen) return null;

    return (
        <div className="modal-overlay-tag-select" onClick={handleOverlayClick}>
            <div ref={modalRef} className="modal-form-tag-select">
                <div className="inner-form">
                    <div className="header">
                        <div className="header-title">
                            <BiSolidChart />
                            Select {sSelectedTable}
                        </div>
                        <div className="header-close">
                            <Close onClick={pCloseModal} color="#f8f8f8" />
                        </div>
                    </div>
                    <div className="body">
                        <div className="table-select" style={{ display: 'none' }}>
                            <div className="title">Table</div>
                            <div className="combobox-select">
                                <Input pValue={sSelectedTable} pWidth={175} pHeight={32} pIsDisabled onChange={() => {}} />
                            </div>
                        </div>
                        <div className="tag-select">
                            <div className="title">
                                <span>Tag</span>
                                <Tooltip anchorSelect={`.tooltip-tag-meta`} content={sTagTotal + ''} />
                                <span className={`select-text tooltip-tag-meta`}>({sTagTotal})</span>
                            </div>
                            <div className="tag-form">
                                <div className="filter-form-tag">
                                    <div className="tag-input-form">
                                        <div className="tag-input-form-search">
                                            <Input pValue={sTagInputValue} pSetValue={setTagInputValue} pIsFullWidth pHeight={36} onChange={filterTag} onEnter={handleSearch} />
                                            <button className="search" onClick={handleClear}>
                                                <Close size={18} />
                                            </button>
                                        </div>
                                        <button className="search" onClick={handleSearch}>
                                            <Search size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="select-tag-form">
                                    <div className="select-tag-wrap">
                                        <div className="select-tab">
                                            {sTagList.map((aItem: string, aIdx: number) => {
                                                return (
                                                    <button key={aItem[1]} className={`tag-tooltip-${aIdx}`} onClick={() => setTag(aItem[1])} style={{ margin: '1px' }}>
                                                        <Tooltip anchorSelect={`.tag-tooltip-${aIdx}`} content={aItem[1]} />
                                                        <div className="tag-text">{aItem[1]}</div>
                                                    </button>
                                                );
                                            })}

                                            {sTagList.length <= 0 && <div className="tag-search-select-body-content-no">no-data</div>}
                                        </div>
                                        <div className="bottom-page">
                                            <div className="pagination">
                                                <button
                                                    disabled={sTagPagination === 1}
                                                    style={sTagPagination === 1 ? { opacity: 0.4, cursor: 'default' } : {}}
                                                    onClick={() => {
                                                        setSkipTagTotal(true);
                                                        setTagPagination(1);
                                                        setKeepPageNum(1);
                                                    }}
                                                >
                                                    <MdKeyboardDoubleArrowLeft />
                                                </button>
                                                <button
                                                    disabled={sTagPagination === 1}
                                                    style={sTagPagination === 1 ? { opacity: 0.4, cursor: 'default' } : {}}
                                                    onClick={() => setpagination(false)}
                                                >
                                                    <ArrowLeft />
                                                </button>
                                                <div ref={pageRef} className="custom-input-wrapper" style={{ height: '20px' }}>
                                                    <input
                                                        value={sKeepPageNum ?? ''}
                                                        style={{ width: '45px', textAlign: 'center' }}
                                                        onChange={handlePaginationInput}
                                                        onKeyDown={handleApplyPagenationInput}
                                                    />
                                                </div>
                                                <button
                                                    disabled={sTagPagination >= getMaxPageNum}
                                                    style={sTagPagination >= getMaxPageNum ? { opacity: 0.4, cursor: 'default' } : {}}
                                                    onClick={() => setpagination(true)}
                                                >
                                                    <ArrowRight />
                                                </button>
                                                <button
                                                    disabled={sTagPagination >= getMaxPageNum}
                                                    style={sTagPagination >= getMaxPageNum ? { opacity: 0.4, cursor: 'default' } : {}}
                                                    onClick={() => {
                                                        setSkipTagTotal(true);
                                                        setTagPagination(getMaxPageNum);
                                                        setKeepPageNum(getMaxPageNum);
                                                    }}
                                                >
                                                    <MdOutlineKeyboardDoubleArrowRight />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagSelectDialog;
