import './MultiSelector.scss';
import React, { useRef, useState, useMemo, useCallback } from 'react';
import { ArrowDown } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Tooltip } from 'react-tooltip';
import { getChartSeriesName } from '@/utils/dashboardUtil';

interface MultiSelectorItemProps {
    item: { name: string; color: string; idx: number };
}
const MultiSelectorItem: React.FC<MultiSelectorItemProps> = ({ item }) => {
    return (
        <div className="multi-selector-item" style={{ boxShadow: `inset 4px 0 0 0  ${item.color}` }}>
            <span>{item.name}</span>
        </div>
    );
};

export const MultipleSelect = ({ pPanelOption, pSetBlockList }: { pPanelOption: any; pSetBlockList: any }) => {
    const multiSelectorRef = useRef<any>(null);
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const getBlockList = useMemo((): any[] => {
        return (
            pPanelOption?.blockList?.map((block: any, idx: number) => ({
                name: block.customFullTyping.use
                    ? 'custom'
                    : getChartSeriesName({
                          alias: block?.useCustom ? block?.values[0]?.alias : block?.alias,
                          table: block?.table,
                          column: block?.useCustom ? block?.values[0]?.value : block?.value,
                          aggregator: block?.useCustom ? block?.values[0]?.aggregator : block?.aggregator,
                      }),
                color: block.color,
                idx: idx,
            })) ?? []
        );
    }, [pPanelOption.blockList]);

    const handleOutSideClick = useCallback(() => {
        setIsOpen(false);
    }, []);

    useOutsideClick(multiSelectorRef, () => sIsOpen && handleOutSideClick());

    return (
        <div ref={multiSelectorRef} className="multi-selector">
            <div className="multi-selector-selected-box" onClick={() => setIsOpen(!sIsOpen)}>
                <div className="multi-selector-selected-items">
                    {getBlockList.map((item, bIdx) =>
                        pPanelOption.yAxisOptions[1]?.useBlockList?.includes(bIdx) ? <MultiSelectorItem key={item.name + bIdx.toString()} item={item} /> : null
                    )}
                </div>
                <ArrowDown />
            </div>
            {sIsOpen && (
                <div className="multi-selector-list">
                    <div className="multi-selector-list-box">
                        {getBlockList.map((aOption, aIdx) => (
                            <button
                                key={aIdx}
                                className={`select-tooltip-${aIdx} multi-selector-list-box-item${
                                    pPanelOption.yAxisOptions[1]?.useBlockList?.includes(aIdx) ? ' multi-selector-active-item' : ''
                                }`}
                                onClick={() => pSetBlockList(aIdx)}
                                style={{ boxShadow: `inset 4px 0 0 0 ${aOption.color}` }}
                            >
                                <Tooltip anchorSelect={`.select-tooltip-${aIdx}`} content={aOption.name} />
                                <span className="multi-selector-list-box-item-text">{aOption.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
