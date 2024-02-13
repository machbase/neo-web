// import { useEffect, useState } from 'react';
// import { Collapse } from '@/components/collapse/Collapse';
import CheckBox from '@/components/inputs/CheckBox';
// import { MarkLineOption } from './MarkLineOption';
// import { isEmpty } from '@/utils';
import { Select } from '@/components/inputs/Select';
import { ChartLineSymbolList } from '@/utils/constants';
import { Input } from '@/components/inputs/Input';

interface LineOptionProps {
    pPanelOption: any;
    pSetPanelOption: any;
}

export const LineOptions = (props: LineOptionProps) => {
    const { pPanelOption, pSetPanelOption } = props;
    // const [sIsMarkLine, setIsMarkLine] = useState<boolean>(pPanelOption.chartOptions?.markLine.data.length > 0 ?? false);
    // const [sMarkLineList, setMarkLineList] = useState<{ xAxis: number }[]>(pPanelOption.chartOptions?.markLine.data ?? []);

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

    const handleSymbolCheckbox = (aEvent: any) => {
        handleLineOption(aEvent, 'isSymbol', true);
        if (!aEvent.target.checked) {
            pSetPanelOption((aPrev: any) => {
                return {
                    ...aPrev,
                    chartOptions: {
                        ...aPrev.chartOptions,
                        symbol: 'none',
                    },
                };
            });
        }
    };

    // const addMarkLine = () => {
    //     const sNewMarkLine = { xAxis: 0 };
    //     const sCopyMarkLineList = JSON.parse(JSON.stringify(sMarkLineList));
    //     sCopyMarkLineList.push(sNewMarkLine);
    //     sCopyMarkLineList.push(sNewMarkLine);
    //     setMarkLineList(sCopyMarkLineList);
    // };

    // const removeMarkLine = (aIndex: number) => {
    //     const sCopyMarkLineList = JSON.parse(JSON.stringify(sMarkLineList));
    //     sCopyMarkLineList.splice(aIndex * 2, 2);
    //     setMarkLineList(sCopyMarkLineList);
    // };

    // const handleMarklineOption = (aData: any) => {
    //     pSetPanelOption((prev: any) => {
    //         return {
    //             ...prev,
    //             chartOptions: {
    //                 ...prev.chartOptions,
    //                 markLine: {
    //                     ...prev.chartOptions?.markLine,
    //                     data: aData,
    //                 },
    //             },
    //         };
    //     });
    // };

    // const showMarkLine = () => {
    //     setIsMarkLine(!sIsMarkLine);
    //     if (!sIsMarkLine) {
    //         const sInitValue = isEmpty(pPanelOption.chartOptions?.markLine.data) ? [{ xAxis: 0 }, { xAxis: 0 }] : pPanelOption.chartOptions?.markLine.data;
    //         setMarkLineList(sInitValue);
    //     } else {
    //         setMarkLineList([]);
    //     }
    // };

    // useEffect(() => {
    //     handleMarklineOption(sMarkLineList);
    // }, [sMarkLineList]);

    return (
        <div>
            <CheckBox pText="Fill area" pDefaultChecked={pPanelOption.chartOptions?.areaStyle ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'areaStyle', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Smooth line" pDefaultChecked={pPanelOption.chartOptions?.smooth ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'smooth', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Step line" pDefaultChecked={pPanelOption.chartOptions?.isStep ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'isStep', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox pText="Stack mode" pDefaultChecked={pPanelOption.chartOptions?.isStack ?? false} onChange={(aEvent: any) => handleLineOption(aEvent, 'isStack', true)} />
            <div style={{ height: '10px' }} />
            <CheckBox
                pText="Large data mode"
                pDefaultChecked={pPanelOption.chartOptions?.isSampling ?? false}
                onChange={(aEvent: any) => handleLineOption(aEvent, 'isSampling', true)}
            />
            <div className="divider" />
            <CheckBox pText="Symbol" pDefaultChecked={pPanelOption.chartOptions?.isSymbol ?? true} onChange={(aEvent: any) => handleSymbolCheckbox(aEvent)} />
            <div style={{ height: '10px' }} />
            <div className="menu-style">
                <span>Type</span>
                <Select
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pFontSize={12}
                    pInitValue={pPanelOption.chartOptions?.symbol}
                    pIsDisabled={!pPanelOption.chartOptions?.isSymbol}
                    onChange={(aEvent: any) => handleLineOption(aEvent, 'symbol', false)}
                    pOptions={ChartLineSymbolList}
                />
            </div>
            <div className="menu-style">
                <span>Size</span>
                <Input
                    pWidth={100}
                    pHeight={25}
                    pBorderRadius={4}
                    pIsDisabled={pPanelOption.chartOptions?.symbol === 'none' || !pPanelOption.chartOptions?.isSymbol}
                    pValue={pPanelOption.chartOptions?.symbolSize}
                    onChange={(aEvent: any) => handleLineOption(aEvent, 'symbolSize', false)}
                />
            </div>
            {/* <div className="divider" />
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
            </Collapse> */}
        </div>
    );
};
