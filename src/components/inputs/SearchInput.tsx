import { Search, Cancel } from '@/assets/icons/Icon';
import { useState, useRef, useEffect } from 'react';
import useDebounce from '@/hooks/useDebounce';
import './Input.scss';

export interface SearchInputProps {
    pWidth: number;
    pHeight: number;
    pClickStopPropagation: boolean;
    pIsExpand: boolean;
    onChange: (value: string) => void;
    onResetFilter: () => void;
    onChangeExpand: (status: boolean) => void;
}

export const SearchInput = (props: SearchInputProps) => {
    const { pWidth, pHeight, pClickStopPropagation, pIsExpand, onChange, onResetFilter, onChangeExpand } = props;
    const [sValue, setValue] = useState<string>('');
    const inputRef = useRef<any>(null);

    const handleClose = () => {
        onResetFilter();
        setValue('');
        onChangeExpand(false);
    };

    const handleChange = () => {
        if (pIsExpand) onChange(sValue);
    };

    useEffect(() => {
        if (inputRef && inputRef.current) {
            inputRef.current.focus();
        }
    }, [pIsExpand]);

    useDebounce([sValue], handleChange, 300);

    return (
        <div onClick={(e) => (pClickStopPropagation ? e.stopPropagation() : null)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {pIsExpand ? (
                <div className="custom-input-wrapper" style={{ width: pWidth + 'px', height: pHeight + 'px', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <input ref={inputRef} type={'text'} value={sValue} onChange={(e) => setValue(e.target.value)} />
                    <Cancel onClick={handleClose} />
                </div>
            ) : (
                <Search onClick={() => onChangeExpand(true)} />
            )}
        </div>
    );
};

SearchInput.defaultProps = {
    pWidth: 120,
    pHeight: 20,
    pClickStopPropagation: true,
};
