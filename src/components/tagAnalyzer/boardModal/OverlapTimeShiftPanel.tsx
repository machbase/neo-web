import { useState, type ChangeEvent } from 'react';
import {
    MdCenterFocusStrong,
    VscChevronLeft,
    VscChevronRight,
} from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Page } from '@/design-system/components';
import type { OverlapShiftDirection } from '../domain/BoardDomain';
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

const DEFAULT_OFFSET_MILLISECONDS_INPUT = '0';

function parseOffsetInput(value: string): number {
    const sParsedValue = Number(value);

    return Number.isFinite(sParsedValue) ? sParsedValue : 0;
}

const OverlapTimeShiftPanel = ({
    pColorIndex,
    pLabel,
    pStart,
    pDuration,
    pOnShiftTime,
    pOnAlignTime,
}: {
    pColorIndex: number;
    pLabel: string;
    pStart: number;
    pDuration: number;
    pOnShiftTime: (direction: OverlapShiftDirection, range: number) => void;
    pOnAlignTime: () => void;
}): JSX.Element => {
    const [sOffsetMillisecondsInput, setOffsetMillisecondsInput] = useState(
        DEFAULT_OFFSET_MILLISECONDS_INPUT,
    );

    const getShiftAmount = (): number => {
        return parseOffsetInput(sOffsetMillisecondsInput);
    };

    const updateOffsetInput = function updateOffsetInput(
        event: ChangeEvent<HTMLInputElement>,
    ): void {
        setOffsetMillisecondsInput(event.target.value);
    };

    return (
        <div>
            <Page.DpRow
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                }}
            >
                <Page.DpRow
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}
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
                    style={{
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<MdCenterFocusStrong size={14} />}
                        onClick={pOnAlignTime}
                        isToolTip
                        toolTipContent="Align all rows to this start"
                        aria-label="Align all rows to this start"
                    />
                    <Button.Group>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<VscChevronLeft size={16} />}
                            onClick={() => pOnShiftTime('-', getShiftAmount())}
                            aria-label="Previous"
                        />
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                            }}
                        >
                            <Input
                                type="number"
                                value={sOffsetMillisecondsInput}
                                onChange={updateOffsetInput}
                                size="md"
                                style={{ width: '86px', height: '30px' }}
                            />
                            ms
                        </label>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<VscChevronRight size={16} />}
                            onClick={() => pOnShiftTime('+', getShiftAmount())}
                            aria-label="Next"
                        />
                    </Button.Group>
                </Page.DpRow>
            </Page.DpRow>
        </div>
    );
};

export default OverlapTimeShiftPanel;
