import './Input.scss';

export interface InputProps {
    pWidth: number | string;
    pHeight: number;
    pValue?: string;
    pSetValue?: React.Dispatch<React.SetStateAction<string>>;
    pType: 'text' | 'number';
    pIsFullWidth: boolean;
    pBorderRadius: number;
    pIsDisabled: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export const Input = (props: InputProps) => {
    const { pWidth, pBorderRadius, pHeight, pIsFullWidth, pValue, pSetValue, pType, pIsDisabled, onChange } = props;

    const handleChange = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        pSetValue && pSetValue(aEvent.target.value);
        onChange(aEvent);
    };

    return (
        <div
            className="custom-input-wrapper"
            style={{
                width: pIsFullWidth ? '100%' : typeof pWidth === 'string' ? pWidth : pWidth + 'px',
                height: pHeight + 'px',
                opacity: pIsDisabled ? '0.6' : '',
                borderRadius: pBorderRadius + 'px',
            }}
        >
            <input type={pType} value={pValue} onChange={handleChange} disabled={pIsDisabled} />
        </div>
    );
};

Input.defaultProps = {
    pWidth: 200,
    pHeight: 40,
    pType: 'text',
    pIsFullWidth: false,
    pIsDisabled: false,
    pBorderRadius: 8,
};
