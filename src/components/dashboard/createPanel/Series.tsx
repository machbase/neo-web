import { getTableInfo } from '@/api/repository/api';
import { fetchTags } from '@/api/repository/machiot';
import { Refresh, VscChevronDown, VscChevronUp } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Select } from '@/components/inputs/Select';
import { getId } from '@/utils';
import { getTableType, tagAggregatorList } from '@/utils/dashboardUtil';
import { useEffect, useState } from 'react';
import './Series.scss';
import Value from './Value';
const Series = ({ pSeriesInfo, pPanelOption, pTableList, pGetTables, pSetPanelOption }: any) => {
    const [sTagList, setTagList] = useState<any>([]);
    const [sTagAggregatorList] = useState<any>([]);

    const [sValueList, setValueList] = useState<any>([]);
    const [sCollapse, setCollapse] = useState(true);

    const changedOption = (aKey: string, aData: any) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, [aKey]: aData.target.value } : aItem;
            }),
        });
        const sTable = pTableList.find((aItem: any) => aItem[3] === aData.target.value);

        if (aKey === 'table') {
            getTableType(sTable[4]) === 'tag' && getTagList(aData.target.value);
            getValueList(aData.target.value);
        }
    };

    const getValueList = async (aTable: string) => {
        const sTable = pTableList.find((aItem: any) => aItem[3] === aTable);
        const sData = await getTableInfo(sTable[2]);
        setValueList(sData.data.rows);
    };

    const getTagList = async (aTable: any) => {
        const sData: any = await fetchTags(aTable);
        setTagList(
            sData.data.rows.map((aItem: any) => {
                return aItem[1];
            })
        );
    };
    const changeValueOption = (aKey: string, aData: any, aId: string) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id
                    ? {
                          ...aItem,
                          values: aItem.values.map((bItem: any) => {
                              return bItem.id === aId ? { ...bItem, [aKey]: aData.target.value } : bItem;
                          }),
                      }
                    : aItem;
            }),
        });
    };

    const addValue = () => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, values: [...aItem.values, { id: getId(), alias: '', value: '' }] } : aItem;
            }),
        });
    };
    const pRemoveValue = (aId: string) => {
        pSetPanelOption({
            ...pPanelOption,
            series: pPanelOption.series.map((aItem: any) => {
                return aItem.id === pSeriesInfo.id ? { ...aItem, values: aItem.values.filter((aItem: any) => aItem.id !== aId) } : aItem;
            }),
        });
    };

    useEffect(() => {
        getTagList(pSeriesInfo.table);
    }, []);

    return (
        <div className="series">
            <div className="row">
                <div className="row-header">
                    <div className="row-header-left">
                        <div className="series-table">
                            <span className="series-title"> Table </span>
                            <Select
                                pFontSize={12}
                                pWidth={175}
                                pBorderRadius={4}
                                pInitValue={pSeriesInfo.table}
                                pHeight={26}
                                onChange={(aEvent: any) => changedOption('table', aEvent)}
                                pOptions={pTableList.map((aItem: any) => {
                                    return aItem[3];
                                })}
                            />
                            <IconButton pWidth={25} pHeight={26} pIcon={<Refresh></Refresh>} onClick={() => pGetTables()}></IconButton>
                        </div>
                        <div className="series-table">
                            <span className="series-title"> Tag </span>
                            <Select
                                pFontSize={12}
                                pWidth={200}
                                pBorderRadius={4}
                                pInitValue={pSeriesInfo.tag ? pSeriesInfo.tag : sTagList[0]}
                                pHeight={26}
                                onChange={(aEvent: any) => changedOption('tag', aEvent)}
                                pOptions={sTagList}
                            />
                        </div>
                        <div className="series-table">
                            <span className="series-title"> Aggregator </span>
                            <Select
                                pFontSize={12}
                                pWidth={200}
                                pBorderRadius={4}
                                pInitValue={tagAggregatorList[0]}
                                pHeight={26}
                                onChange={(aEvent: any) => changedOption('aggregator', aEvent)}
                                pOptions={tagAggregatorList}
                            />
                        </div>
                    </div>
                    <div className="row-header-right">
                        <IconButton
                            pWidth={20}
                            pHeight={20}
                            pIcon={sCollapse ? <VscChevronDown></VscChevronDown> : <VscChevronUp></VscChevronUp>}
                            onClick={() => setCollapse(!sCollapse)}
                        ></IconButton>
                    </div>
                </div>
                <div style={sCollapse ? { display: 'none' } : {}} className="details">
                    <div>
                        {pSeriesInfo.values.map((aItem: any, aIdx: number) => {
                            return (
                                <Value
                                    key={aItem.id}
                                    pChangeValueOption={changeValueOption}
                                    pAddValue={addValue}
                                    pRemoveValue={pRemoveValue}
                                    pSeriesInfo={pSeriesInfo}
                                    pValue={aItem}
                                    pIdx={aIdx}
                                    pValueList={sValueList}
                                ></Value>
                            );
                        })}
                    </div>
                    <div className="details">
                        <div className="series-table">
                            <span className="series-title"> TimeField </span>
                            <Select
                                pFontSize={12}
                                pWidth={200}
                                pBorderRadius={4}
                                pInitValue={sValueList[0] && sValueList[0][0]}
                                pHeight={26}
                                onChange={(aEvent: any) => changedOption('time', aEvent)}
                                pOptions={sValueList.map((aItem: any) => {
                                    return aItem[0];
                                })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Series;
