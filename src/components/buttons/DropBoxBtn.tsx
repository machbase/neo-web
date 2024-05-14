import { VscArrowSmallDown, VscArrowSmallUp } from 'react-icons/vsc';
import { useRef, useState } from 'react';
import useOutsideClick from '@/hooks/useOutsideClick';
import './DropBoxBtn.scss';

export const DropBoxBtn = ({ pList, pCallback }: { pList: string[]; pCallback: (selectItem: string) => void }) => {
    const [sIsOpen, setIsOpen] = useState<boolean>(false);
    const BoxRef = useRef<any>(null);

    const handleSelect = (aItem: string) => {
        pCallback(aItem);
        setIsOpen(false);
    };

    const handleOutSideClick = () => {
        setIsOpen(false);
    };

    useOutsideClick(BoxRef, () => sIsOpen && handleOutSideClick());

    return (
        <div ref={BoxRef} className="drop-box-btn-wrapper">
            <div className="drop-box-btn-icon">
                <button
                    onClick={(e: any) => {
                        e.stopPropagation();
                        setIsOpen(!sIsOpen);
                    }}
                >
                    {sIsOpen ? <VscArrowSmallUp /> : <VscArrowSmallDown />}
                </button>
            </div>
            {sIsOpen && (
                <div className="drop-box-btn-item-wrapper">
                    {pList &&
                        pList.length > 0 &&
                        pList.map((aItem: string, aIdx: number) => {
                            return (
                                <div key={'drop-box-btn-item-' + aIdx}>
                                    <button onClick={() => handleSelect(aItem)}>{aItem}</button>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};
