import { PlusCircle, Delete } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { useState } from 'react';
import './MarkLineOption.scss';

interface MarkLineOptionProps {
    pIndex: number;
    pMarkList: any;
    pSetMarkList: any;
    pHandleFunction: any;
}

export const MarkLineOption = (props: MarkLineOptionProps) => {
    const { pIndex, pMarkList, pSetMarkList, pHandleFunction } = props;
    const [sStartXAxis, setStartXAxis] = useState<string>(pMarkList[pIndex * 2].xAxis ?? '0');
    const [sEndXAxis, setEndXAxis] = useState<string>(pMarkList[pIndex * 2 + 1].xAxis ?? '0');

    const handleMarkLine = (aEvent: any, aIsStart: boolean) => {
        pSetMarkList((prev: { xAxis: number }[]) => {
            let sTemp = JSON.parse(JSON.stringify(prev));
            if (aIsStart) {
                sTemp[pIndex * 2].xAxis = Number(aEvent.target.value);
            } else {
                sTemp[pIndex * 2 + 1].xAxis = Number(aEvent.target.value);
            }
            return sTemp;
        });
    };

    return (
        <div className="markline-wrapper">
            <div>start</div>
            <Input
                pHeight={25}
                pWidth={50}
                pBorderRadius={4}
                pType="number"
                pValue={sStartXAxis}
                pSetValue={setStartXAxis}
                onChange={(aEvent: any) => handleMarkLine(aEvent, true)}
            />
            <div>end</div>
            <Input pHeight={25} pWidth={50} pBorderRadius={4} pType="number" pValue={sEndXAxis} pSetValue={setEndXAxis} onChange={(aEvent: any) => handleMarkLine(aEvent, false)} />
            <div className="ctrl-button">
                <IconButton pIcon={pIndex === 0 ? <PlusCircle /> : <Delete />} onClick={pHandleFunction} />
            </div>
        </div>
    );
};
