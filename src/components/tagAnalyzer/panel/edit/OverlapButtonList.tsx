import { getTimeZoneValue, toDateUtcChart } from '@/utils/utils';
import { useState } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';
import { Button } from '@/design-system/components/Button';
import { Input } from '@/design-system/components/Input';
import { Combobox } from '@/design-system/components/Combobox';
import { Page } from '@/design-system/components';

const TIME_UNIT_OPTIONS = [
    { value: 'ms', label: 'ms' },
    { value: 'sec', label: 'sec' },
    { value: 'min', label: 'min' },
    { value: 'hour', label: 'hour' },
    { value: 'day', label: 'day' },
];

const OverlapButtonList = ({ pPanelInfo, pSetTime, pPanelsInfo, pIdx }: any) => {
    const [sValue, setValue] = useState('0');
    const [sType, setType] = useState('ms');

    const calcTime = () => {
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
        <div key={pPanelInfo.board.index_key}>
            <Page.DpRow style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <Page.DpRow style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <div
                        style={{
                            width: '10px',
                            height: '10px',
                            background: `${['#EB5757', '#6FCF97', '#9C8FFF', '#F5AA64', '#BB6BD9', '#B4B4B4', '#FFD95F', '#2D9CDB', '#C3A080', '#B4B4B4', '#6B6B6B'][pIdx]}`,
                        }}
                    />
                    <div>{pPanelInfo.board.tag_set[0].alias ? pPanelInfo.board.tag_set[0].alias : pPanelInfo.board.tag_set[0].tagName}</div>
                    {toDateUtcChart(setUtcTime(pPanelInfo.start), true)} ~ {toDateUtcChart(setUtcTime(pPanelInfo.start + pPanelsInfo[0].duration), true)}{' '}
                </Page.DpRow>
                <Button.Group>
                    <Button variant="secondary" size="sm" icon={<VscChevronLeft size={16} />} onClick={() => pSetTime(pPanelInfo, '-', calcTime())} aria-label="Previous" />
                    <Input type="text" value={sValue} onChange={(aEvent: any) => setValue(aEvent.target.value)} size="md" style={{ height: '30px' }} />
                    <Combobox.Root options={TIME_UNIT_OPTIONS} value={sType} onChange={(value: string) => setType(value)} size="md">
                        <Combobox.Input style={{ height: '30px' }} />
                        <Combobox.Dropdown>
                            <Combobox.List />
                        </Combobox.Dropdown>
                    </Combobox.Root>
                    <Button variant="secondary" size="sm" icon={<VscChevronRight size={16} />} onClick={() => pSetTime(pPanelInfo, '+', calcTime())} aria-label="Next" />
                </Button.Group>
            </Page.DpRow>
        </div>
    );
};
export default OverlapButtonList;
