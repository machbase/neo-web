import { useState } from 'react';
import { useRef } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';
import { copyShell, removeShell } from '@/api/repository/api';
import ModalShell from './ModalShell';
import { BiSolidDownArrow, Copy, GoPencil, Delete } from '@/assets/icons/Icon';

const ShellMenu = ({ pGetInfo, pInfo, pChangeTabOption, pSetIcon }: any) => {
    const MenuRef = useRef<HTMLDivElement>(null);
    const [menuX, setMenuX] = useState<number>(0);
    const [menuY, setMenuY] = useState<number>(0);
    const [sIsContextMenu, setIsContextMenu] = useState<boolean>(false);
    const [sIsModal, setIsModal] = useState<boolean>(false);
    const onContextMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMenuX(e.pageX);
        setMenuY(e.pageY);
        setIsContextMenu(true);
    };
    const setTerminal = async (aEvent: any, aType: any) => {
        aEvent.stopPropagation();

        if (aType === 'CLONEABLE') {
            const sData: any = await copyShell(pInfo.id);
            if (!sData.response) {
                pGetInfo();
            } else {
                alert('failed');
            }
        } else if (aType === 'REMOVABLE') {
            const sResult: any = await removeShell(pInfo.id);
            if (!sResult.response) {
                pGetInfo();
            } else {
                alert('failed');
            }
        } else if (aType === 'EDITABLE') {
            setIsModal(true);
        }
        setIsContextMenu(false);
    };

    const closeModal = (aEvent: any) => {
        aEvent.stopPropagation();
        setIsContextMenu(false);
    };
    return (
        <div className="home_btn_box">
            <div
                style={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                onClick={(aEvent: any) => pChangeTabOption(aEvent, pInfo)}
            >
                {pInfo.attributes && (
                    <div ref={MenuRef} className="menu-btn" onClick={(aEvent: any) => onContextMenu(aEvent)}>
                        <BiSolidDownArrow></BiSolidDownArrow>
                    </div>
                )}
                <div className="home_btn">{pSetIcon(pInfo)}</div>
                <p>{pInfo.label}</p>

                <div style={{ position: 'fixed', top: menuY + 10, left: menuX, zIndex: 999 }}>
                    <OutsideClickHandler onOutsideClick={closeModal}>
                        {sIsContextMenu && (
                            <div className="menu-list">
                                {pInfo.attributes &&
                                    pInfo.attributes.map((aItem: any, aIdx: number) => {
                                        return (
                                            <div key={aIdx} className="item" onClick={(aEvent: any) => setTerminal(aEvent, Object.keys(aItem)[0].toUpperCase())}>
                                                {Object.keys(aItem)[0] === 'cloneable' ? (
                                                    <Copy />
                                                ) : Object.keys(aItem)[0] === 'removable' ? (
                                                    <Delete />
                                                ) : (
                                                    <GoPencil></GoPencil>
                                                )}
                                                {Object.keys(aItem)[0] === 'cloneable' ? 'Make a copy' : Object.keys(aItem)[0] === 'removable' ? 'Remove' : 'Edit...'}
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </OutsideClickHandler>
                </div>
            </div>
            {sIsModal && <ModalShell pGetInfo={pGetInfo} pSetIsModal={setIsModal} pInfo={pInfo}></ModalShell>}
        </div>
    );
};
export default ShellMenu;
