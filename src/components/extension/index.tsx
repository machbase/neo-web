import { useState, useRef, useEffect } from 'react';
import { Cmd, VscSymbolFile, VscThreeBars, VscNote, VscGraphLine, Gear, VscFiles, Logout, Key, VscLibrary, GoDatabase, VscKey, GoTerminal } from '@/assets/icons/Icon';
import ExtensionBtn from '@/components/extension/ExtensionBtn';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gExtensionList, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { LicenseModal } from '@/components/modal/LicenseModal';
import { logOut } from '@/api/repository/login';
import { useNavigate } from 'react-router-dom';
import { RxLapTimer } from 'react-icons/rx';
import { generateUUID, getId } from '@/utils';
import { GiTallBridge } from 'react-icons/gi';
import { RiLockPasswordLine } from 'react-icons/ri';
import { Password } from '../password';
import './index.scss';
import { VscExtensions } from 'react-icons/vsc';

const Extension = ({ pHandleSideBar, pSetSideSizes, pIsSidebar }: any) => {
    const sNavigate = useNavigate();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sExtensionList] = useRecoilState<any>(gExtensionList);
    const [sSelectedExtension, setSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    const [sIsLicenseModal, setIsLicenseModal] = useState<boolean>(false);
    const [sIsPWDModal, setIsPWDModal] = useState<boolean>(false);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);

    const selectExtension = (aItem: any) => {
        if (aItem.label === sSelectedExtension) {
            setSelectedExtension('');
            pHandleSideBar(false);
            pSetSideSizes([0, '100%']);
        } else {
            if (!pIsSidebar) {
                pSetSideSizes(['15%', '85%']);
                pHandleSideBar(true);
            }
            setSelectedExtension(aItem.id);
        }
    };
    const logout = async () => {
        const sLogout: any = await logOut();
        if (sLogout.success) {
            // Apply default board (new board)
            const sNewTab = { id: getId(), type: 'new', name: 'new', path: '', code: '', panels: [], range_bgn: '', range_end: '', sheet: [], savedCode: false };
            setBoardList([sNewTab]);
            setSelectedTab(sNewTab.id);

            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sNavigate('/login');
        }
    };
    const setIcon = (aId: any) => {
        switch (aId) {
            case 'SQL':
                return <VscSymbolFile />;
            case 'TQL':
                return <VscNote />;
            case 'WRK':
                return <VscThreeBars />;
            case 'TERM':
                return <Cmd />;
            case 'TAZ':
                return <VscGraphLine />;
            case 'EXPLORER':
                return <VscFiles />;
            case 'DBEXPLORER':
                return <GoDatabase />;
            case 'REFERENCE':
                return <VscLibrary />;
            case 'KEY':
                return <VscKey />;
            case 'TIMER':
                return <RxLapTimer />;
            case 'SHELL':
                return <GoTerminal />;
            case 'BRIDGE':
                return <GiTallBridge />;
            case 'APPSTORE':
                return <VscExtensions />;
            default:
                return <Cmd />;
        }
    };
    const handleSSHKeys = () => {
        setIsOpen(false);
        const sExistKeyTab = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === 'ssh-key';
        }, false);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === 'ssh-key');
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `SSH KEYS`,
                            code: '',
                            savedCode: '',
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
            return;
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: 'ssh-key',
                    name: `SSH KEYS`,
                    code: '',
                    savedCode: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handlePWD = () => {
        setIsOpen(false);
        setIsPWDModal(true);
    };

    useOutsideClick(MenuRef, () => setIsOpen(false));

    useEffect(() => {
        if (pIsSidebar) {
            setSelectedExtension(sSelectedExtension);
        } else {
            setSelectedExtension('');
        }
    }, [pIsSidebar]);
    return (
        <>
            <div className="extension-form">
                <div className="extension-top-list">
                    {sExtensionList &&
                        sExtensionList.length !== 0 &&
                        sExtensionList.map((aItem: any, aIdx: number) => {
                            return (
                                <div key={aIdx} className={`extension-top-list-item`} onClick={() => selectExtension(aItem)}>
                                    <ExtensionBtn pLabel={aItem.label} pIcon={setIcon(aItem.id)} />
                                </div>
                            );
                        })}
                </div>
                <div className="extension-bottom-list">
                    <div
                        ref={MenuRef}
                        style={{
                            position: 'relative',
                            cursor: 'pointer',
                        }}
                    >
                        <ExtensionBtn pIcon={<Gear />} onClick={() => setIsOpen(!isOpen)} />
                        <div style={{ position: 'absolute', bottom: 1, left: '100%' }}>
                            <Menu isOpen={isOpen}>
                                <Menu.Item onClick={() => setIsLicenseModal(true)}>
                                    <Key />
                                    <span>License</span>
                                </Menu.Item>
                                <Menu.Item onClick={handleSSHKeys}>
                                    <VscKey />
                                    <span>SSH Keys</span>
                                </Menu.Item>
                                <Menu.Item onClick={handlePWD}>
                                    <RiLockPasswordLine />
                                    <span>Change password</span>
                                </Menu.Item>
                                <Menu.Item onClick={logout}>
                                    <Logout />
                                    <span>Logout</span>
                                </Menu.Item>
                            </Menu>
                        </div>
                    </div>
                </div>
            </div>
            {sIsLicenseModal ? <LicenseModal pIsDarkMode setIsOpen={setIsLicenseModal} /> : null}
            {sIsPWDModal && <Password setIsOpen={setIsPWDModal} />}
        </>
    );
};
export default Extension;
