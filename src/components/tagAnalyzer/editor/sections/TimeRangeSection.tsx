import { useEffect, useState } from 'react';
import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type { QuickTimeRangeOption } from '@/design-system/components/QuickTimeRange';
import type { TagAnalyzerPanelTimeConfig } from '../PanelEditorTypes';
import type { TimeBoundary } from '../../utils/time/timeTypes';
import {
    formatTimeRangeInputValue,
    parseTimeRangeInputValue,
} from '../../utils/time/TimeRangeParsing';
import { normalizeTimeRangeConfig } from '../../utils/time/PanelTimeRangeResolver';

// Used by TimeRangeSection to type time input field.
type TimeInputField = 'range_bgn' | 'range_end';
// Used by TimeRangeSection to type time input event.
type TimeInputEvent = {
    target: {
        value: string;
    };
};

/**
 * Edits the panel-specific time range override.
 * Intent: Support absolute dates, relative expressions, quick ranges, and clearing back to inherited time.
 * @param {TagAnalyzerPanelTimeConfig} pTimeConfig The current time draft.
 * @param {(aConfig: TagAnalyzerPanelTimeConfig) => void} pOnChangeTimeConfig Updates the time draft.
 * @returns {JSX.Element}
 */
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

    /**
     * Merges the selected boundary values into the normalized time config.
     * Intent: Keep all time-range updates going through the same normalization step.
     * @param {TimeBoundary} aStartValue The new start boundary.
     * @param {TimeBoundary} aEndValue The new end boundary.
     * @returns {void}
     */
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

    /**
     * Updates one local time input buffer.
     * Intent: Keep the text inputs responsive while the parsed config is updated separately.
     * @param {TimeInputField} aField The input field to update.
     * @param {string} aValue The new text value.
     * @returns {void}
     */
    const updateInputValue = (aField: TimeInputField, aValue: string) => {
        if (aField === 'range_bgn') {
            setStartTime(aValue);
            return;
        }

        setEndTime(aValue);
    };

    /**
     * Resolves the currently stored boundary value for one time field.
     * Intent: Reuse the existing draft boundary when only one side of the range changes.
     * @param {TimeInputField} aField The boundary field to read.
     * @returns {TimeBoundary}
     */
    const getStoredBoundaryValue = (aField: TimeInputField): TimeBoundary =>
        aField === 'range_bgn' ? pTimeConfig.range_config.start : pTimeConfig.range_config.end;

    /**
     * Applies one parsed boundary while preserving the opposite boundary.
     * Intent: Keep partial time edits from resetting the other side of the range.
     * @param {TimeInputField} aField The boundary field to update.
     * @param {TimeBoundary | undefined} aValue The parsed boundary value.
     * @returns {void}
     */
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

    /**
     * Parses one time input change and updates the draft when the value is valid.
     * Intent: Keep live typing and config updates in sync for the date picker inputs.
     * @param {TimeInputField} aField The boundary field being edited.
     * @param {TimeInputEvent} aEvent The raw input event.
     * @returns {void}
     */
    const handleTimeChange = (aField: TimeInputField, aEvent: TimeInputEvent) => {
        const sNextValue = aEvent.target.value;
        updateSingleBoundary(aField, parseTimeRangeInputValue(sNextValue));
        updateInputValue(aField, sNextValue);
    };

    /**
     * Applies one committed time input value.
     * Intent: Normalize the final date-picker value before it is written into the config.
     * @param {TimeInputField} aField The boundary field being applied.
     * @param {string} aValue The committed value.
     * @returns {void}
     */
    const handleTimeApply = (aField: TimeInputField, aValue: string) => {
        updateSingleBoundary(aField, parseTimeRangeInputValue(aValue));
        updateInputValue(aField, aValue);
    };

    /**
     * Applies one quick time-range preset.
     * Intent: Let the user jump to common ranges without entering the full time expression manually.
     * @param {QuickTimeRangeOption} aOption The selected quick range option.
     * @returns {void}
     */
    const handleQuickTime = (aOption: QuickTimeRangeOption) => {
        const [sStartValue = '', sEndValue = ''] = aOption.value;
        updateTimeConfig(
            parseQuickTimeBoundaryValue(sStartValue),
            parseQuickTimeBoundaryValue(sEndValue),
        );
        setStartTime(sStartValue);
        setEndTime(sEndValue);
    };

    /**
     * Clears the custom time range back to an empty override.
     * Intent: Restore the inherited time behavior with one explicit reset action.
     * @returns {void}
     */
    const handleClear = () => {
        updateTimeConfig({ kind: 'empty' }, { kind: 'empty' });
        setStartTime('');
        setEndTime('');
    };

    /**
     * Parses one quick-range preset value into a structured time boundary.
     * Intent: Fail loudly if a hard-coded quick-range option drifts out of the supported parser format.
     * @param {string} aValue The quick-range preset value.
     * @returns {TimeBoundary}
     */
    const parseQuickTimeBoundaryValue = (aValue: string): TimeBoundary => {
        const sBoundary = parseTimeRangeInputValue(aValue);
        if (!sBoundary) {
            throw new Error(`Expected a valid quick time boundary: ${aValue}`);
        }

        return sBoundary;
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
