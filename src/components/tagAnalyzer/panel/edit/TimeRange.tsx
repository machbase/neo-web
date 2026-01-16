import { useEffect, useState } from 'react';
import moment from 'moment';
import { changeTextToUtc } from '@/utils/helpers/date';
import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';

const TimeRange = ({ pPanelInfo, pSetCopyPanelInfo }: any) => {
    const [sStartTime, setStartTime] = useState<any>('');
    const [sEndTime, setEndTime] = useState<any>('');

    useEffect(() => {
        const sBoardStartTime = pPanelInfo.range_bgn;
        const sBoardEndTime = pPanelInfo.range_end;
        setStartTime(
            sBoardStartTime === ''
                ? ''
                : typeof sBoardStartTime === 'string' && (sBoardStartTime.includes('now') || sBoardStartTime.includes('last'))
                ? sBoardStartTime
                : moment.unix(sBoardStartTime / 1000).format('YYYY-MM-DD HH:mm:ss')
        );
        setEndTime(
            sBoardEndTime === ''
                ? ''
                : typeof sBoardEndTime === 'string' && (sBoardEndTime.includes('now') || sBoardStartTime.includes('last'))
                ? sBoardEndTime
                : moment.unix(sBoardEndTime / 1000).format('YYYY-MM-DD HH:mm:ss')
        );
    }, []);

    const handleStartTime = (aEvent: any, aIsApply: boolean) => {
        if (aIsApply) {
            pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: (changeTextToUtc(aEvent) as number) * 1000 });
            setStartTime(aEvent);
            return;
        }

        if (typeof aEvent === 'object') {
            let sStart: any;
            if (aEvent.target.value.toLowerCase().includes('now') || aEvent.target.value.toLowerCase().includes('last')) sStart = aEvent.target.value;
            else {
                const tmpTime = moment(aEvent.target.value).unix() * 1000;
                sStart = tmpTime > 0 ? tmpTime : aEvent.target.value;
            }
            pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: sStart });
            setStartTime(aEvent.target.value);
        }
    };

    const handleEndTime = (aEvent: any, aIsApply: boolean) => {
        if (aIsApply) {
            pSetCopyPanelInfo({ ...pPanelInfo, range_end: (changeTextToUtc(aEvent) as number) * 1000 });
            setEndTime(aEvent);
            return;
        }

        if (typeof aEvent === 'object') {
            let sEnd: any;
            if (aEvent.target.value.toLowerCase().includes('now') || aEvent.target.value.toLowerCase().includes('last')) sEnd = aEvent.target.value;
            else {
                const tmpTime = moment(aEvent.target.value).unix() * 1000;
                sEnd = tmpTime > 0 ? tmpTime : aEvent.target.value;
            }
            pSetCopyPanelInfo({ ...pPanelInfo, range_end: sEnd });
            setEndTime(aEvent.target.value);
        }
    };

    const handleQuickTime = (aValue: any) => {
        pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: aValue.value[0], range_end: aValue.value[1] });
        setStartTime(aValue.value[0]);
        setEndTime(aValue.value[1]);
    };

    const handleClear = () => {
        pSetCopyPanelInfo({ ...pPanelInfo, range_bgn: '', range_end: '' });
        setStartTime('');
        setEndTime('');
    };

    return (
        <>
            <Page.ContentBlock pHoverNone style={{ padding: 0, margin: 0 }}>
                <Page.ContentTitle>Custom time range</Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }}>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <DatePicker
                            pLabel="From"
                            pTopPixel={-370}
                            pTimeValue={sStartTime}
                            onChange={(date: any) => handleStartTime(date, false)}
                            pSetApply={(date: any) => handleStartTime(date, true)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <DatePicker
                            pLabel="To"
                            pTopPixel={-370}
                            pTimeValue={sEndTime}
                            onChange={(date: any) => handleEndTime(date, false)}
                            pSetApply={(date: any) => handleEndTime(date, true)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Page.DpRow style={{ justifyContent: 'end' }}>
                            <Button variant="ghost" onClick={handleClear}>
                                <VscTrash size={16} />
                                <span>Clear</span>
                            </Button>
                        </Page.DpRow>
                    </Page.ContentBlock>
                </Page.ContentBlock>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <QuickTimeRange options={TIME_RANGE} onSelect={handleQuickTime} title="" />
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default TimeRange;
