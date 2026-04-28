import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Combobox } from '@/design-system/components/Combobox';
import { Page } from '@/design-system/components';
import { SHIFT_TIME_UNIT_OPTIONS } from '../utils/time/constants/IntervalConstants';
import {
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
} from '../utils/time/IntervalUtils';
import { TimeUnit } from '../utils/time/types/TimeTypes';
import type { OverlapShiftDirection } from './OverlapTypes';

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
}) => {
    const [sValue, setValue] = useState('0');
    const [sType, setType] = useState<TimeUnit>(TimeUnit.Millisecond);

    const getShiftAmount = () => {
        return getTimeUnitMilliseconds(sType, Number(sValue));
    };

    const setUtcTime = (time: number) => {
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
                className={undefined}
            >
                <Page.DpRow
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                    className={undefined}
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
                <Button.Group
                    className={undefined}
                    style={undefined}
                    fullWidth={undefined}
                    label={undefined}
                    labelPosition={undefined}
                >
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<VscChevronLeft size={16} />}
                        onClick={() => pOnShiftTime('-', getShiftAmount())}
                        aria-label="Previous"
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                    <Input
                        type="text"
                        value={sValue}
                        onChange={(event: any) => setValue(event.target.value)}
                        size="md"
                        style={{ height: '30px' }}
                        variant={undefined}
                        error={undefined}
                        label={undefined}
                        labelPosition={undefined}
                        helperText={undefined}
                        fullWidth={undefined}
                        leftIcon={undefined}
                        rightIcon={undefined}
                    />
                    <Combobox.Root
                        options={SHIFT_TIME_UNIT_OPTIONS}
                        value={sType}
                        onChange={(value: string) =>
                            setType(normalizeTimeUnit(value) ?? TimeUnit.Millisecond)
                        }
                        size="md"
                        className={undefined}
                        label={undefined}
                        labelPosition={undefined}
                        fullWidth={undefined}
                        style={undefined}
                        defaultValue={undefined}
                        onSearch={undefined}
                        placeholder={undefined}
                        disabled={undefined}
                        searchable={undefined}
                        clearable={undefined}
                    >
                        <Combobox.Input
                            style={{ height: '30px' }}
                            className={undefined}
                            icon={undefined}
                        />
                        <Combobox.Dropdown className={undefined}>
                            <Combobox.List
                                children={undefined}
                                className={undefined}
                                emptyMessage={undefined}
                            />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<VscChevronRight size={16} />}
                        onClick={() => pOnShiftTime('+', getShiftAmount())}
                        aria-label="Next"
                        loading={undefined}
                        active={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        children={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    />
                </Button.Group>
            </Page.DpRow>
        </div>
    );
};

export default OverlapTimeShiftPanel;
