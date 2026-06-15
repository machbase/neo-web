import { useEffect, useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Page } from '@/design-system/components';
import { formatLocalTimestampWithMilliseconds } from '../domain/time/TimeFormatters';

const OVERLAP_TIME_SHIFT_COLORS = [
    '#EB5757',
    '#6FCF97',
    '#9C8FFF',
    '#F5AA64',
    '#BB6BD9',
    '#B4B4B4',
    '#FFD95F',
    '#2D9CDB',
    '#C3A080',
    '#B4B4B4',
    '#6B6B6B',
];

const PANEL_ROW_STYLE = { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } as const;
const LABEL_ROW_STYLE = { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' } as const;
const CONTROL_ROW_STYLE = { alignItems: 'center', gap: '6px' } as const;
const OFFSET_LABEL_STYLE = { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' } as const;
const OFFSET_INPUT_STYLE = { width: '86px', height: '30px' } as const;
const NUDGE_BUTTONS = [
    { label: '-1m', offsetMs: -60_000 },
    { label: '-1s', offsetMs: -1_000 },
    { label: '+1s', offsetMs: 1_000 },
    { label: '+1m', offsetMs: 60_000 },
] as const;

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

    function getCurrentShiftOffset(): number {
        try {
            return parseShiftOffsetInput(sOffsetMillisecondsInput);
        } catch {
            return pShiftOffsetMs;
        }
    }

    function setShiftOffset(offsetMs: number): void {
        setOffsetMillisecondsInput(String(offsetMs));
        pOnSetShiftOffset(offsetMs);
    }

    function nudgeShiftOffset(offsetMs: number): void {
        setShiftOffset(getCurrentShiftOffset() + offsetMs);
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
                            background: OVERLAP_TIME_SHIFT_COLORS[pColorIndex],
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
                        {NUDGE_BUTTONS.map((nudgeButton) => (
                            <Button
                                key={nudgeButton.label}
                                variant="secondary"
                                size="xsm"
                                onClick={() => nudgeShiftOffset(nudgeButton.offsetMs)}
                                isToolTip
                                toolTipContent={`Nudge ${nudgeButton.label}`}
                            >
                                {nudgeButton.label}
                            </Button>
                        ))}
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
