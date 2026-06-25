import { Close, LineChart } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';
import type { FFTSelectionPayload } from '../../domain/ChartDomain';
import {
    formatAxisPointerLabel,
    formatRangeSpanLabel,
} from '../../formatting/TimeFormatters';
import PanelPopover from './PanelPopover';

const SUMMARY_FIELDS = ['name', 'min', 'max', 'avg'] as const;
const SUMMARY_FIELD_LABELS: Record<(typeof SUMMARY_FIELDS)[number], string> = {
    name: 'Name',
    min: 'Min',
    max: 'Max',
    avg: 'Avg',
};

export function SelectionSummaryPopover({
    selection,
    position,
    isNumericXAxis,
    onOpenFft,
    onClose,
}: {
    selection: FFTSelectionPayload;
    position: { x: number; y: number };
    isNumericXAxis: boolean;
    onOpenFft: () => void;
    onClose: () => void;
}) {
    return (
        <PanelPopover
            title="Selection Summary"
            position={position}
            onClose={onClose}
            draggable
            size="compact"
            outsideCloseIgnoreSelector=".panel-header"
            headerAction={(
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClose}
                    icon={<Close size={16} />}
                    aria-label="Close selection summary"
                />
            )}
        >
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
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(88px, 1.4fr) repeat(3, minmax(72px, 1fr))',
                    gap: '6px 10px',
                    alignItems: 'baseline',
                }}
            >
                {SUMMARY_FIELDS.map((field) => (
                    <Page.ContentDesc key={field}>
                        {SUMMARY_FIELD_LABELS[field]}
                    </Page.ContentDesc>
                ))}
                {selection.seriesSummaries.map((item, index) => (
                    SUMMARY_FIELDS.map((field) => (
                        <Page.ContentText
                            key={`${item.name}-${index}-${field}`}
                            pContent={item[field] ?? ''}
                            style={{
                                minWidth: 0,
                                overflowWrap: 'anywhere',
                                textAlign: field === 'name' ? 'left' : 'right',
                            }}
                        />
                    ))
                ))}
            </div>
            <Page.Space />
            <Button
                size="sm"
                variant="secondary"
                onClick={onOpenFft}
                icon={<LineChart size={16} />}
                fullWidth
            >
                Open FFT chart
            </Button>
        </PanelPopover>
    );
}
