import { Close } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import { Popover } from '@/design-system/components/Popover';
import moment from 'moment';
import type { FFTSelectionPayload } from '../../domain/ChartDataModel';
import { formatDurationLabel } from '../../domain/time/TimeFormatters';

const SUMMARY_FIELDS = ['name', 'min', 'max', 'avg'] as const;

export type SelectionSummaryPopoverState = {
    isOpen: boolean;
    menuPosition: { x: number; y: number };
};

export function SelectionSummaryPopover({
    selection,
    popoverState,
    onClose,
}: {
    selection: FFTSelectionPayload;
    popoverState: SelectionSummaryPopoverState;
    onClose: () => void;
}) {
    return (
        <Popover
            isOpen={popoverState.isOpen}
            position={popoverState.menuPosition}
            onClose={onClose}
        >
            <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                <Page.DpRow style={{ justifyContent: 'end' }}>
                    <Button size="sm" variant="ghost" onClick={onClose} icon={<Close size={16} />} />
                </Page.DpRow>
                <Page.ContentDesc>
                    {moment(selection.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')} ~{' '}
                    {moment(selection.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                </Page.ContentDesc>
                <Page.DpRow style={{ justifyContent: 'center' }}>
                    <Page.ContentDesc>
                        {`( ${formatDurationLabel(
                            selection.startTime,
                            selection.endTime,
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
                {selection.seriesSummaries.map((item, index) => (
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
