import { generateUUID } from '@/utils';
import './CheckBox.scss';

interface CheckboxProps {
    pText: string;
    onChange: any;
    pDefaultChecked: boolean;
    pIsDisabled?: boolean;
}

const CheckBox = (props: CheckboxProps) => {
    const { pText, onChange, pDefaultChecked, pIsDisabled = false } = props;
    const sId = generateUUID();

    return (
        <div className="checkbox-wrapper" style={{ opacity: pIsDisabled ? 0.3 : 1 }}>
            <input id={sId} disabled={pIsDisabled} defaultChecked={pDefaultChecked} type="checkbox" onChange={onChange} />
            <label htmlFor={sId}>{pText}</label>
        </div>
    );
};
export default CheckBox;
