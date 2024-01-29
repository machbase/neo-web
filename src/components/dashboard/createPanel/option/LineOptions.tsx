import { useEffect, useState } from 'react';
import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
import { MarkLineOption } from './MarkLineOption';
import { isEmpty } from '@/utils';
import { Select } from '@/components/inputs/Select';
import { ChartLineSymbolList } from '@/utils/constants';

interface LineOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LineOptions = (props: LineOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    const [sIsMarkLine, setIsMarkLine] = useState<boolean>(pPanelOption.chartOptions?.markLine.data.length > 0 ?? false);
    const [sMarkLineList, setMarkLineList] = useState<{ xAxis: number }[]>(pPanelOption.chartOptions?.markLine.data ?? []);

    const handleLineOption = (aEvent: any, aKey: any, aIsCheckbox: boolean) => {
        pSetPanelOption((prev: any) => {
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
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
                chartOptions: {
                    ...prev.chartOptions,
                    markLine: {
                        ...prev.chartOptions?.markLine,
                        data: aData,
                    },
                },
            };
        });
    };

    const showMarkLine = () => {
        setIsMarkLine(!sIsMarkLine);
        if (!sIsMarkLine) {
            const sInitValue = isEmpty(pPanelOption.chartOptions?.markLine.data) ? [{ xAxis: 0 }, { xAxis: 0 }] : pPanelOption.chartOptions?.markLine.data;
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
            <CheckBox
                pText="Fill Area Style"
                pDefaultChecked={pPanelOption.chartOptions?.areaStyle ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'areaStyle', true)}
            />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Smooth Line" pDefaultChecked={pPanelOption.chartOptions?.smooth ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'smooth', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Step Line" pDefaultChecked={pPanelOption.chartOptions?.isStep ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'isStep', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Stack Mode" pDefaultChecked={pPanelOption.chartOptions?.isStack ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'isStack', true)} />
            <div style={{ height: '10px' }} />
            <div className="menu-style">
                <span>Symbol</span>
                <Select
                    pFontSize={12}
                    pWidth={100}
                    pBorderRadius={4}
                    pInitValue={pPanelOption.chartOptions?.symbol}
                    pHeight={25}
                    onChange={(aEvent: any) => handleLineOption(aEvent, 'symbol', false)}
                    pOptions={ChartLineSymbolList}
                />
            </div>
            <div className="divider" />
            <Collapse title="marking option" isOpen={sIsMarkLine}>
                <CheckBox pText="Set MarkLine" pDefaultChecked={sIsMarkLine} onChange={showMarkLine} />
                {sIsMarkLine &&
                    sMarkLineList
                        .filter((_, aIndex) => aIndex % 2 === 0)
                        .map((_, aIndex) => (
                            <div key={aIndex}>
                                <MarkLineOption
                                    pIndex={aIndex}
                                    pMarkList={sMarkLineList}
                                    pSetMarkList={setMarkLineList}
                                    pHandleFunction={aIndex === 0 ? addMarkLine : () => removeMarkLine(aIndex)}
                                />
                            </div>
                        ))}
            </Collapse>
        </div>
    );
};
