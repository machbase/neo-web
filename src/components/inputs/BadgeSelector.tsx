import './BadgeSelector.scss';
import React, { useRef, useState, useCallback } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { ArrowDown } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';

export type BadgeSelectorItemType = {
    name: string;
    color: string;
    idx: number;
};

type BadgeSelectorItemProps = {
    pSelectedList: number[];
    pList: BadgeSelectorItemType[] | [];
    pCallback: (item: BadgeSelectorItemType) => void;
};
const BadgeSelectorItem: React.FC<{ item: BadgeSelectorItemType }> = ({ item }) => {
    return (
        <div className="badge-selector-item" style={{ boxShadow: `inset 4px 0 0 0  ${item.color}` }}>
            <span>{item.name}</span>
        </div>
    );
};

export const BadgeSelect = ({ pSelectedList, pList, pCallback }: BadgeSelectorItemProps) => {
    const SelectorRef = useRef<any>(null);
    const [sIsOpen, setIsOpen] = useState<boolean>(false);

    const handleOutSideClick = useCallback(() => {
        setIsOpen(false);
    }, []);

    useOutsideClick(SelectorRef, () => sIsOpen && handleOutSideClick());

    return (
        <div ref={SelectorRef} className="badge-selector">
            <div className="badge-selector-selected-box" onClick={() => setIsOpen(!sIsOpen)}>
                <div className="badge-selector-selected-items">
                    {pList?.map((aItem: BadgeSelectorItemType, idx: number) => {
                        return pSelectedList && pSelectedList?.includes(aItem?.idx) ? (
                            <BadgeSelectorItem key={aItem.name + aItem.idx.toString() + idx.toString()} item={aItem} />
                        ) : null;
                    })}
                </div>
                <ArrowDown />
            </div>
            {sIsOpen && (
                <div className="badge-selector-list">
                    <div className="badge-selector-list-box">
                        {pList?.map((aItem, aIdx) => (
                            <button
                                key={aIdx}
                                className={`select-tooltip-${aIdx} badge-selector-list-box-item${pSelectedList?.includes(aItem.idx) ? ' badge-selector-active-item' : ''}`}
                                onClick={() => pCallback(aItem)}
                                style={{ boxShadow: `inset 4px 0 0 0 ${aItem.color}` }}
                            >
                                <Tooltip anchorSelect={`.select-tooltip-${aIdx}`} content={aItem.name} />
                                <span className="badge-selector-list-box-item-text">{aItem.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
