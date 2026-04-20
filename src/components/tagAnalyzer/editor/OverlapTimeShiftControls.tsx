import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Combobox } from '@/design-system/components/Combobox';
import { Page } from '@/design-system/components';
import {
    getTimeUnitMilliseconds,
    normalizeTimeUnit,
    SHIFT_TIME_UNIT_OPTIONS,
} from '../utils/time/IntervalUtils';
import { TimeUnit } from '../utils/time/timeTypes';

// Used by OverlapTimeShiftControls to type overlap shift direction.
export type OverlapShiftDirection = '+' | '-';

/**
 * Renders the per-series offset controls used inside the overlap modal.
 * Intent: Let the user nudge one overlapped panel backward or forward by a chosen time amount.
 * @param {number} pColorIndex The color index used for the series marker.
 * @param {string} pLabel The series label to display.
 * @param {number} pStart The current panel start time.
 * @param {number} pDuration The panel duration in milliseconds.
 * @param {(aDirection: OverlapShiftDirection, aRange: number) => void} pOnShiftTime Applies a time shift to the panel.
 * @returns {JSX.Element}
 */
const OverlapTimeShiftControls = ({
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
    pOnShiftTime: (aDirection: OverlapShiftDirection, aRange: number) => void;
}) => {
    const [sValue, setValue] = useState('0');
    const [sType, setType] = useState<TimeUnit>(
        TimeUnit.Millisecond,
    );

    /**
     * Converts the current shift unit and value into milliseconds.
     * Intent: Keep the shift buttons and the numeric input aligned on the same time scale.
     * @returns {number}
     */
    const getShiftAmount = () => {
        return getTimeUnitMilliseconds(sType, Number(sValue));
    };

    /**
     * Converts one local timestamp into UTC chart time.
     * Intent: Keep the displayed overlap timestamps aligned with the chart's UTC rendering.
     * @param {number} sTime The local timestamp to convert.
     * @returns {number}
     */
    const setUtcTime = (sTime: number) => {
        return sTime - getTimeZoneValue() * 1000 * 60;
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
                            background: `${['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'][pColorIndex]}`,
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
                        onChange={(aEvent: any) => setValue(aEvent.target.value)}
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
                            setType(
                                normalizeTimeUnit(value) ??
                                    TimeUnit.Millisecond,
                            )
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
export default OverlapTimeShiftControls;
