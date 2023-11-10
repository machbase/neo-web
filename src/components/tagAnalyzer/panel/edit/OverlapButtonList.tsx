import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { Select } from '@/components/inputs/Select';
import { toDateUtcChart } from '@/utils/utils';
import { useState } from 'react';
import { VscChevronLeft, VscChevronRight } from '@/assets/icons/Icon';

const OverlapButtonList = ({ pPanelInfo, pSetTime, pPanelsInfo }: any) => {
    const [sValue, setValue] = useState('0');
    const [sType, setType] = useState('ms');
    const [sOper, setOper] = useState('+');

    const calcTime = () => {
        let sTime = 1;
        if (sType === 'ms') sTime = 1;
        else if (sType === 'sec') sTime = 1000;
        else if (sType === 'min') sTime = 1000 * 60;
        else if (sType === 'hour') sTime = 1000 * 60 * 60;
        else sTime = 1000 * 60 * 60 * 24;
        return sTime * Number(sValue);
    };

    return (
        <div key={pPanelInfo.board.index_key} className="navi-list">
            <div className="navi-name">{pPanelInfo.board.tag_set[0].alias ? pPanelInfo.board.tag_set[0].alias : pPanelInfo.board.tag_set[0].tagName}</div>
            <div className="navi-time">
                {toDateUtcChart(pPanelInfo.start, true)} ~ {toDateUtcChart(pPanelInfo.start + pPanelsInfo[0].duration, true)}{' '}
            </div>
            <div className="navi-button">
                <IconButton pHeight={26} pIcon={<VscChevronLeft></VscChevronLeft>} onClick={() => pSetTime(pPanelInfo, '-', calcTime())} />
                <Input pWidth={100} pHeight={26} pType="text" pValue={sValue} pSetValue={() => null} pBorderRadius={4} onChange={(aEvent: any) => setValue(aEvent.target.value)} />
                <Select
                    pFontSize={14}
                    pWidth={70}
                    pBorderRadius={4}
                    pInitValue={sType}
                    pHeight={26}
                    onChange={(aEvent) => setType(aEvent.target.value)}
                    pOptions={['ms', 'sec', 'min', 'hour', 'day']}
                ></Select>
                <IconButton pHeight={26} pIcon={<VscChevronRight></VscChevronRight>} onClick={() => pSetTime(pPanelInfo, '+', calcTime())} />
            </div>
        </div>
    );
};
export default OverlapButtonList;
