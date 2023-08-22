import { useState, useRef, useEffect } from 'react';

import {
    Cmd,
    VscSymbolFile,
    VscThreeBars,
    VscNote,
    VscGraphLine,
    Gear,
    VscFiles,
    Logout,
    Key
} from '@/assets/icons/Icon';

import ExtensionBtn from '@/components/extension/ExtensionBtn';
import './index.scss';
import { useRecoilState } from 'recoil';
import { gSelectedExtension } from '@/recoil/recoil';
import Menu from '../contextMenu/Menu';
import useOutsideClick from '@/hooks/useOutsideClick';
import { LicenseModal } from '@/components/modal/LicenseModal';
import { logOut } from '@/api/repository/login';
import { useNavigate } from 'react-router-dom';

const Extention = ({ pHandleSideBar, pSetSideSizes, pIsSidebar }: any) => {
    const sNavigate = useNavigate();
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const MenuRef = useRef<HTMLDivElement>(null);
    const [sExtentionList] = useState([
        {
            id: 'EXPLORER',
            type: 'EXPLORER',
            icon: 'file-document-outline',
            label: 'EXPLORER',
        },
    ]);
    const [sSelectedExtension, setSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    const [sIsLicenseModal, setIsLicenseModal] = useState<boolean>(false);

    const selectExtension = (aItem: any) => {
        if (aItem.label === sSelectedExtension) {
            setSelectedExtension('');
            pHandleSideBar(false);
            pSetSideSizes([0, '100%']);
        } else {
            pSetSideSizes(['20%', '80%']);
            pHandleSideBar(true);
            setSelectedExtension(aItem.label);
        }
    };

    const logout = async () => {
        const sLogout: any = await logOut();
        if (sLogout.success) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sNavigate('/login');
        }
    };

    const setIcon = (aId: any) => {
        switch (aId) {
            case 'SQL':
                return <VscSymbolFile></VscSymbolFile>;
                break;
            case 'TQL':
                return <VscNote></VscNote>;
                break;
            case 'WRK':
                return <VscThreeBars></VscThreeBars>;
                break;
            case 'TERM':
                return <Cmd></Cmd>;
                break;
            case 'TAZ':
                return <VscGraphLine></VscGraphLine>;
                break;
            case 'EXPLORER':
                return <VscFiles></VscFiles>;
                break;
            default:
                return <Cmd></Cmd>;
                break;
        }
    };

    useOutsideClick(MenuRef, () => setIsOpen(false));

    useEffect(() => {
        if (pIsSidebar) {
            setSelectedExtension('EXPLORER');
        } else {
            setSelectedExtension('');
        }
    }, [pIsSidebar]);
    return (
        <>
            <div className="extension-form">
                <div className="extension-top-list">
                    {sExtentionList &&
                        sExtentionList.length !== 0 &&
                        sExtentionList.map((aItem: any, aIdx: number) => {
                            return (
                                <div
                                    key={aIdx}
                                    style={
                                        sSelectedExtension === aItem.label
                                            ? {
                                                  borderLeft: '4px solid #005FB8',
                                                  cursor: 'pointer',
                                              }
                                            : {}
                                    }
                                    onClick={() => selectExtension(aItem)}
                                >
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
                                {/* <Menu.Item onClick={() => null}>
                                    <MdSettingsApplications />
                                    <span>Preferences</span>
                                </Menu.Item> */}
                                <Menu.Item onClick={() => setIsLicenseModal(true)}>
                                    <Key />
                                    <span>License</span>
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
        </>
    );
};
export default Extention;
