import { useEffect, useState } from 'react';
import { changeTextToUtc } from '@/utils/helpers/date';
import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type { TagAnalyzerRangeValue } from '../../panel/TagAnalyzerPanelModelTypes';
import type { TagAnalyzerPanelTimeConfig } from '../PanelEditorTypes';
import { formatTimeRangeInputValue, parseTimeRangeInputValue } from '../TimeRangeUtils';

type TimeInputField = 'range_bgn' | 'range_end';
type TimeInputEvent = {
    target: {
        value: string;
    };
};

// Edits the panel-specific time range override.
// It supports absolute dates, relative expressions like now/last, quick ranges, and clearing back to inherited time.
const TimeRange = ({
    pTimeConfig,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: TagAnalyzerPanelTimeConfig;
    pOnChangeTimeConfig: (aConfig: TagAnalyzerPanelTimeConfig) => void;
}) => {
    const [sStartTime, setStartTime] = useState<TagAnalyzerRangeValue>('');
    const [sEndTime, setEndTime] = useState<TagAnalyzerRangeValue>('');

    useEffect(() => {
        setStartTime(formatTimeRangeInputValue(pTimeConfig.range_bgn));
        setEndTime(formatTimeRangeInputValue(pTimeConfig.range_end));
    }, [pTimeConfig.range_bgn, pTimeConfig.range_end]);

    const updateTimeConfig = (aField: TimeInputField, aValue: TagAnalyzerRangeValue) => {
        pOnChangeTimeConfig({ ...pTimeConfig, [aField]: aValue });
    };

    const updateInputValue = (aField: TimeInputField, aValue: TagAnalyzerRangeValue) => {
        if (aField === 'range_bgn') {
            setStartTime(aValue);
            return;
        }

        setEndTime(aValue);
    };

    const handleTimeApply = (aField: TimeInputField, aValue: string) => {
        updateTimeConfig(aField, (changeTextToUtc(aValue) as number) * 1000);
        updateInputValue(aField, aValue);
    };

    const handleTimeChange = (aField: TimeInputField, aEvent: TimeInputEvent) => {
        const sNextValue = aEvent.target.value;
        updateTimeConfig(aField, parseTimeRangeInputValue(sNextValue));
        updateInputValue(aField, sNextValue);
    };

    const handleQuickTime = (aValue: { value: [TagAnalyzerRangeValue, TagAnalyzerRangeValue] }) => {
        pOnChangeTimeConfig({ ...pTimeConfig, range_bgn: aValue.value[0], range_end: aValue.value[1] });
        setStartTime(aValue.value[0]);
        setEndTime(aValue.value[1]);
    };

    const handleClear = () => {
        pOnChangeTimeConfig({ ...pTimeConfig, range_bgn: '', range_end: '' });
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
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_bgn', date)}
                            pSetApply={(date: string) => handleTimeApply('range_bgn', date)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <DatePicker
                            pLabel="To"
                            pTopPixel={-370}
                            pTimeValue={sEndTime}
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_end', date)}
                            pSetApply={(date: string) => handleTimeApply('range_end', date)}
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
