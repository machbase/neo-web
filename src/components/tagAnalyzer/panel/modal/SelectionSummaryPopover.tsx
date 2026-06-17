import { Close } from '@/assets/icons/Icon';
import { Button, Page } from '@/design-system/components';
import moment from 'moment';
import type { FFTSelectionPayload } from '../../domain/ChartDomain';
import {
    formatAxisPointerLabel,
    formatRangeSpanLabel,
} from '../../domain/time/formatting/TimeFormatters';
import PanelMarkupPopover from './PanelMarkupPopover';

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
        <PanelMarkupPopover
            position={position}
            onClose={onClose}
            draggable
            outsideCloseIgnoreSelector=".panel-header"
        >
            <Page
                style={{
                    minWidth: 280,
                    backgroundColor: '#1f1d1d',
                    border: '1px solid #454545',
                    borderRadius: 4,
                    padding: '8px 10px 10px 30px',
                }}
            >
                <Page.DpRow style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    <Page.ContentText
                        pContent="Selection Summary"
                        style={{
                            color: '#f8f8f8',
                            fontSize: 15,
                            fontWeight: 600,
                        }}
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onClose}
                        icon={<Close size={16} />}
                        style={{ position: 'absolute', right: 0 }}
                    />
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
        </PanelMarkupPopover>
    );
}
