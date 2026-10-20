import controls from '../../../ui/Controls.module.scss';
import styles from '../PanelEditorTab.module.scss';

export function NumberInput({
    value,
    onChange,
    disabled,
    width,
    error,
    placeholder,
    'data-testid': testId,
}: {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    disabled?: boolean;
    width: NumberInputWidth;
    error?: boolean;
    placeholder?: string;
    'data-testid'?: string;
}) {
    const sCharacterCount = Math.max(
        2,
        (value === undefined ? placeholder ?? '' : String(value)).length + 2,
    );

    return (
        <input
            data-testid={testId}
            type="number"
            disabled={disabled}
            value={Number.isFinite(value) ? value : ''}
            placeholder={placeholder}
            aria-invalid={error}
            onChange={(event) =>
                onChange(
                    event.target.value === ''
                        ? undefined
                        : Number(event.target.value),
                )
            }
            className={[controls.input, NUMBER_INPUT_WIDTH_CLASS[width]].filter(Boolean).join(' ')}
            style={
                width === 'auto'
                    ? {
                          width: `calc(${sCharacterCount}ch + 28px)`,
                          minWidth: 48,
                          maxWidth: 180,
                      }
                    : undefined
            }
        />
    );
}

// -------------------- Local --------------------

const NUMBER_INPUT_WIDTH_CLASS = {
    compact: styles.numberInputCompact,
    threshold: styles.numberInputThreshold,
    standard: styles.numberInputStandard,
    auto: undefined,
};

type NumberInputWidth = keyof typeof NUMBER_INPUT_WIDTH_CLASS;
