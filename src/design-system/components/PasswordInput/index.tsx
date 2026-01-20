import { useState, forwardRef } from 'react';
import { Input, InputProps } from '../Input';
import { Button } from '../Button';
import { VscEye, VscEyeClosed } from 'react-icons/vsc';
import styles from './index.module.scss';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
    defaultVisible?: boolean;
    onVisibilityChange?: (visible: boolean) => void;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ defaultVisible = false, onVisibilityChange, className, ...inputProps }, ref) => {
    const [isVisible, setIsVisible] = useState(defaultVisible);

    const handleToggle = () => {
        const newVisibility = !isVisible;
        setIsVisible(newVisibility);
        onVisibilityChange?.(newVisibility);
    };

    return (
        <Input
            {...inputProps}
            ref={ref}
            type={isVisible ? 'text' : 'password'}
            className={className}
            rightIcon={
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleToggle}
                    icon={isVisible ? <VscEye size={14} /> : <VscEyeClosed size={14} />}
                    className={styles['password-input__toggle']}
                    tabIndex={-1}
                    aria-label={isVisible ? 'Hide password' : 'Show password'}
                />
            }
        />
    );
});

PasswordInput.displayName = 'PasswordInput';
