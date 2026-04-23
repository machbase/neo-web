import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type {
    EditorTimeTabProps,
    TimeInputEvent,
} from '../EditorTypes';
import { useEditorTimeTabState } from './useEditorTimeTabState';

/**
 * Edits the panel-specific time range override.
 * Intent: Support absolute dates, relative expressions, quick ranges, and clearing back to inherited time.
 * @param {PanelTimeConfig} pTimeConfig The current time draft.
 * @param {(aConfig: PanelTimeConfig) => void} pOnChangeTimeConfig Updates the time draft.
 * @returns {JSX.Element}
 */
const EditorTimeTab = ({
    pTimeConfig,
    pOnChangeTimeConfig,
}: EditorTimeTabProps) => {
    const {
        startTime: sStartTime,
        endTime: sEndTime,
        handleTimeChange,
        handleTimeApply,
        handleQuickTime,
        handleClear,
    } = useEditorTimeTabState({
        timeConfig: pTimeConfig,
        onChangeTimeConfig: pOnChangeTimeConfig,
    });

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

export default EditorTimeTab;
