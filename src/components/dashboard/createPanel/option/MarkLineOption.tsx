import { PlusCircle, Delete } from '@/assets/icons/Icon';
import { IconButton } from '@/components/buttons/IconButton';
import { Input } from '@/components/inputs/Input';
import { useEffect, useState } from 'react';
import './MarkLineOption.scss';

interface MarkLineOptionProps {
    pKey: number | string;
    pIndex: number;
    pMarkList: any;
    pSetMarkList: any;
    pHandleFunction: any;
}

export const MarkLineOption = (props: MarkLineOptionProps) => {
    const { pKey, pIndex, pMarkList, pSetMarkList, pHandleFunction } = props;
    const [sStartXAxis, setStartXAxis] = useState<string>(pMarkList[pIndex * 2].xAxis ?? '0');
    const [sEndXAxis, setEndXAxis] = useState<string>(pMarkList[pIndex * 2 + 1].xAxis ?? '0');

    const handleMarkLine = (aStart: string, aEnd: string) => {
        pSetMarkList((prev: { xAxis: number }[]) => {
            let sTemp = JSON.parse(JSON.stringify(prev));
            sTemp[pIndex * 2].xAxis = Number(aStart);
            sTemp[pIndex * 2 + 1].xAxis = Number(aEnd);
            return sTemp;
        });
    };

    useEffect(() => {
        handleMarkLine(sStartXAxis, sEndXAxis);
    }, [sStartXAxis, sEndXAxis]);

    return (
        <div key={pKey} className="markline-wrapper">
            <div>start</div>
            <Input pHeight={25} pWidth={50} pBorderRadius={4} pType="number" pValue={pMarkList[pIndex * 2].xAxis} pSetValue={setStartXAxis} onChange={() => null} />
            <div>end</div>
            <Input pHeight={25} pWidth={50} pBorderRadius={4} pType="number" pValue={pMarkList[pIndex * 2 + 1].xAxis} pSetValue={setEndXAxis} onChange={() => null} />
            <div className="ctrl-button">
                <IconButton pIcon={pIndex === 0 ? <PlusCircle /> : <Delete />} onClick={pHandleFunction} />
            </div>
        </div>
    );
};
