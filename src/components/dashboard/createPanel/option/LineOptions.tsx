import { useEffect, useState } from 'react';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { MarkLineOption } from './MarkLineOption';
import { isEmpty } from '@/utils';

interface LineOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LineOptions = (props: LineOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const [sIsMarkLine, setIsMarkLine] = useState<boolean>(pPanelOption.lineChartOptions?.markLine.data.length > 0 ?? false);
    const [sMarkLineList, setMarkLineList] = useState<{ xAxis: number }[]>(pPanelOption.lineChartOptions?.markLine.data ?? []);

    const handleLineOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                lineChartOptions: {
                    ...prev.lineChartOptions,
                    [aKey]: aIsCheckbox ? aEvent.target.checked : aEvent.target.value,
                },
            };
        });
    };

    const addMarkLine = () => {
        const sNewMarkLine = { xAxis: 0 };
        const sCopyMarkLineList = JSON.parse(JSON.stringify(sMarkLineList));
        sCopyMarkLineList.push(sNewMarkLine);
        sCopyMarkLineList.push(sNewMarkLine);
        setMarkLineList(sCopyMarkLineList);
    };

    const removeMarkLine = (aIndex: number) => {
        const sCopyMarkLineList = JSON.parse(JSON.stringify(sMarkLineList));
        sCopyMarkLineList.splice(aIndex * 2, 2);
        setMarkLineList(sCopyMarkLineList);
    };

    const handleMarklineOption = (aData: any) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                lineChartOptions: {
                    ...prev.lineChartOptions,
                    markLine: {
                        ...prev.lineChartOptions?.markLine,
                        data: aData,
                    },
                },
            };
        });
    };

    const showMarkLine = () => {
        setIsMarkLine(!sIsMarkLine);
        if (!sIsMarkLine) {
            const sInitValue = isEmpty(pPanelOption.lineChartOptions?.markLine.data) ? [{ xAxis: 0 }, { xAxis: 0 }] : pPanelOption.lineChartOptions?.markLine.data;
            setMarkLineList(sInitValue);
        } else {
            setMarkLineList([]);
        }
    };

    useEffect(() => {
        handleMarklineOption(sMarkLineList);
    }, [sMarkLineList]);

    return (
        <div>
            <CheckBox pText="Area" pDefaultChecked={pPanelOption.lineChartOptions?.areaStyle ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'areaStyle', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Smooth" pDefaultChecked={pPanelOption.lineChartOptions?.smooth ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'smooth', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Step" pDefaultChecked={pPanelOption.lineChartOptions?.isStep ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'isStep', true)} />
            <div className="divider" />
            <Collapse title="marking option">
                <CheckBox pText="MarkLine" pDefaultChecked={sIsMarkLine} onChange={showMarkLine} />
                {sIsMarkLine &&
                    sMarkLineList
                        .filter((_, aIndex) => aIndex % 2 === 0)
                        .map((_, aIndex) => (
                            <MarkLineOption
                                pKey={aIndex}
                                pIndex={aIndex}
                                pMarkList={sMarkLineList}
                                pSetMarkList={setMarkLineList}
                                pHandleFunction={aIndex === 0 ? addMarkLine : () => removeMarkLine(aIndex)}
                            />
                        ))}
            </Collapse>
        </div>
    );
};
