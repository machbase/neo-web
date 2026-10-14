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
    /** Test ID of the trigger; options are `option-<encoded value>` inside `menuTestId`. */
    'data-testid'?: string;
    menuTestId?: string;
    confirmTestId?: string;
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
        'data-testid': testId,
        menuTestId,
        confirmTestId,
    } = props;

    const [pendingValue, setPendingValue] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [pendingIdx, setPendingIdx] = useState<number>(-1);
    // The dropdown shows a pick as soon as it is made; a cancelled pick has to be undone by
    // remounting it on the value that stayed.
    const [sDropdownKey, setDropdownKey] = useState<number>(0);

    // Convert string options to DropdownOption format
    const dropdownOptions: DropdownOption[] = pOptions.map((option) => ({
        label: option,
        value: option,
        testId: `option-${encodeURIComponent(option)}`,
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

    const handleConfirmModalOpen = (aIsOpen: boolean) => {
        setIsConfirmModalOpen(aIsOpen);
        if (aIsOpen) return;
        setPendingValue('');
        setPendingIdx(-1);
        setDropdownKey((aKey) => aKey + 1);
    };

    return (
        <>
            <Dropdown.Root
                key={sDropdownKey}
                options={dropdownOptions}
                value={pValue}
                onChange={handleSelect}
                placeholder="Select..."
                disabled={pIsDisabled}
                fullWidth={pIsFullWidth}
            >
                <Dropdown.Trigger data-testid={testId} />
                <Dropdown.Menu data-testid={menuTestId}>
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
                    data-testid={confirmTestId}
                    setIsOpen={handleConfirmModalOpen}
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
