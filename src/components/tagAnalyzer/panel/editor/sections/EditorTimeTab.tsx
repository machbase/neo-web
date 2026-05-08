import { Button, DatePicker, Page, QuickTimeRange } from '@/design-system/components';
import { VscTrash } from '@/assets/icons/Icon';
import { TIME_RANGE } from '@/utils/constants';
import type {
    PanelTimeConfig,
    TimeInputEvent,
} from '../EditorTypes';
import { useEditorTimeTabState } from './useEditorTimeTabState';

const EditorTimeTab = ({
    pTimeConfig,
    pOnChangeTimeConfig,
}: {
    pTimeConfig: PanelTimeConfig;
    pOnChangeTimeConfig: (config: PanelTimeConfig) => void;
}) => {
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
            >
                <Page.ContentTitle>Custom time range</Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }}>
                <Page.ContentBlock
                    pHoverNone
                    style={{ padding: 0 }}
                >
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                    >
                        <DatePicker
                            pLabel="From"
                            pTopPixel={-370}
                            pTimeValue={sStartTime}
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_bgn', date)}
                            pSetApply={(date: string) => handleTimeApply('range_bgn', date)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                    >
                        <DatePicker
                            pLabel="To"
                            pTopPixel={-370}
                            pTimeValue={sEndTime}
                            onChange={(date: TimeInputEvent) => handleTimeChange('range_end', date)}
                            pSetApply={(date: string) => handleTimeApply('range_end', date)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock
                        pHoverNone
                        style={{ padding: 0 }}
                    >
                        <Page.DpRow style={{ justifyContent: 'end' }}>
                            <Button
                                variant="ghost"
                                onClick={handleClear}
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
                >
                    <QuickTimeRange
                        options={TIME_RANGE}
                        onSelect={handleQuickTime}
                        title=""
                    />
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};

export default EditorTimeTab;
