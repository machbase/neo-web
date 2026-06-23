import { useEffect, useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Page } from '@/design-system/components';
import { formatLocalTimestampWithMilliseconds } from '../domain/time/formatting/TimeFormatters';
import { OVERLAP_CHART_COLORS } from './OverlapChartOptionBuilder';

const PANEL_ROW_STYLE = { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } as const;
const LABEL_ROW_STYLE = { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' } as const;
const CONTROL_ROW_STYLE = { alignItems: 'center', gap: '6px' } as const;
const OFFSET_LABEL_STYLE = { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' } as const;
const OFFSET_INPUT_STYLE = { width: '86px', height: '30px' } as const;

function parseShiftOffsetInput(value: string): number {
    if (value.trim() === '') {
        throw new Error('Overlap shift offset is required.');
    }

    const sParsedValue = Number(value);

    if (!Number.isFinite(sParsedValue)) {
        throw new Error('Overlap shift offset must be a finite number of milliseconds.');
    }

    return sParsedValue;
}

const OverlapTimeShiftPanel = ({
    pColorIndex,
    pLabel,
    pStart,
    pDuration,
    pShiftOffsetMs,
    pOnSetShiftOffset,
}: {
    pColorIndex: number;
    pLabel: string;
    pStart: number;
    pDuration: number;
    pShiftOffsetMs: number;
    pOnSetShiftOffset: (offsetMs: number) => void;
}): JSX.Element => {
    const [sOffsetMillisecondsInput, setOffsetMillisecondsInput] = useState(
        () => String(pShiftOffsetMs),
    );

    useEffect(() => {
        setOffsetMillisecondsInput(String(pShiftOffsetMs));
    }, [pShiftOffsetMs]);

    function applyShiftOffset(): void {
        pOnSetShiftOffset(parseShiftOffsetInput(sOffsetMillisecondsInput));
    }

    return (
        <div>
            <Page.DpRow
                style={PANEL_ROW_STYLE}
            >
                <Page.DpRow
                    style={LABEL_ROW_STYLE}
                >
                    <div
                        style={{
                            width: '10px',
                            height: '10px',
                            background: OVERLAP_CHART_COLORS[pColorIndex % OVERLAP_CHART_COLORS.length],
                        }}
                    />
                    <div>{pLabel}</div>
                    {formatLocalTimestampWithMilliseconds(pStart)} ~{' '}
                    {formatLocalTimestampWithMilliseconds(pStart + pDuration)}{' '}
                </Page.DpRow>
                <Page.DpRow
                    style={CONTROL_ROW_STYLE}
                >
                    <Button.Group>
                        <label style={OFFSET_LABEL_STYLE}>
                            <Input
                                type="number"
                                value={sOffsetMillisecondsInput}
                                onChange={(event) => setOffsetMillisecondsInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        applyShiftOffset();
                                    }
                                }}
                                size="md"
                                style={OFFSET_INPUT_STYLE}
                            />
                            ms
                        </label>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={applyShiftOffset}
                        >
                            Shift
                        </Button>
                    </Button.Group>
                </Page.DpRow>
            </Page.DpRow>
        </div>
    );
};

export default OverlapTimeShiftPanel;
