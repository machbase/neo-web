import { Close } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import { Popover } from '@/design-system/components/Popover';
import moment from 'moment';
import type { FFTSelectionPayload } from '../../domain/ChartDomain';
import {
    formatAxisPointerLabel,
    formatRangeSpanLabel,
} from '../../domain/time/TimeFormatters';

const SUMMARY_FIELDS = ['name', 'min', 'max', 'avg'] as const;

export function SelectionSummaryPopover({
    selection,
    position,
    isNumericXAxis,
    onClose,
}: {
    selection: FFTSelectionPayload;
    position: { x: number; y: number };
    isNumericXAxis: boolean;
    onClose: () => void;
}) {
    return (
        <Popover
            isOpen
            position={position}
            onClose={onClose}
        >
            <Page style={{ backgroundColor: 'inherit', padding: 0 }}>
                <Page.DpRow style={{ justifyContent: 'end' }}>
                    <Button size="sm" variant="ghost" onClick={onClose} icon={<Close size={16} />} />
                </Page.DpRow>
                <Page.ContentDesc>
                    {isNumericXAxis
                        ? formatAxisPointerLabel(selection.startTime, true)
                        : moment(selection.startTime).format('yyyy-MM-DD HH:mm:ss.SSS')}{' '}
                    ~{' '}
                    {isNumericXAxis
                        ? formatAxisPointerLabel(selection.endTime, true)
                        : moment(selection.endTime).format('yyyy-MM-DD HH:mm:ss.SSS')}
                </Page.ContentDesc>
                <Page.DpRow style={{ justifyContent: 'center' }}>
                    <Page.ContentDesc>
                        {`( ${formatRangeSpanLabel(
                            selection.startTime,
                            selection.endTime,
                            isNumericXAxis,
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
