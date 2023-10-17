import './CreatePanelFooter.scss';
import Series from './Series';
import { useState } from 'react';
import { PlusCircle } from '@/assets/icons/Icon';
import { tagTableValue } from '@/utils/dashboardUtil';
import DatePicker from 'react-datepicker';
import { SelectTimeRanges } from '@/components/tagAnalyzer/SelectTimeRanges';
import CheckBox from '@/components/inputs/CheckBox';

const CreatePanelFotter = ({ pTableList, pType, pGetTables, pSetPanelOption, pPanelOption }: any) => {
    const [sTab, setTab] = useState('Query');

    return (
        <div className="chart-footer-form">
            <div className="chart-footer-tab">
                <div style={sTab === 'Query' ? { borderBottom: '2px solid #005FB8' } : { borderBottom: '2px solid transparent', opacity: 0.8 }} onClick={() => setTab('Query')}>
                    Query
                    <span className="series-count">{Number(pPanelOption.series.length)}</span>
                </div>
                <div style={sTab === 'Time' ? { borderBottom: '2px solid #005FB8' } : { borderBottom: '2px solid transparent', opacity: 0.8 }} onClick={() => setTab('Time')}>
                    Time
                </div>
            </div>
            <div className="chart-footer">
                <div style={sTab === 'Time' ? { display: 'none' } : {}} className="body">
                    {pPanelOption.series.map((aItem: any) => {
                        return (
                            <Series
                                key={aItem.id}
                                pType={pType}
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
                <div style={sTab === 'Query' ? { display: 'none' } : {}} className="body time-wrap">
                    <div className="date-picker">
                        <CheckBox
                            onChange={(aEvent: any) => {
                                pSetPanelOption({ ...pPanelOption, useCustomTime: Object.keys(aEvent.target).includes('checked') ? aEvent.target.checked : aEvent.target.value });
                            }}
                            pDefaultChecked={pPanelOption.useCustomTime}
                            pText={'use Custom Time'}
                        />
                        From
                        <DatePicker
                            popperPlacement="right"
                            // selected={typeof sEndTime === 'string' && sEndTime.includes('now') ? moment(sEndTime).format('yyyy-MM-DD HH:mm:ss') : sEndTime}
                            disabled={!pPanelOption.useCustomTime}
                            calendarClassName="modal-date-picker"
                            timeInputLabel="Time: "
                            onChange={() => {}}
                            dateFormat="yyyy-MM-dd HH:mm:ss"
                            showTimeInput
                        ></DatePicker>
                        To
                        <DatePicker
                            popperPlacement="right"
                            disabled={!pPanelOption.useCustomTime}
                            // selected={typeof sEndTime === 'string' && sEndTime.includes('now') ? moment(sEndTime).format('yyyy-MM-DD HH:mm:ss') : sEndTime}
                            calendarClassName="modal-date-picker"
                            timeInputLabel="Time: "
                            onChange={() => {}}
                            dateFormat="yyyy-MM-dd HH:mm:ss"
                            showTimeInput
                        ></DatePicker>
                    </div>
                    <div className="select-time-range">
                        <SelectTimeRanges onClick={() => {}} />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default CreatePanelFotter;
