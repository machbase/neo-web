import { useState, useRef } from 'react';
import './Select.scss';
import { ArrowDown } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';

export interface SelectProps {
    pWidth: number;
    pHeight: number;
    pOptions: string[];
    pIsFullWidth: boolean;
    pIsReadonly: boolean;
    pInitValue: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export const Select = (props: SelectProps) => {
    const { pWidth, pHeight, pOptions, pIsFullWidth, pIsReadonly, pInitValue, onChange } = props;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectValue, setSelectValue] = useState<string>(pInitValue);
    const optionRef = useRef<HTMLDivElement>(null);

    const handleSelect = (aValue: string) => {
        setSelectValue(aValue);
        setIsOpen(false);

        const changeEvent = {
            target: {
                value: aValue,
                name: 'customSelect',
            },
        };
        onChange(changeEvent as any);
    };

    const handleClick = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        aEvent.stopPropagation();
        setIsOpen(!isOpen);
    };

    useOutsideClick(optionRef, () => setIsOpen(false));

    return (
        <div className="custom-select-wrapper" style={{ width: pIsFullWidth ? '100%' : pWidth + 'px', height: pHeight + 'px' }}>
            <div className="select-input" onClick={handleClick}>
                <input readOnly={pIsReadonly} value={selectValue} placeholder="Select..." />
                <ArrowDown />
            </div>
            <div
                ref={optionRef}
                className="select-options"
                style={{ display: isOpen ? 'block' : 'none', maxHeight: pHeight * 5 + 'px' }}
                onClick={(aEvent) => aEvent.stopPropagation()}
            >
                {pOptions.map((aOption: string, aIdx) => (
                    <div key={aOption + aIdx} className="options-item" onClick={() => handleSelect(aOption)}>
                        {aOption}
                    </div>
                ))}
            </div>
        </div>
    );
};

Select.defaultProps = {
    pWidth: 120,
    pHeight: 40,
    pIsFullWidth: false,
    pIsReadonly: true,
    pInitValue: '',
};
