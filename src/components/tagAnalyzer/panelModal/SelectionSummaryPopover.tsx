import { Close } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import { Popover } from '@/design-system/components/Popover';
import moment from 'moment';
import { formatDurationLabel } from '../utils/time/IntervalUtils';
import type { PanelRangeSelectionState } from '../panel/usePanelRangeSelectionState';

const SUMMARY_FIELDS = ['name', 'min', 'max', 'avg'] as const;

export function SelectionSummaryPopover({
    selectionState,
    onClose,
}: {
    selectionState: PanelRangeSelectionState;
    onClose: () => void;
}) {
    return (
        <Popover
            isOpen={selectionState.isOpen}
            position={selectionState.menuPosition}
            onClose={onClose}
        >
            <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                <Page.DpRow style={{ justifyContent: 'end' }}>
                    <Button size="sm" variant="ghost" onClick={onClose} icon={<Close size={16} />} />
                </Page.DpRow>
                <Page.ContentDesc>
                    {moment(selectionState.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                    {moment(selectionState.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                </Page.ContentDesc>
                <Page.DpRow style={{ justifyContent: 'center' }}>
                    <Page.ContentDesc>
                        {`( ${formatDurationLabel(
                            selectionState.startTime,
                            selectionState.endTime,
                        )} )`}
                    </Page.ContentDesc>
                </Page.DpRow>
                <Page.Space />
                <Page.DpRow>
                    {SUMMARY_FIELDS.map((field) => (
                        <Page.DpRow key={field} style={{ flex: 1 }}>
                            {field}
                        </Page.DpRow>
                    ))}
                </Page.DpRow>
                {selectionState.seriesSummaries.map((item, index) => (
                    <Page.DpRow key={item.name + index}>
                        {SUMMARY_FIELDS.map((field) => (
                            <Page.ContentText
                                key={field}
                                pContent={item[field] ?? ''}
                                style={{ flex: 1 }}
                            />
                        ))}
                    </Page.DpRow>
                ))}
            </Page>
        </Popover>
    );
}
