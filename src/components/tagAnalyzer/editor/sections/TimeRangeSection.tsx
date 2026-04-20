import { useEffect, useState } from 'react';
import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import type { TagAnalyzerPanelTimeConfig } from '../PanelEditorTypes';
import type { TimeBoundary } from '../../utils/ModelTypes';
import {
    createEmptyTimeBoundary,
    formatTimeRangeInputValue,
    normalizeTimeRangeConfig,
    parseLegacyTimeBoundary,
    parseTimeRangeInputValue,
} from '../../utils/TagAnalyzerTimeRangeConfig';

// Used by TimeRangeSection to type time input field.
type TimeInputField = 'range_bgn' | 'range_end';
// Used by TimeRangeSection to type time input event.
type TimeInputEvent = {
    target: {
        value: string;
    };
};

// Edits the panel-specific time range override.
// It supports absolute dates, relative expressions like now/last, quick ranges, and clearing back to inherited time.
const TimeRangeSection = ({
    pTimeConfig,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: TagAnalyzerPanelTimeConfig;
    pOnChangeTimeConfig: (aConfig: TagAnalyzerPanelTimeConfig) => void;
}) => {
    const [sStartTime, setStartTime] = useState<string>('');
    const [sEndTime, setEndTime] = useState<string>('');

    useEffect(() => {
        setStartTime(formatTimeRangeInputValue(pTimeConfig.range_config.start));
        setEndTime(formatTimeRangeInputValue(pTimeConfig.range_config.end));
    }, [pTimeConfig.range_config, pTimeConfig.range_bgn, pTimeConfig.range_end]);

    const updateTimeConfig = (
        aStartValue: TimeBoundary,
        aEndValue: TimeBoundary,
    ) => {
        const sTimeRange = normalizeTimeRangeConfig({
            start: aStartValue,
            end: aEndValue,
        });
        pOnChangeTimeConfig({
            range_bgn: sTimeRange.range.min,
            range_end: sTimeRange.range.max,
            range_config: sTimeRange.rangeConfig,
        });
    };

    const updateInputValue = (aField: TimeInputField, aValue: string) => {
        if (aField === 'range_bgn') {
            setStartTime(aValue);
            return;
        }

        setEndTime(aValue);
    };

    const getStoredBoundaryValue = (aField: TimeInputField): TimeBoundary =>
        aField === 'range_bgn' ? pTimeConfig.range_config.start : pTimeConfig.range_config.end;

    const updateSingleBoundary = (
        aField: TimeInputField,
        aValue: TimeBoundary | undefined,
    ) => {
        if (aValue === undefined) {
            return;
        }

        const sStartValue = aField === 'range_bgn' ? aValue : getStoredBoundaryValue('range_bgn');
        const sEndValue = aField === 'range_end' ? aValue : getStoredBoundaryValue('range_end');
        updateTimeConfig(sStartValue, sEndValue);
    };

    const handleTimeChange = (aField: TimeInputField, aEvent: TimeInputEvent) => {
        const sNextValue = aEvent.target.value;
        updateSingleBoundary(aField, parseTimeRangeInputValue(sNextValue));
        updateInputValue(aField, sNextValue);
    };

    const handleTimeApply = (aField: TimeInputField, aValue: string) => {
        updateSingleBoundary(aField, parseTimeRangeInputValue(aValue));
        updateInputValue(aField, aValue);
    };

    const handleQuickTime = (aOption: QuickTimeRangeOption) => {
        const [sStartValue = '', sEndValue = ''] = aOption.value;
        updateTimeConfig(parseLegacyTimeBoundary(sStartValue), parseLegacyTimeBoundary(sEndValue));
        setStartTime(sStartValue);
        setEndTime(sEndValue);
    };

    const handleClear = () => {
        updateTimeConfig(createEmptyTimeBoundary(), createEmptyTimeBoundary());
        setStartTime('');
        setEndTime('');
    };

    return (
        <>
            <Page.ContentBlock
                pHoverNone
                style={{ padding: 0, margin: 0 }}
                pActive={undefined}
                pSticky={undefined}
            >
                <Page.ContentTitle>Custom time range</Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }} className={undefined}>
                <Page.ContentBlock
                    pHoverNone
                    style={{ padding: 0 }}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                        pActive={undefined}
                        pSticky={undefined}
                    >
                        <DatePicker
                            pLabel="From"
                            pTopPixel={-370}
                            pTimeValue={sStartTime}
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_bgn', date)}
                            pSetApply={(date: string) => handleTimeApply('range_bgn', date)}
                            pAutoFocus={undefined}
                            disabled={undefined}
                            placeholder={undefined}
                            className={undefined}
                            labelPosition={undefined}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                        pActive={undefined}
                        pSticky={undefined}
                    >
                        <DatePicker
                            pLabel="To"
                            pTopPixel={-370}
                            pTimeValue={sEndTime}
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_end', date)}
                            pSetApply={(date: string) => handleTimeApply('range_end', date)}
                            pAutoFocus={undefined}
                            disabled={undefined}
                            placeholder={undefined}
                            className={undefined}
                            labelPosition={undefined}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                        pActive={undefined}
                        pSticky={undefined}
                    >
                        <Page.DpRow style={{ justifyContent: 'end' }} className={undefined}>
                            <Button
                                variant="ghost"
                                onClick={handleClear}
                                size={undefined}
                                loading={undefined}
                                active={undefined}
                                icon={undefined}
                                iconPosition={undefined}
                                fullWidth={undefined}
                                isToolTip={undefined}
                                toolTipContent={undefined}
                                toolTipPlace={undefined}
                                toolTipMaxWidth={undefined}
                                forceOpacity={undefined}
                                shadow={undefined}
                                label={undefined}
                                labelPosition={undefined}
                            >
                                <VscTrash size={16} />
                                <span>Clear</span>
                            </Button>
                        </Page.DpRow>
                    </Page.ContentBlock>
                </Page.ContentBlock>
                <Page.ContentBlock
                    pHoverNone
                    style={{ padding: 0 }}
                    pActive={undefined}
                    pSticky={undefined}
                >
                    <QuickTimeRange
                        options={TIME_RANGE}
                        onSelect={handleQuickTime}
                        title=""
                        className={undefined}
                    />
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default TimeRangeSection;
