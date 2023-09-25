import { getId } from '@/utils';
import './CheckBox.scss';

const CheckBox = ({ pText, onChange, pDefaultChecked, pIsDisabled }: any) => {
    const sId = getId();
    return (
        <div className="checkbox-wrapper-13" style={{ opacity: pIsDisabled ? 0.3 : 1 }}>
            <input id={sId + '-13'} disabled={pIsDisabled} defaultChecked={pDefaultChecked} type="checkbox" onChange={onChange} />
            <label htmlFor={sId + '-13'}>{pText}</label>
        </div>
    );
};
export default CheckBox;
