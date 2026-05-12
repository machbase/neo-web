import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState, type ChangeEvent } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Combobox } from '@/design-system/components/Combobox';
import { Page } from '@/design-system/components';
import { SHIFT_TIME_UNIT_OPTIONS } from '../time/TimeUnitUtils';
import {
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
} from '../time/TimeUnitUtils';
import { TimeUnit } from '../time/TimeTypes';
import type { OverlapShiftDirection } from '../domain/OverlapModel';

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

const OverlapTimeShiftPanel = ({
    pColorIndex,
    pLabel,
    pStart,
    pDuration,
    pOnShiftTime,
}: {
    pColorIndex: number;
    pLabel: string;
    pStart: number;
    pDuration: number;
    pOnShiftTime: (direction: OverlapShiftDirection, range: number) => void;
}): JSX.Element => {
    const [sValue, setValue] = useState('0');
    const [sType, setType] = useState<TimeUnit>(TimeUnit.Millisecond);

    const getShiftAmount = (): number => {
        return getTimeUnitMilliseconds(sType, Number(sValue));
    };

    const setUtcTime = (time: number): number => {
        return time - getTimeZoneValue() * 1000 * 60;
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
                    {toDateUtcChart(setUtcTime(pStart), true)} ~{' '}
                    {toDateUtcChart(setUtcTime(pStart + pDuration), true)}{' '}
                </Page.DpRow>
                <Button.Group>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<VscChevronLeft size={16} />}
                        onClick={() => pOnShiftTime('-', getShiftAmount())}
                        aria-label="Previous"
                    />
                    <Input
                        type="text"
                        value={sValue}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setValue(event.target.value)
                        }
                        size="md"
                        style={{ height: '30px' }}
                    />
                    <Combobox.Root
                        options={SHIFT_TIME_UNIT_OPTIONS}
                        value={sType}
                        onChange={(value: string) =>
                            setType(normalizeTimeUnit(value) ?? TimeUnit.Millisecond)
                        }
                        size="md"
                    >
                        <Combobox.Input
                            style={{ height: '30px' }}
                        />
                        <Combobox.Dropdown>
                            <Combobox.List />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<VscChevronRight size={16} />}
                        onClick={() => pOnShiftTime('+', getShiftAmount())}
                        aria-label="Next"
                    />
                </Button.Group>
            </Page.DpRow>
        </div>
    );
};

export default OverlapTimeShiftPanel;
