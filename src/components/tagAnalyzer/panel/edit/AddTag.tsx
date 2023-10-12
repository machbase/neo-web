import './AddTag.scss';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { fetchTableName, fetchTags } from '@/api/repository/machiot';
import { convertTagChartType } from '@/utils/utils';
import { getId } from '@/utils';
import { BiSolidChart, Close, ArrowLeft, ArrowRight, Search } from '@/assets/icons/Icon';
import { Error } from '@/components/toast/Toast';
import { Select } from '@/components/inputs/Select';
import { TextButton } from '@/components/buttons/TextButton';
import { Input } from '@/components/inputs/Input';

const ModalCreateChart = ({ pCloseModal, pSetCopyPanelInfo, pPanelInfo }: any) => {
    const [sTables] = useRecoilState(gTables);

    const [sSelectedTable, setSelectedTable] = useState<string>(sTables[0]);
    const [sTagList, setTagList] = useState<string[]>([]);
    const [sTagPagination, setTagPagination] = useState(-1);
    const [sCalcTagList, setCalcTagList] = useState<string[]>([]);
    const [sSelectedTag, setSelectedTag] = useState<any[]>([]);
    const [sTagInputValue, setTagInputValue] = useState<string>('');

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
            Error('please select tag.');
            return;
        }
        if (sSelectedTag.length > 12) {
            Error('The maximum number of tags in a chart is 12.');
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
                colName: { name: sData.rows[0][0], time: sData.rows[1][0], value: sData.rows[2][0] },
            },
        ]);
    };

    const setpagination = (aStatus: boolean) => {
        setTagPagination(aStatus ? sTagPagination + 1 : sTagPagination - 1);
    };

    const changedTable = async (aEvent: any) => {
        setSelectedTable(aEvent.target.value);
    };

    return (
        <div className="modal-form-tag">
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
                            <Select pIsFullWidth pInitValue={sTables[0]} pHeight={32} onChange={changedTable} pOptions={sTables} />
                        </div>
                    </div>
                    {/* {!sRollupTable && <p>* The table is show because the roll-up table is not generated.</p>} */}
                    <div className="tag-select">
                        <div className="title">Tag</div>
                        <div className="tag-form">
                            <div className="filter-form-tag">
                                <div className="tag-input-form">
                                    <Input pValue={sTagInputValue} pSetValue={setTagInputValue} pIsFullWidth pHeight={36} onChange={filterTag} />
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
                                        <div>Select : {sSelectedTag.length}</div>
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
