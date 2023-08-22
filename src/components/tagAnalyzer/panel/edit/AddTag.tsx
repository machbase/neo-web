import './AddTag.scss';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchOnRollupTable, fetchTableName, fetchTags } from '@/api/repository/machiot';
import { convertTagChartType } from '@/utils/utils';
import { getId } from '@/utils';
import {
    BiSolidChart,
    Close,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Search
} from '@/assets/icons/Icon';

const ModalCreateChart = ({ pCloseModal, pSetCopyPanelInfo, pPanelInfo }: any) => {
    const [sTables] = useRecoilState(gTables);

    const [sSelectedTable, setSelectedTable] = useState<string>(sTables[0]);
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sTagPagination, setTagPagination] = useState(-1);
    const [sCalcTagList, setCalcTagList] = useState<string[]>([]);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sRollupTable, setRollupTable] = useState<boolean>(false);

    const avgMode = [
        { key: 'Min', value: 'min' },
        { key: 'Max', value: 'max' },
        { key: 'Sum', value: 'sum' },
        { key: 'Count', value: 'cnt' },
        { key: 'Average', value: 'avg' },
    ];

    useEffect(() => {
        getTagList();
    }, [sSelectedTable]);

    useEffect(() => {
        setPagination();
    }, [sTagPagination, sTagList]);

    const setPagination = () => {
        const sData = [];
        for (let i = (sTagPagination - 1) * 10; i < sTagPagination * 10; i++) {
            if (sTagList[i]) {
                sData.push(sTagList[i][1]);
            }
        }
        setCalcTagList(sData);
    };

    const getTagList = async () => {
        const sResult: any = await fetchTags(sSelectedTable);
        if (sResult.success) {
            setTagList(sResult.data.rows);
            setTagPagination(1);
        }
    };

    const filterTag = (aEvent: any) => {
        setCalcTagList(
            sTagList
                .filter((aItem) => {
                    return aItem[1].includes(aEvent.target.value);
                })
                .map((aItem) => aItem[1])
        );
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
            alert('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12) {
            alert('The maximum number of tags in a chart is 12.');
            return;
        }

        const tagSet = convertTagChartType(sSelectedTag);

        pSetCopyPanelInfo({ ...pPanelInfo, tag_set: pPanelInfo.tag_set.concat(tagSet) });
        pCloseModal();
    };

    const setTag = async (aValue: any) => {
        const sResult: any = await fetchTableName(sSelectedTable);
        const sData = sResult.data;
        setSelectedTag([
            ...sSelectedTag,
            {
                key: getId(),
                tagName: aValue,
                table: sSelectedTable,
                calculationMode: 'avg',
                alias: '',
                weight: 1.0,
                onRollup: sRollupTable,
                colName: { name: sData.rows[0][0], time: sData.rows[1][0], value: sData.rows[2][0] },
            },
        ]);
    };

    const setpagination = (aStatus: boolean) => {
        setTagPagination(aStatus ? sTagPagination + 1 : sTagPagination - 1);
    };

    const changedTable = async (aEvent: any) => {
        const sRes = await fetchOnRollupTable(aEvent.target.value);
        if (sRes.data.rows.length === 0) {
            setRollupTable(false);
        } else {
            setRollupTable(true);
        }

        setSelectedTable(aEvent.target.value);
    };

    return (
        <div className="modal-form">
            <div className="inner-form">
                <div className="header">
                    <div className="header-title">
                        <BiSolidChart></BiSolidChart>
                        New Tag
                    </div>
                    <div className="header-close">
                        <Close onClick={pCloseModal} color="#f8f8f8"></Close>
                    </div>
                </div>
                <div className="body">
                    <div className="table-select">
                        <div className="title">Table</div>
                        <div className="combobox-select">
                            <select onChange={changedTable} className="input">
                                {sTables.map((aItem: string, aIdx: number) => {
                                    return (
                                        <option value={aItem} key={aIdx} className="combobox-select__item">
                                            {aItem}
                                        </option>
                                    );
                                })}
                            </select>
                            <ArrowDown></ArrowDown>
                        </div>
                    </div>
                    {!sRollupTable && <p>* The table is show because the roll-up table is not generated.</p>}

                    <div className="tag-select">
                        <div className="title">Tag</div>
                        <div className="tag-form">
                            <div className="filter-form-tag">
                                <div className="tag-input-form">
                                    <input onChange={filterTag} type="text" className="combobox-select" />
                                    <button className="search">
                                        <Search></Search>
                                    </button>
                                </div>
                            </div>
                            <div className="select-tag-form">
                                <div className="select-tag-wrap">
                                    <div className="select-tab">
                                        {sCalcTagList.map((aItem: string) => {
                                            return (
                                                <button key={aItem} onClick={() => setTag(aItem)}>
                                                    {aItem}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="bottom-page">
                                        <div className="pagination">
                                            <button
                                                disabled={sTagPagination === 1}
                                                style={sTagPagination === 1 ? { opacity: 0.4, cursor: 'default' } : {}}
                                                onClick={() => setpagination(false)}
                                            >
                                                <ArrowLeft></ArrowLeft>
                                            </button>
                                            <div>{sTagPagination}</div>
                                            <button
                                                disabled={sTagList.length <= sTagPagination * 10}
                                                style={sTagList.length <= sTagPagination * 10 ? { opacity: 0.4, cursor: 'default' } : {}}
                                                onClick={() => setpagination(true)}
                                            >
                                                <ArrowRight></ArrowRight>
                                            </button>
                                        </div>
                                        <div>
                                            Total {sCalcTagList.length}/{sTagList.length}
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
                                                    <div>{aItem.tagName}</div>
                                                    <div className="inner-select">
                                                        <select
                                                            onClick={(aEvent) => {
                                                                aEvent.stopPropagation();
                                                            }}
                                                            onChange={(aEvent: any) => {
                                                                setTagMode(aEvent, aItem);
                                                            }}
                                                            defaultValue={'avg'}
                                                            className="input"
                                                        >
                                                            {avgMode.map((bItem: any) => {
                                                                return (
                                                                    <option key={bItem.value} value={bItem.value}>
                                                                        {bItem.key}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                        <ArrowDown></ArrowDown>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="bottom-page">
                                        <div></div>
                                        <div>Select : {sSelectedTag.length}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="footer">
                    <button onClick={() => setPanels()} className="ok-button">
                        OK
                    </button>
                    <button onClick={pCloseModal} className="cancel-button">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalCreateChart;
