import { useState, useEffect } from 'react';
import { Cmd, VscSymbolFile, VscThreeBars, VscNote, VscGraphLine, Gear, VscFiles, Logout, Key, VscLibrary, GoDatabase, VscKey, GoTerminal, TableHeader } from '@/assets/icons/Icon';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { BADGE_KEYWORD, gBoardList, gExtensionList, gLicense, gSelectedExtension, gSelectedTab } from '@/recoil/recoil';
import { GNB, Menu } from '@/design-system/components';
import { logOut } from '@/api/repository/login';
import { useNavigate } from 'react-router-dom';
import { RxLapTimer } from 'react-icons/rx';
import { generateUUID, getId } from '@/utils';
import { GiBrain, GiTallBridge } from 'react-icons/gi';
import { RiLockPasswordLine } from 'react-icons/ri';
import { PasswordModal } from '../password';
import { VscExtensions } from 'react-icons/vsc';
import { BadgeStatus } from '../badge';
import { useExperiment } from '@/hooks/useExperiment';
import { LicenseModal } from '../modal/LicenseModal';
import { StatzTableModal } from '../modal/StatzTableModal';
import { ProviderModal } from '../chat/ProviderModal';

interface GNBPanelProps {
    pHandleSideBar: (isOpen: boolean) => void;
    pSetSideSizes: (sizes: string[] | number[]) => void;
    pIsSidebar: boolean;
    pSetEula: (open: boolean) => void;
}

const GNBPanel = ({ pHandleSideBar, pSetSideSizes, pIsSidebar, pSetEula }: GNBPanelProps) => {
    const sNavigate = useNavigate();
    const [sExtensionList] = useRecoilState<any>(gExtensionList);
    const [sSelectedExtension, setSelectedExtension] = useRecoilState<string>(gSelectedExtension);
    const [sIsLicenseModal, setIsLicenseModal] = useState<boolean>(false);
    const [sIsProviderModal, setIsProviderModal] = useState<boolean>(false);
    const [sIsPWDModal, setIsPWDModal] = useState<boolean>(false);
    const [sIsStatzTableModal, setIsStatzTableModal] = useState<boolean>(false);
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const getGLicense = useRecoilValue(gLicense);
    const { getExperiment } = useExperiment();

    const selectExtension = async (aItem: any) => {
        // EULA TEST
        pSetEula(true);
        if (getGLicense?.eulaRequired) return;

        if (aItem.label === sSelectedExtension) {
            setSelectedExtension('');
            pHandleSideBar(false);
            pSetSideSizes(['0%', '100%']);
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
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };

    const handlePWD = () => {
        setIsPWDModal(true);
    };

    const handleStatzTable = () => {
        setIsStatzTableModal(true);
    };

    const handleProvider = () => {
        setIsProviderModal(true);
    };

    const handleLicense = () => {
        setIsLicenseModal(true);
    };

    useEffect(() => {
        if (pIsSidebar) {
            setSelectedExtension(sSelectedExtension);
        } else {
            setSelectedExtension('');
        }
    }, [pIsSidebar]);

    return (
        <>
            <GNB.Root
                selectedId={sSelectedExtension}
                onSelect={(item) => {
                    const extensionItem = sExtensionList.find((ext: any) => ext.id === item.id);
                    if (extensionItem) {
                        selectExtension(extensionItem);
                    }
                }}
            >
                <GNB.Container position="top">
                    {sExtensionList &&
                        sExtensionList.length !== 0 &&
                        sExtensionList.map((aItem: any, aIdx: number) => {
                            // Filter out APPSTORE if experiment mode is off
                            if (!getExperiment() && aItem.label === 'APPSTORE') return null;

                            return (
                                <GNB.Item
                                    key={aIdx}
                                    id={aItem.id}
                                    label={aItem.label}
                                    icon={setIcon(aItem.id)}
                                    onClick={(item) => {
                                        const extensionItem = sExtensionList.find((ext: any) => ext.id === item.id);
                                        if (extensionItem) {
                                            selectExtension(extensionItem);
                                        }
                                    }}
                                />
                            );
                        })}
                </GNB.Container>

                <GNB.Container position="bottom">
                    <Menu.Root>
                        <Menu.Trigger>
                            <GNB.Item id="SETTINGS" label="Settings" icon={<Gear />} badge={getGLicense?.licenseStatus !== BADGE_KEYWORD ? <BadgeStatus /> : undefined} />
                        </Menu.Trigger>
                        <Menu.Content align="left">
                            <Menu.Item icon={<Key />} rightIcon={getGLicense?.licenseStatus !== BADGE_KEYWORD && <BadgeStatus />} onClick={handleLicense}>
                                <span>License</span>
                            </Menu.Item>
                            <Menu.Item icon={<VscKey />} onClick={handleSSHKeys}>
                                SSH Keys
                            </Menu.Item>
                            <Menu.Item icon={<TableHeader />} onClick={handleStatzTable}>
                                Statz Table
                            </Menu.Item>
                            {getExperiment() && (
                                <Menu.Item icon={<GiBrain />} onClick={handleProvider}>
                                    Configure AI
                                </Menu.Item>
                            )}
                            <Menu.Item icon={<RiLockPasswordLine />} onClick={handlePWD}>
                                Change password
                            </Menu.Item>
                            <Menu.Item icon={<Logout />} onClick={logout}>
                                Logout
                            </Menu.Item>
                        </Menu.Content>
                    </Menu.Root>
                </GNB.Container>
            </GNB.Root>

            {sIsLicenseModal ? <LicenseModal isOpen={sIsLicenseModal} onClose={() => setIsLicenseModal(false)} /> : null}
            {sIsPWDModal ? <PasswordModal isOpen={sIsPWDModal} onClose={() => setIsPWDModal(false)} /> : null}
            {sIsStatzTableModal ? <StatzTableModal isOpen={sIsStatzTableModal} onClose={() => setIsStatzTableModal(false)} /> : null}
            {sIsProviderModal ? <ProviderModal isOpen={sIsProviderModal} onClose={() => setIsProviderModal(false)} /> : null}
        </>
    );
};

export default GNBPanel;
