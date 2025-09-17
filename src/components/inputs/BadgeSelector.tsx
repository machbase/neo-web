import './BadgeSelector.scss';
import { useRef, useState, useCallback } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import { ArrowDown } from '@/assets/icons/Icon';
import { Tooltip } from 'react-tooltip';

export type BadgeSelectorItemType = {
    name: string;
    color: string;
    idx: number;
    label?: string;
};

type BadgeSelectorItemProps = {
    pSelectedList: number[];
    pList: BadgeSelectorItemType[] | [];
    pCallback: (item: BadgeSelectorItemType) => void;
};
const BadgeSelectorItem = ({ item }: { item: BadgeSelectorItemType }) => {
    return (
        <div className="badge-selector-item" style={{ boxShadow: `inset 4px 0 0 0  ${item.color}` }}>
            {item.label ? (
                <div className="badge-selector-label" style={{ backgroundColor: item.color }}>
                    {item.label}
                </div>
            ) : null}
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
    const handleClick = (aItem: BadgeSelectorItemType) => {
        pCallback(aItem);
        setIsOpen(false);
    };

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
                            <div key={aIdx + ''}>
                                <button
                                    className={`badge-select-tooltip-${aIdx + ''} badge-selector-list-box-item${
                                        pSelectedList?.includes(aItem.idx) ? ' badge-selector-active-item' : ''
                                    }`}
                                    onClick={() => handleClick(aItem)}
                                    style={{ boxShadow: `inset 4px 0 0 0 ${aItem.color}` }}
                                >
                                    {aItem.label ? (
                                        <div className="badge-selector-label" style={{ backgroundColor: aItem.color }}>
                                            {aItem.label}
                                        </div>
                                    ) : null}
                                    <span className="badge-selector-list-box-item-text">{aItem.name}</span>
                                </button>
                                <Tooltip anchorSelect={`.badge-select-tooltip-${aIdx + ''}`} content={aItem.name} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
