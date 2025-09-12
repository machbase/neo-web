import { useMemo, useRef, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '../../recoil/recoil';
import { fetchOnMinMaxTable, fetchTableName, getTagPagination, getTagTotal } from '../../api/repository/machiot';
import { DEFAULT_CHART } from '../../utils/constants';
import { convertChartDefault } from '../../utils/utils';
import { getId, getUserName } from '../../utils';
import { BiSolidChart, Close, Search, ArrowLeft, ArrowRight } from '../../assets/icons/Icon';
import { TextButton } from '../buttons/TextButton';
import { Input } from '../../components/inputs/Input';
import { Select } from '../../components/inputs/Select';
import { Tooltip } from 'react-tooltip';
import useDebounce from '../../hooks/useDebounce';
import InnerLine from '../../assets/image/img_chart_01.png';
import Scatter from '../../assets/image/img_chart_02.png';
import Line from '../../assets/image/img_chart_03.png';
import { Error } from '../../components/toast/Toast';
import { MdKeyboardDoubleArrowLeft, MdOutlineKeyboardDoubleArrowRight } from 'react-icons/md';
import useOutsideClick from '../../hooks/useOutsideClick';
import './ModalCreateChart.scss';
import { concatTagSet } from '../../utils/helpers/tags';
import { avgMode } from './constants';

const ModalCreateChart = ({ pCloseModal }: any) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sTables] = useRecoilState(gTables);
    const [sSelectedTable, setSelectedTable] = useState<string>(sTables[0]);
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sTagPagination, setTagPagination] = useState(1);
    const [sKeepPageNum, setKeepPageNum] = useState<any>(1);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sSelectedChartType, setSelectedChartType] = useState<string>('Line');
    const [sTagInputValue, setTagInputValue] = useState<string>('');
    const [sSearchText, setSearchText] = useState<string>('');
    const [sTagTotal, setTagTotal] = useState<number>(0);
    const [sSkipTagTotal, setSkipTagTotal] = useState<boolean>(false);
    const [sColumns, setColumns] = useState<any>();
    const pageRef = useRef(null);

    const setChartType = (aType: string) => {
        setSelectedChartType(aType);
    };
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
        if (sSelectedTable) {
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
    const setTagMode = (aEvent: any, aValue: any) => {
        setSelectedTag(
            sSelectedTag.map((aItem) => {
                return aItem.table === aValue.table && aItem.key === aValue.key ? { ...aItem, calculationMode: aEvent.target.value } : aItem;
            })
        );
    };
    const setPanels = async () => {
        if (sSelectedTag.length === 0) {
            Error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12) {
            Error('The maximum number of tags in a chart is 12.');
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sRes: any = await fetchOnMinMaxTable(sSelectedTag, sCurrentUserName);
        const sMinMax = sRes.data;

        if (!sMinMax.rows[0][0] || !sMinMax.rows[0][1]) {
            Error('Please insert Data.');

            return;
        }
        const minMillis = Math.floor(sMinMax.rows[0][0] / 1000000);
        const maxMillis = Math.floor(sMinMax.rows[0][1] / 1000000);
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
        pCloseModal();
    };
    const handleSearch = () => {
        if (sTagPagination > 1) {
            setTagPagination(1);
            setKeepPageNum(1);
        } else getTagList();
    };
    const setTag = async (aValue: any) => {
        if (sSelectedTag.length === 12) return Error('The maximum number of tags in a chart is 12.');
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
        <div className="modal-form-chart">
            <div className="inner-form">
                <div className="header">
                    <div className="header-title">
                        <BiSolidChart />
                        New Chart
                    </div>
                    <div className="header-close">
                        <Close onClick={pCloseModal} color="#f8f8f8"></Close>
                    </div>
                </div>
                <div className="body">
                    <div className="table-select">
                        <div className="title">Table</div>
                        <div className="combobox-select">
                            {<Select pIsFullWidth pInitValue={sTables ? sTables[0] : ''} pHeight={32} onChange={changedTable} pOptions={sTables ? sTables : []} />}
                        </div>
                    </div>
                    {/* {!sRollupTable && <p>* The table is show because the roll-up table is not generated.</p>} */}
                    <div className="chart-select">
                        <div className="title">Chart</div>
                        <div className="select-chart-form">
                            <div className="selected-chart">
                                <div className="tag_modal_chart_wrap">
                                    <div
                                        onClick={() => setChartType('Zone')}
                                        style={sSelectedChartType === 'Zone' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                                        className="tag_modal_chart_btn"
                                    >
                                        <img src={InnerLine} />
                                    </div>
                                    <div
                                        onClick={() => setChartType('Dot')}
                                        style={sSelectedChartType === 'Dot' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                                        className="tag_modal_chart_btn"
                                    >
                                        <img src={Scatter} />
                                    </div>
                                    <div
                                        onClick={() => setChartType('Line')}
                                        style={sSelectedChartType === 'Line' ? { boxShadow: 'inset 0 -2px 62px 0 rgba(65, 153, 255, 0.5)', border: 'solid 0.5px #4199ff' } : {}}
                                        className="tag_modal_chart_btn last"
                                    >
                                        <img src={Line} />
                                    </div>
                                </div>
                            </div>
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
                                    <Input pValue={sTagInputValue} pSetValue={setTagInputValue} pIsFullWidth pHeight={36} onChange={filterTag} onEnter={handleSearch} />
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
                                                <button key={aItem} className={`tag-tooltip-${aIdx}`} style={{ margin: '1px' }} onClick={() => setTag(aItem[1])}>
                                                    <Tooltip anchorSelect={`.tag-tooltip-${aIdx}`} content={aItem[1]} />
                                                    <div className="tag-text">{aItem[1]}</div>
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
                                                    key={aItem.key}
                                                    onClick={() => {
                                                        removeSelectedTag(aIdx);
                                                    }}
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
                                        <div style={sSelectedTag.length === 12 ? { color: '#ef6e6e' } : {}}>Select : {sSelectedTag.length} / 12</div>
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
