import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Combobox } from '@/design-system/components/Combobox';
import { Page } from '@/design-system/components';

type OverlapShiftDirection = '+' | '-';

const TIME_UNIT_OPTIONS = [
    { value: 'ms', label: 'ms' },
    { value: 'sec', label: 'sec' },
    { value: 'min', label: 'min' },
    { value: 'hour', label: 'hour' },
    { value: 'day', label: 'day' },
];

// Renders the per-series offset controls used inside the overlap modal.
// It lets the user nudge one overlapped panel backward or forward by a chosen time amount.
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
    const [sType, setType] = useState('ms');

    const getShiftAmount = () => {
        let sTime = 1;
        if (sType === 'ms') sTime = 1;
        else if (sType === 'sec') sTime = 1000;
        else if (sType === 'min') sTime = 1000 * 60;
        else if (sType === 'hour') sTime = 1000 * 60 * 60;
        else sTime = 1000 * 60 * 60 * 24;
        return sTime * Number(sValue);
    };

    const setUtcTime = (sTime: number) => {
        return sTime - getTimeZoneValue() * 1000 * 60;
    };

    return (
        <div>
            <Page.DpRow style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <Page.DpRow style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <div
                        style={{
                            width: '10px',
                            height: '10px',
                            background: `${['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'][pColorIndex]}`,
                        }}
                    />
                    <div>{pLabel}</div>
                    {toDateUtcChart(setUtcTime(pStart), true)} ~ {toDateUtcChart(setUtcTime(pStart + pDuration), true)}{' '}
                </Page.DpRow>
                <Button.Group>
                    <Button variant="secondary" size="sm" icon={<VscChevronLeft size={16} />} onClick={() => pOnShiftTime('-', getShiftAmount())} aria-label="Previous" />
                    <Input type="text" value={sValue} onChange={(aEvent: any) => setValue(aEvent.target.value)} size="md" style={{ height: '30px' }} />
                    <Combobox.Root options={TIME_UNIT_OPTIONS} value={sType} onChange={(value: string) => setType(value)} size="md">
                        <Combobox.Input style={{ height: '30px' }} />
                        <Combobox.Dropdown>
                            <Combobox.List />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                    <Button variant="secondary" size="sm" icon={<VscChevronRight size={16} />} onClick={() => pOnShiftTime('+', getShiftAmount())} aria-label="Next" />
                </Button.Group>
            </Page.DpRow>
        </div>
    );
};
export default OverlapTimeShiftControls;
