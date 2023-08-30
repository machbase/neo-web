import './Input.scss';

export interface InputProps {
    pWidth: number;
    pHeight: number;
    pValue: string;
    pSetValue: React.Dispatch<React.SetStateAction<string>>;
    pType: 'text' | 'number';
    pIsFullWidth: boolean;
    pIsDisabled: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export const Input = (props: InputProps) => {
    const { pWidth, pHeight, pIsFullWidth, pValue, pSetValue, pType, pIsDisabled, onChange } = props;

    const handleChange = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        pSetValue(aEvent.target.value);
        onChange(aEvent);
    };

    return (
        <div className="custom-input-wrapper" style={{ width: pIsFullWidth ? '100%' : pWidth + 'px', height: pHeight + 'px', opacity: pIsDisabled ? '0.6' : '' }}>
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
};
