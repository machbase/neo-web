import { useState, useRef, useEffect } from 'react';
import './Select.scss';
import { ArrowDown } from '../../assets/icons/Icon';
import useOutsideClick from '../../hooks/useOutsideClick';
import { Tooltip } from 'react-tooltip';

export interface SelectProps {
    pOptions: string[];
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    pIsReadonly?: boolean;
    pWidth?: number | string;
    pHeight?: number;
    pIsFullWidth?: boolean;
    pBorderRadius?: number;
    pInitValue?: string;
    pFontSize?: number;
    pIsDisabled?: boolean;
    pAutoChanged?: boolean;
    pNoneValue?: string;
    pIsToolTip?: boolean;
}

export const Select = (props: SelectProps) => {
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
        pIsReadonly = true,
        pInitValue = '',
        onChange,
        pIsToolTip = false,
    } = props;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectValue, setSelectValue] = useState<string>(pInitValue);
    const optionRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(false);
    const handleSelect = (aValue: string, idx: number) => {
        if (pNoneValue && pNoneValue === aValue) setSelectValue('');
        else setSelectValue(aValue);
        setIsOpen(false);

        const changeEvent = {
            target: {
                value: aValue,
                name: 'customSelect',
                idx: idx,
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
        setSelectValue(pInitValue);
    }, [pInitValue]);

    useEffect(() => {
        if (isMounted.current) {
            pAutoChanged && setSelectValue(pOptions[0]);
        } else {
            isMounted.current = true;
        }
    }, [pOptions[0]]);
    return (
        <div
            className="custom-select-wrapper"
            style={{
                borderRadius: pBorderRadius + 'px',
                width: pIsFullWidth ? '100%' : typeof pWidth === 'string' ? pWidth : pWidth + 'px',
                minWidth: pIsFullWidth ? '100%' : pWidth + 'px',
                height: pHeight + 'px',
                opacity: pIsDisabled ? 0.6 : 1,
                cursor: pIsDisabled ? 'default' : 'pointer',
            }}
        >
            <div className="select-input" onClick={handleClick}>
                <input disabled={pIsDisabled} readOnly={pIsReadonly} value={selectValue} style={{ fontSize: pFontSize, cursor: 'inherit' }} placeholder="Select..." />
                <ArrowDown />
            </div>
            <div
                ref={optionRef}
                className="select-options"
                style={{ display: isOpen ? 'block' : 'none', maxHeight: pHeight * 5 + 'px', borderRadius: pBorderRadius + 'px' }}
                onClick={(aEvent) => aEvent.stopPropagation()}
            >
                <div className="select-options-item-wrapper" style={{ maxHeight: pHeight * 4 + 'px' }}>
                    {!pIsToolTip &&
                        pOptions.map((aOption: string, aIdx) => (
                            <div key={aOption + aIdx} className="options-item" onClick={() => handleSelect(aOption, aIdx)} style={{ fontSize: pFontSize }}>
                                {aOption}
                            </div>
                        ))}
                    {pIsToolTip &&
                        pOptions.map((aOption: string, aIdx) => (
                            <button key={aIdx} className={`select-tooltip-${aIdx} options-item`} onClick={() => handleSelect(aOption, aIdx)} style={{ fontSize: pFontSize }}>
                                <Tooltip anchorSelect={`.select-tooltip-${aIdx}`} content={aOption} />
                                <div className="select-text">{aOption}</div>
                            </button>
                        ))}
                </div>
            </div>
        </div>
    );
};
