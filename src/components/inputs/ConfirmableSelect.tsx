import './Select.scss';
import { useState, useRef } from 'react';
import { ArrowDown } from '@/assets/icons/Icon';
import useOutsideClick from '@/hooks/useOutsideClick';
import { Tooltip } from 'react-tooltip';
import { ConfirmModal } from '@/components/modal/ConfirmModal';

export interface ConfirmableSelectProps {
    pOptions: string[];
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    pConfirmMessage: string;
    pConfirmTrigger: string;
    pUseConfirmRule: boolean;
    pIsReadonly?: boolean;
    pWidth?: number | string;
    pHeight?: number;
    pIsFullWidth?: boolean;
    pBorderRadius?: number;
    pValue?: string;
    pFontSize?: number;
    pIsDisabled?: boolean;
    pNoneValue?: string;
    pIsToolTip?: boolean;
}

export const ConfirmableSelect = (props: ConfirmableSelectProps) => {
    const {
        pWidth = 120,
        pNoneValue,
        pIsDisabled = false,
        pFontSize = 13,
        pHeight = 40,
        pOptions,
        pIsFullWidth = false,
        pBorderRadius = 8,
        pIsReadonly = true,
        pValue = '',
        onChange,
        pIsToolTip = false,
        pConfirmTrigger,
        pConfirmMessage,
        pUseConfirmRule,
    } = props;

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const [pendingValue, setPendingValue] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [pendingIdx, setPendingIdx] = useState<number>(-1);
    const optionRef = useRef<HTMLDivElement>(null);

    const handleSelect = (aValue: string, idx: number) => {
        setIsOpen(false);
        if (pUseConfirmRule && pConfirmTrigger === aValue) {
            setPendingValue(aValue);
            setPendingIdx(idx);
            setIsConfirmModalOpen(true);
            return;
        }
        executeChange(aValue, idx);
    };

    const executeChange = (aValue: string, idx: number) => {
        const finalValue = pNoneValue && pNoneValue === aValue ? '' : aValue;

        const changeEvent = {
            target: {
                value: finalValue,
                name: 'customSelect',
                idx: idx,
            },
        };
        onChange(changeEvent as any);
    };

    const handleConfirm = () => {
        executeChange(pendingValue, pendingIdx);
        setIsConfirmModalOpen(false);
        setPendingValue('');
        setPendingIdx(-1);
    };

    const handleClick = (aEvent: React.MouseEvent<HTMLDivElement>) => {
        if (pIsDisabled) return;
        aEvent.stopPropagation();
        setIsOpen(!isOpen);
    };

    useOutsideClick(optionRef, () => setIsOpen(false));

    return (
        <>
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
                    <input disabled={pIsDisabled} readOnly={pIsReadonly} value={pValue} style={{ fontSize: pFontSize, cursor: 'inherit' }} placeholder="Select..." />
                    <ArrowDown />
                </div>
                <div
                    ref={optionRef}
                    className="select-options"
                    style={{ display: isOpen ? 'block' : 'none', maxHeight: pHeight * 5 + 'px', borderRadius: pBorderRadius + 'px' }}
                    onClick={(aEvent) => aEvent.stopPropagation()}
                >
                    <div className="select-options-item-wrapper scrollbar-dark" style={{ maxHeight: pHeight * 4 + 'px' }}>
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

            {/* Confirm Modal */}
            {isConfirmModalOpen && (
                <ConfirmModal
                    pIsDarkMode
                    setIsOpen={setIsConfirmModalOpen}
                    pCallback={handleConfirm}
                    pContents={
                        <div className="body-content">
                            <span>{pConfirmMessage}</span>
                        </div>
                    }
                />
            )}
        </>
    );
};
