import './AddTag.scss';
import { useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchTableName, getTagPagination, getTagTotal } from '@/api/repository/machiot';
import { convertTagChartType } from '@/utils/utils';
import { getId } from '@/utils';
import { BiSolidChart, Close, ArrowLeft, ArrowRight, Search } from '@/assets/icons/Icon';
import { Error } from '@/components/toast/Toast';
import { Select } from '@/components/inputs/Select';
import { TextButton } from '@/components/buttons/TextButton';
import { Input } from '@/components/inputs/Input';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import useDebounce from '@/hooks/useDebounce';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Tooltip } from 'react-tooltip';
import { concatTagSet } from '@/utils/helpers/tags';
import { avgMode } from '../../constants';

const ModalCreateChart = ({ pCloseModal, pSetCopyPanelInfo, pPanelInfo }: any) => {
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(sTables[0]);
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSearchText, setSearchText] = useState<string>('');
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
            return Error(sFetchTableInfo.message ?? '');
        }
    };
    const getTagList = async () => {
        let sTotalRes: any = undefined;
        let sColumn: any = sColumns;
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
        setSelectedTag(
            sSelectedTag.filter((aItem: any, bIdx: number) => {
                aItem;
                return bIdx !== aIdx;
            })
        );
    };

    const setTagMode = (aEvent: any, aValue: any) => {
        setSelectedTag(
            sSelectedTag.map((aItem) => {
                return aItem.table === aValue.table && aItem.tagName === aValue.tagName ? { ...aItem, calculationMode: aEvent.target.value } : aItem;
            })
        );
    };

    const setPanels = async () => {
        if (sSelectedTag.length === 0) {
            Error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12 - pPanelInfo.tag_set.length) {
            Error('The maximum number of tags in a chart is 12.');
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
        setSelectedTag([
            ...sSelectedTag,
            {
                key: getId(),
                tagName: aValue,
                table: sSelectedTable,
                calculationMode: 'avg',
                alias: '',
                weight: 1.0,
                colName: sColumns,
            },
        ]);
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
    const changedTable = (aEvent: any) => {
        setSelectedTable(aEvent.target.value);
        setSearchText('');
        setTagInputValue('');
        setTagPagination(1);
        setKeepPageNum(1);
    };
    const getMaxPageNum = useMemo(() => {
        return Math.ceil(sTagTotal / 10);
    }, [sTagTotal]);

    useDebounce([sTagPagination, sSelectedTable], getTagList, 200);
    useOutsideClick(pageRef, () => handleApplyPagenationInput('outsideClick'));

    return (
        <div className="modal-form-tag">
            <div className="inner-form">
                <div className="header">
                    <div className="header-title">
                        <BiSolidChart />
                        New Tag
                    </div>
                    <div className="header-close">
                        <Close onClick={pCloseModal} color="#f8f8f8" />
                    </div>
                </div>
                <div className="body">
                    <div className="table-select">
                        <div className="title">Table</div>
                        <div className="combobox-select">
                            <Select pIsFullWidth pInitValue={sTables[0]} pHeight={32} onChange={changedTable} pOptions={sTables} />
                        </div>
                    </div>
                    {/* {!sRollupTable && <p>* The table is show because the roll-up table is not generated.</p>} */}
                    <div className="tag-select">
                        <div className="title">
                            <text>Tag</text>
                            <Tooltip anchorSelect={`.tooltip-tag-meta`} content={sTagTotal + ''} />
                            <text className={`select-text tooltip-tag-meta`}>({sTagTotal})</text>
                        </div>
                        <div className="tag-form">
                            <div className="filter-form-tag">
                                <div className="tag-input-form">
                                    <Input pValue={sTagInputValue} pSetValue={setTagInputValue} pIsFullWidth pHeight={36} onChange={filterTag} onEnter={handleSearch} />
                                    <button className="search" onClick={handleSearch}>
                                        <Search size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="select-tag-form">
                                <div className="select-tag-wrap">
                                    <div className="select-tab" style={{ overflow: 'hidden' }}>
                                        {sTagList.map((aItem: string) => {
                                            return (
                                                <button key={aItem[1]} onClick={() => setTag(aItem[1])} style={{ margin: '1px' }}>
                                                    {aItem[1]}
                                                </button>
                                            );
                                        })}
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
                                <div className="select-tag-wrap">
                                    <div className="select-tab">
                                        {sSelectedTag.map((aItem: any, aIdx: number) => {
                                            return (
                                                <button
                                                    onClick={() => {
                                                        removeSelectedTag(aIdx);
                                                    }}
                                                    key={aItem.key}
                                                >
                                                    <Tooltip anchorSelect={`.tooltip-${aIdx}`} content={aItem.tagName} />
                                                    <div className={`select-text tooltip-${aIdx}`}>{aItem.tagName}</div>
                                                    <Select
                                                        pWidth={70}
                                                        pHeight={25}
                                                        pInitValue="avg"
                                                        onChange={(aEvent) => setTagMode(aEvent, aItem)}
                                                        pOptions={avgMode.map((aItem) => aItem.value)}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="bottom-page">
                                        <div></div>
                                        <div>
                                            Select : {sSelectedTag.length} / {12 - pPanelInfo.tag_set.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footer">
                    <TextButton pWidth={100} pHeight={34} pText="OK" pBackgroundColor="#4199ff" onClick={setPanels} />
                    <TextButton pWidth={100} pHeight={34} pText="Cancel" pBackgroundColor="#666979" onClick={pCloseModal} />
                </div>
            </div>
        </div>
    );
};

export default ModalCreateChart;
