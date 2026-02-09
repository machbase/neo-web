import { MdRefresh } from 'react-icons/md';
import { Button, Side } from '@/design-system/components';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveBridge, gBoardList, gMediaServer, gSelectedTab } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';
import { loadCameras, type CameraItem } from '@/components/dashboard/panels/video/utils/api';

export const CameraSide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [sCamera, setCamera] = useState<CameraItem[]>([]);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const mediaServer = useRecoilValue(gMediaServer);
    const PAGE_TYPE = 'camera';

    const getList = async () => {
        setIsLoading(true);
        const cameras = await loadCameras();
        if (cameras) setCamera(cameras);
        else setCamera([]);
        setIsLoading(false);
    };
    const checkExistTab = (aType: string) => {
        const sResut = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === aType;
        }, false);
        return sResut;
    };

    // OPEN BRIDGE
    const openBridgeInfo = (aInfo: any) => {
        const sExistKeyTab = checkExistTab(PAGE_TYPE);
        setActiveName(aInfo.name);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === PAGE_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `CAMERA: ${aInfo.name}`,
                            mode: 'edit',
                            code: aInfo,
                            savedCode: aInfo,
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
                    type: PAGE_TYPE,
                    name: `CAMERA: ${aInfo.name}`,
                    mode: 'edit',
                    code: aInfo,
                    savedCode: aInfo,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };

    const handleCreate = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        setActiveName(undefined);
        const sExistKeyTab = checkExistTab(PAGE_TYPE);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === PAGE_TYPE);
            const sId = generateUUID();
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            id: sId,
                            type: PAGE_TYPE,
                            name: `CAMERA: create`,
                            mode: 'create',
                            code: undefined,
                            savedCode: false,
                            path: '',
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(sId);
            return;
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: PAGE_TYPE,
                    name: `CAMERA: create`,
                    mode: 'create',
                    code: undefined,
                    savedCode: false,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
            return;
        }
    };
    const handleRefresh = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        getList();
    };
    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };

    /** init bridge list & media server settings */
    useEffect(() => {
        getList();
    }, [mediaServer]);

    return (
        <Side.Container>
            <Side.Section>
                <Side.Collapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                    <span>CAMERA</span>
                    <Button.Group>
                        <Button size="side" variant="ghost" icon={<GoPlus size={16} />} isToolTip toolTipContent="New camera" onClick={handleCreate} />
                        <Button size="side" variant="ghost" icon={<MdRefresh size={16} />} isToolTip toolTipContent="Refresh" onClick={handleRefresh} disabled={sIsLoading} />
                    </Button.Group>
                </Side.Collapse>

                {sIsCollapse && (
                    <Side.List>
                        {sCamera && sCamera.length > 0 ? (
                            sCamera.map((aItem, aIdx: number) => {
                                return (
                                    <Side.Box key={aIdx}>
                                        <Side.Item onClick={() => openBridgeInfo(aItem)} active={sActiveName === aItem?.id}>
                                            <Side.ItemContent>
                                                <Side.ItemIcon style={{ width: '16px' }}>{icons('camera')}</Side.ItemIcon>
                                                <Side.ItemText>{aItem?.id}</Side.ItemText>
                                            </Side.ItemContent>
                                        </Side.Item>
                                    </Side.Box>
                                );
                            })
                        ) : (
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', padding: '8px' }}>{sIsLoading ? 'Loading...' : 'No cameras found...'}</span>
                        )}
                    </Side.List>
                )}
            </Side.Section>
        </Side.Container>
    );
};
