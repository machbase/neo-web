import { Search, Cancel } from '@/assets/icons/Icon';
import { useState } from 'react';
import useDebounce from '@/hooks/useDebounce';
import './Input.scss';

export interface SearchInputProps {
    pWidth: number;
    pHeight: number;
    pClickStopPropagation: boolean;
    onChange: (value: string) => void;
}

export const SearchInput = (props: SearchInputProps) => {
    const { pWidth, pHeight, pClickStopPropagation, onChange } = props;
    const [sValue, setValue] = useState<string>('');
    const [sIsExpand, setIsExpand] = useState<boolean>(false);

    const handleClose = () => {
        setValue('');
        setIsExpand(false);
    };

    const handleChange = () => {
        if (sIsExpand) onChange(sValue);
    };

    useDebounce([sValue], handleChange, 300);

    return (
        <div onClick={(e) => (pClickStopPropagation ? e.stopPropagation() : null)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {sIsExpand ? (
                <div className="custom-input-wrapper" style={{ width: pWidth + 'px', height: pHeight + 'px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <input type={'text'} value={sValue} onChange={(e) => setValue(e.target.value)} />
                    <Cancel onClick={handleClose} />
                </div>
            ) : (
                <Search onClick={() => setIsExpand(true)} />
            )}
        </div>
    );
};

SearchInput.defaultProps = {
    pWidth: 120,
    pHeight: 20,
    pClickStopPropagation: true,
};
