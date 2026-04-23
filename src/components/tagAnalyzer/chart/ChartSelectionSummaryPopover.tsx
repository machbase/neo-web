import { Close } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import { Popover } from '@/design-system/components/Popover';
import moment from 'moment';
import { formatDurationLabel } from '../utils/time/IntervalUtils';
import type { DragSelectState } from './useChartSelectionPopupState';

/**
 * Renders the selected-range summary popup.
 * Intent: Keep selected-series summary markup separate from chart body layout and selection state policy.
 * @param props The current selected range state and close handler.
 * @returns The selected-range summary popover.
 */
export function ChartSelectionSummaryPopover({
    dragSelectState,
    onClose,
}: {
    dragSelectState: DragSelectState;
    onClose: () => void;
}) {
    return (
        <Popover
            isOpen={dragSelectState.isOpen}
            position={dragSelectState.menuPosition}
            onClose={onClose}
        >
            <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                <Page.DpRow style={{ justifyContent: 'end' }}>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        icon={<Close size={16} />}
                    />
                </Page.DpRow>
                <Page.ContentDesc>
                    {moment(dragSelectState.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                    {moment(dragSelectState.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                </Page.ContentDesc>
                <Page.DpRow style={{ justifyContent: 'center' }}>
                    <Page.ContentDesc>
                        {'( ' +
                            formatDurationLabel(
                                dragSelectState.startTime,
                                dragSelectState.endTime,
                            ) +
                            ' )'}
                    </Page.ContentDesc>
                </Page.DpRow>
                <Page.Space />
                <Page.DpRow>
                    <Page.DpRow style={{ flex: 1 }}>
                        name
                    </Page.DpRow>
                    <Page.DpRow style={{ flex: 1 }}>
                        min
                    </Page.DpRow>
                    <Page.DpRow style={{ flex: 1 }}>
                        max
                    </Page.DpRow>
                    <Page.DpRow style={{ flex: 1 }}>
                        avg
                    </Page.DpRow>
                </Page.DpRow>
                {dragSelectState.seriesSummaries.map((aItem, aIndex) => {
                    return (
                        <Page.DpRow key={aItem.name + aIndex}>
                            <Page.ContentText
                                pContent={aItem?.name ?? ''}
                                style={{ flex: 1 }}
                            />
                            <Page.ContentText
                                pContent={aItem?.min ?? ''}
                                style={{ flex: 1 }}
                            />
                            <Page.ContentText
                                pContent={aItem?.max ?? ''}
                                style={{ flex: 1 }}
                            />
                            <Page.ContentText
                                pContent={aItem?.avg ?? ''}
                                style={{ flex: 1 }}
                            />
                        </Page.DpRow>
                    );
                })}
            </Page>
        </Popover>
    );
}
