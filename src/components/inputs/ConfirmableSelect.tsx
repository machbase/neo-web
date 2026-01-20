import { useState } from 'react';
import { Dropdown, type DropdownOption } from '@/design-system/components';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Tooltip } from 'react-tooltip';

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
        pNoneValue,
        pIsDisabled = false,
        pOptions,
        pIsFullWidth = false,
        pValue = '',
        onChange,
        pIsToolTip = false,
        pConfirmTrigger,
        pConfirmMessage,
        pUseConfirmRule,
    } = props;

    const [pendingValue, setPendingValue] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [pendingIdx, setPendingIdx] = useState<number>(-1);

    // Convert string options to DropdownOption format
    const dropdownOptions: DropdownOption[] = pOptions.map((option) => ({
        label: option,
        value: option,
    }));

    const handleSelect = (value: string) => {
        const idx = pOptions.indexOf(value);

        if (pUseConfirmRule && pConfirmTrigger === value) {
            setPendingValue(value);
            setPendingIdx(idx);
            setIsConfirmModalOpen(true);
            return;
        }
        executeChange(value, idx);
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

    return (
        <>
            <Dropdown.Root
                options={dropdownOptions}
                value={pValue}
                onChange={handleSelect}
                placeholder="Select..."
                disabled={pIsDisabled}
                fullWidth={pIsFullWidth}
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List>
                        {(option, index) =>
                            pIsToolTip ? (
                                <Dropdown.Option key={option.value} option={option} index={index}>
                                    <span className={`select-tooltip-${index}`} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <Tooltip anchorSelect={`.select-tooltip-${index}`} content={option.label} />
                                        {option.label}
                                    </span>
                                </Dropdown.Option>
                            ) : (
                                <Dropdown.Option key={option.value} option={option} index={index} />
                            )
                        }
                    </Dropdown.List>
                </Dropdown.Menu>
            </Dropdown.Root>

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
