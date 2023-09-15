import './CreatePanelFotter.scss';
import Series from './Series';
import { useEffect } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { tagTableValue } from '@/utils/dashboardUtil';

const CreatePanelFotter = ({ pTableList, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    return (
        <div className="chart-footer">
            <div className="body">
                {pPanelOption.series.map((aItem: any) => {
                    return (
                        <Series
                            key={aItem.id}
                            pPanelOption={pPanelOption}
                            pTableList={pTableList}
                            pGetTables={pGetTables}
                            pSeriesInfo={aItem}
                            pSetPanelOption={pSetPanelOption}
                        ></Series>
                    );
                })}
                <div
                    onClick={() => pSetPanelOption({ ...pPanelOption, series: [...pPanelOption.series, { ...tagTableValue(), table: pTableList[0][3] }] })}
                    className="plus-wrap"
                    style={{
                        border: '1px solid #777777',
                        minHeight: '50px',
                        borderRadius: '4px',
                        padding: '8px',
                        display: 'flex',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <PlusCircle color="#FDB532"></PlusCircle>
                </div>
            </div>
        </div>
    );
};
export default CreatePanelFotter;
