import { useState, useRef, useEffect } from 'react';
import './InputSelector.scss';
import { ArrowDown } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Tooltip } from 'react-tooltip';

export interface SelectProps {
    pOptions: string[];
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    pWidth?: number | string;
    pHeight?: number;
    pIsFullWidth?: boolean;
    pBorderRadius?: number;
    pInitValue?: string;
    pFontSize?: number;
    pIsDisabled?: boolean;
    pAutoChanged?: boolean;
    pNoneValue?: string;
}

export const InputSelector = (props: SelectProps) => {
    const {
        pWidth = 120,
        pNoneValue,
        pAutoChanged = false,
        pIsDisabled = false,
        pFontSize = 13,
        pHeight = 40,
        pOptions,
        pIsFullWidth = false,
        pBorderRadius = 8,
        pInitValue = '',
        onChange,
    } = props;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [sValue, setValue] = useState<string>(pInitValue);
    const [sHoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const optionRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);

    const handleSelect = (aValue: string, aEventName: 'customSelect' | 'customInput') => {
        if (pNoneValue && pNoneValue === aValue) setValue('');
        else setValue(aValue);
        setIsOpen(false);

        const changeEvent = {
            target: {
                value: aValue,
                name: aEventName,
            },
        };
        onChange(changeEvent as any);
    };
    const handleClick = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (pIsDisabled) return;
        aEvent.stopPropagation();
        setIsOpen(!isOpen);
    };

    useOutsideClick(optionRef, () => setIsOpen(false));
    useEffect(() => {
        setValue(pInitValue);
    }, [pInitValue]);
    useEffect(() => {
        if (isMounted.current) {
            pAutoChanged && setValue(pOptions[0]);
        } else {
            isMounted.current = true;
        }
    }, [pOptions[0]]);

    return (
        <div
            className="custom-input-selector-wrapper"
            style={{
                borderRadius: pBorderRadius + 'px',
                width: pIsFullWidth ? '100%' : typeof pWidth === 'string' ? pWidth : pWidth + 'px',
                minWidth: pIsFullWidth ? '100%' : pWidth + 'px',
                height: pHeight + 'px',
                opacity: pIsDisabled ? 0.6 : 1,
            }}
        >
            <div className="select-input">
                <input
                    value={sValue}
                    disabled={pIsDisabled}
                    style={{ fontSize: pFontSize }}
                    placeholder="Select..."
                    onChange={(e) => handleSelect(e.target.value, 'customInput')}
                />
                <div className="select-input-svg" onClick={handleClick}>
                    <ArrowDown />
                </div>
            </div>
            <div
                ref={optionRef}
                className="select-options"
                style={{ display: isOpen ? 'block' : 'none', maxHeight: pHeight * 5 + 'px', borderRadius: pBorderRadius + 'px' }}
                onClick={(aEvent) => aEvent.stopPropagation()}
            >
                <div className="select-options-item-wrapper scrollbar-dark" style={{ maxHeight: pHeight * 4 + 'px' }}>
                    {pOptions.map((aOption: string, aIdx) => (
                        <button
                            key={aIdx}
                            className={`select-tooltip-${aIdx} options-item`}
                            onClick={() => handleSelect(aOption, 'customSelect')}
                            onMouseEnter={() => setHoveredIdx(aIdx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            style={{ fontSize: pFontSize }}
                        >
                            {sHoveredIdx === aIdx && <Tooltip anchorSelect={`.select-tooltip-${aIdx}`} content={aOption} positionStrategy="fixed" />}
                            <div className="select-text">{aOption}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
