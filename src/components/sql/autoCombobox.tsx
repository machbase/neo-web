import { useState, useEffect, useRef } from 'react';
import './autoCombobox.scss';

const AUTOCOMBOBOX = ({ pName, pList, pTarget, pCallback }: { pName: string; pList: any; pTarget: any; pCallback: (aTargetTxt: string) => void }) => {
    const [sShowList, setShowList] = useState(pList);
    const [sIsShow, setIsShow] = useState<boolean>(false);
    const [sFilterTxt, setFilterTxt] = useState<string>('');
    const [sItemIdx, setItemIdx] = useState<number>(0);
    const comboboxRef = useRef<any>(null);

    const onSetTxt = (aSelectedItem: string) => {
        pCallback(aSelectedItem);
        setIsShow(false);
    };

    const getTargetTxt = (aTarget: any) => {
        let returnValue = '';
        pList.map((aItem: any, aIdx: number) => {
            if (aItem.id === aTarget) {
                setIdx(aIdx);
                returnValue = aItem.name;
            }
        });
        return returnValue;
    };

    const setIdx = (aIdx: number) => {
        setItemIdx(aIdx);
    };

    const onFilter = (aFilterTxt: string) => {
        setIdx(0);
        if (aFilterTxt === '') setShowList(pList);
        else {
            const result = pList.filter((aItem: any) => aItem.name.toUpperCase().includes(aFilterTxt.toUpperCase()));
            result.length ? setShowList(result) : setShowList(pList);
        }
    };

    const onTypingTxt = (e: any) => {
        setIsShow(true);
        setFilterTxt(e.target.value);
        onFilter(e.target.value);
    };

    const onOpenContent = () => {
        setIsShow(true);
        setShowList(pList);
    };

    useEffect(() => {
        const handleClick = (e: any) => {
            if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node) && e.target && e.target.className !== `combo-box-header-${pName}`) {
                setIsShow(false);
            }
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [comboboxRef]);

    useEffect(() => {
        setFilterTxt(getTargetTxt(pTarget));
    }, [pTarget]);

    const handleKeyDown = (e: any) => {
        if (e.keyCode === 40) {
            const pLen = sShowList.length;
            comboboxRef.current.children[pLen === sItemIdx + 1 ? pLen - 1 : sItemIdx + 1].focus();
            comboboxRef.current.scrollTo(0, 18 * sItemIdx - 260);
            setItemIdx(pLen === sItemIdx + 1 ? pLen - 1 : sItemIdx + 1);
            e.preventDefault();
        }
        if (e.keyCode === 38) {
            comboboxRef.current.children[sItemIdx === 0 ? 0 : sItemIdx - 1].focus();
            comboboxRef.current.scrollTo(0, 18 * sItemIdx - 260);
            setItemIdx(sItemIdx === 0 ? 0 : sItemIdx - 1);
            e.preventDefault();
        }
        if (e.keyCode === 13) {
            onSetTxt(sShowList[sItemIdx].id);
            e.preventDefault();
        }
    };

    return (
        <div className="auto-combo-box-wraper">
            <div className="combo-box-header-wrapper" onClick={() => onOpenContent()} onKeyDown={handleKeyDown}>
                <input className={`combo-box-header-${pName} combo-box-header`} value={sFilterTxt} onChange={onTypingTxt} />
            </div>
            {!sIsShow || (
                <div ref={comboboxRef} className={'combo-box-list'} onKeyDown={handleKeyDown}>
                    {sShowList.map((aItem: any, aIdx: number) => {
                        return (
                            <div
                                key={aIdx}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSetTxt(aItem.id)}
                                className={aItem.id === pTarget || aIdx === sItemIdx ? 'selected-combo-item combo-item' : 'combo-item'}
                            >
                                {aItem.name}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AUTOCOMBOBOX;
