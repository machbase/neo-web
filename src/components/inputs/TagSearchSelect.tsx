import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Search } from '@/assets/icons/Icon';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowUp, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import { getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { Input } from './Input';
import { Tooltip } from 'react-tooltip';
import useOutsideClick from '@/hooks/useOutsideClick';
import useDebounce from '@/hooks/useDebounce';
import './TagSearchSelect.scss';
import useEsc from '@/hooks/useEsc';

export const TagSearchSelect = ({ pTable, pCallback, pBlockOption }: { pTable: string; pCallback: (aSelectTag: string) => void; pBlockOption: any }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sSearchText, setSearchText] = useState<string>('');
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sSelectedTagName, setSelectedTagName] = useState<string>('');
    const tagRef = useRef<any>(null);
    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    const getTagList = async () => {
        if (!sIsOpen) return;
        if (pTable) {
            const sTable = pTable.split('.').length > 1 ? pTable : pBlockOption.userName + '.' + pTable;
            let sTotalRes: any = undefined;
            if (pBlockOption.tableInfo.length < 1) return;
            if (!sSkipTagTotal) sTotalRes = await getTagTotal(sTable, sSearchText, pBlockOption.tableInfo[0][0]);
            const sResult: any = await getTagPagination(sTable, sSearchText, sTagPagination, pBlockOption.tableInfo[0][0]);
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
    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else getTagList();
    };
    const handleOutSideClick = () => {
        setIsOpen(false);
    };
    const setpagination = (aStatus: boolean) => {
        setSkipTagTotal(true);
        setTagPagination(aStatus ? sTagPagination + 1 : sTagPagination - 1);
        setKeepPageNum(aStatus ? sTagPagination + 1 : sTagPagination - 1);
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
    const setTag = (e: any, aItem: any) => {
        if (e.detail === 2) return setIsOpen(false);
        setSelectedTagName(aItem[1]);
        pCallback(aItem[1]);
    };
    const init = () => {
        getTagList();
    };

    useEffect(() => {
        if (sIsOpen) {
            init();
        } else {
            // clear val
            setSelectedTagName('');
            setSearchText('');
            setTagInputValue('');
            setSkipTagTotal(false);
            setKeepPageNum(1);
            setTagPagination(1);
            setTagList([]);
        }
    }, [sIsOpen]);

    useDebounce([sTagPagination], getTagList, 200);
    useEsc(() => setIsOpen(false));
    useOutsideClick(tagRef, () => sIsOpen && handleOutSideClick());

    return (
        <div ref={tagRef} className="tag-search-select-wrapper" id="tag-search-select-wrapper" style={{ backgroundColor: '#323644' }}>
            <div
                className="tag-search-select-open-btn-wrapper"
                onClick={(e: any) => {
                    e.stopPropagation();
                    setIsOpen(!sIsOpen);
                }}
            >
                {!sIsOpen && <MdOutlineKeyboardArrowDown />}
                {sIsOpen && <MdOutlineKeyboardArrowUp />}
            </div>
            {sIsOpen && (
                <div className="tag-search-select-content-wrapper">
                    <div className="tag-search-select-header">
                        <Input pValue={sTagInputValue} pSetValue={setTagInputValue} pIsFullWidth pHeight={36} onChange={filterTag} onEnter={handleSearch} />
                        <div className="tag-search-input-icon">
                            <Search size={18} onClick={handleSearch} />
                        </div>
                    </div>
                    <div className="tag-search-select-body">
                        {sTagList.map((aTag: any, aIdx: number) => {
                            return (
                                <button
                                    key={aIdx}
                                    className={`tag-tooltip-${aIdx} tag-search-select-body-content ${sSelectedTagName === aTag[1] ? 'tag-search-select-body-content-active' : ''}`}
                                    onClick={(e: any) => setTag(e, aTag)}
                                >
                                    <Tooltip anchorSelect={`.tag-tooltip-${aIdx}`} content={aTag[1]} />
                                    <div className="tag-text">{aTag[1]}</div>
                                </button>
                            );
                        })}

                        {sTagList.length <= 0 && <div className="tag-search-select-body-content-no">no-data</div>}
                    </div>
                    <div className="tag-search-select-bottom">
                        <div className="tag-search-select-bottom-pagination">
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
                            <button disabled={sTagPagination === 1} style={sTagPagination === 1 ? { opacity: 0.4, cursor: 'default' } : {}} onClick={() => setpagination(false)}>
                                <ArrowLeft />
                            </button>
                            <div className="custom-input-wrapper">
                                <input value={sKeepPageNum ?? ''} onChange={handlePaginationInput} onKeyDown={handleApplyPagenationInput} />
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
            )}
        </div>
    );
};
