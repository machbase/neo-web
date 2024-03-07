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
    pMin?: number;
    pMax?: number;
    pAutoFocus?: boolean;
    pPlaceHolder?: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export const Input = (props: InputProps) => {
    const { pWidth, pBorderRadius, pHeight, pIsFullWidth, pValue, pSetValue, pAutoFocus, pType, pIsDisabled, pPlaceHolder, pMin = undefined, pMax = undefined, onChange } = props;

    const handleChange = (aEvent: React.ChangeEvent<HTMLInputElement>) => {
        if (pType === 'number') {
            if (pMin !== undefined && Number(aEvent.target.value) < pMin) aEvent.target.value = pMin.toString();
            if (pMax !== undefined && Number(aEvent.target.value) > pMax) aEvent.target.value = pMax.toString();
        }
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
            <input placeholder={pPlaceHolder ?? ''} type={pType} value={pValue} onChange={handleChange} disabled={pIsDisabled} autoFocus={pAutoFocus} />
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
    pAutoFocus: false,
};
