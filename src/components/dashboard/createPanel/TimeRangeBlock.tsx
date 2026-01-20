import { VscTrash } from '@/assets/icons/Icon';
import { Button, DatePicker, Dropdown, Page, QuickTimeRange } from '@/design-system/components';
import { refreshTimeOptions } from '@/utils/dashboardUtil';
import { TIME_RANGE, TIME_RANGE_NOW } from '@/utils/constants';

interface TimeRangeBlockProps {
    pPanelOption: any;
    pSetPanelOption: any;
    /**
     * Enable "last" to "now" string conversion for TQL compatibility
     */
    pEnableLastToNowConversion?: boolean;
    /**
     * Use TIME_RANGE_NOW instead of TIME_RANGE for TQL charts
     */
    pUseTqlTimeRange?: boolean;
}

/**
 * Reusable time range configuration component
 * Used in both standard dashboard panels and TQL chart panels
 */
export const TimeRangeBlock = ({ pPanelOption, pSetPanelOption, pEnableLastToNowConversion = false, pUseTqlTimeRange = false }: TimeRangeBlockProps) => {
    const setUseTimePicker = (aKey: string, aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, timeRange: { ...aPrev.timeRange, [aKey]: aValue } };
        });
    };

    const handleTime = (aKey: string, aEvent: any) => {
        let sUseCustomTime: boolean = false;
        let sTimeRange: any = null;

        if (aKey === 'start') {
            sUseCustomTime = aEvent !== '' && pPanelOption.timeRange.end !== '';
            sTimeRange = { ...pPanelOption.timeRange, [aKey]: aEvent };
        } else if (aKey === 'end') {
            sUseCustomTime = aEvent !== '' && pPanelOption.timeRange.start !== '';
            sTimeRange = { ...pPanelOption.timeRange, [aKey]: aEvent };
        } else {
            // Clear case
            sTimeRange = { ...pPanelOption.timeRange, start: '', end: '' };
        }

        // TQL compatibility: convert "last" to "now" for backward compatibility
        if (pEnableLastToNowConversion && sTimeRange.start) {
            if (sTimeRange.start.toLowerCase().includes('last')) {
                sTimeRange.start = sTimeRange.start.toLowerCase().replace('last', 'now');
            }
        }
        if (pEnableLastToNowConversion && sTimeRange.end) {
            if (sTimeRange.end.toLowerCase().includes('last')) {
                sTimeRange.end = sTimeRange.end.toLowerCase().replace('last', 'now');
            }
        }

        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: sUseCustomTime, timeRange: sTimeRange };
        });
    };

    const handleQuickTime = (aValue: any) => {
        pSetPanelOption((aPrev: any) => {
            return { ...aPrev, useCustomTime: true, timeRange: { ...aPrev.timeRange, start: aValue.value[0], end: aValue.value[1] } };
        });
    };

    return (
        <>
            <Page.ContentBlock pHoverNone style={{ padding: 0, margin: 0 }}>
                <Page.ContentTitle>Custom time range</Page.ContentTitle>
            </Page.ContentBlock>
            <Page.DpRow style={{ alignItems: 'start', padding: 0 }}>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Dropdown.Root
                            label="Refresh"
                            labelPosition="left"
                            fullWidth
                            options={refreshTimeOptions}
                            value={pPanelOption.timeRange.refresh}
                            onChange={(value: string) => setUseTimePicker('refresh', value)}
                            placeholder="Select refresh time"
                        >
                            <Dropdown.Trigger />
                            <Dropdown.Menu>
                                <Dropdown.List />
                            </Dropdown.Menu>
                        </Dropdown.Root>
                    </Page.ContentBlock>
                    <Page.Space />
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <DatePicker
                            pLabel="From"
                            pTopPixel={32}
                            pTimeValue={pPanelOption.timeRange.start ?? ''}
                            onChange={(date: any) => handleTime('start', date.target.value)}
                            pSetApply={(date: any) => handleTime('start', date)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <DatePicker
                            pLabel="To"
                            pTopPixel={32}
                            pTimeValue={pPanelOption.timeRange.end ?? ''}
                            onChange={(date: any) => handleTime('end', date.target.value)}
                            pSetApply={(date: any) => handleTime('end', date)}
                        />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Page.DpRow style={{ justifyContent: 'end' }}>
                            <Button variant="ghost" onClick={() => handleTime('', '')}>
                                <VscTrash size={16} />
                                <span>Clear</span>
                            </Button>
                        </Page.DpRow>
                    </Page.ContentBlock>
                </Page.ContentBlock>
                <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                    <QuickTimeRange options={pUseTqlTimeRange ? [TIME_RANGE_NOW] : TIME_RANGE} onSelect={handleQuickTime} title="" />
                </Page.ContentBlock>
            </Page.DpRow>
        </>
    );
};
