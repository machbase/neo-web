import { MdRefresh } from 'react-icons/md';
import { Button, Side, StatusIndicator } from '@/design-system/components';
import { useCallback, useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveCamera, gBoardList, gCameraList, gMediaServer, gSelectedTab, gCameraHealthTrigger } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';
import { loadCameras, type CameraItem } from '@/components/dashboard/panels/video/utils/api';
import { getCamera, getCamerasHealth, getMediaServerConfig, type CameraStatusResponse } from '@/api/repository/mediaSvr';
import { KEY_LOCAL_STORAGE_API_BASE } from '@/components/dashboard/panels/video/utils/api';

export const CameraSide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [sCamera, setCamera] = useRecoilState<CameraItem[]>(gCameraList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveCamera);
    const setMediaServer = useSetRecoilState(gMediaServer);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [isConfigReady, setIsConfigReady] = useState<boolean>(false);
    const [sHealthMap, setHealthMap] = useState<Record<string, CameraStatusResponse['status']>>({});
    const mediaServer = useRecoilValue(gMediaServer);
    const cameraHealthTrigger = useRecoilValue(gCameraHealthTrigger);
    const PAGE_TYPE = 'camera';

    const getList = async () => {
        setIsLoading(true);
        const cameras = await loadCameras();
        if (cameras) setCamera(cameras);
        else setCamera([]);
        setIsLoading(false);
    };

    const fetchHealth = async () => {
        try {
            const res = await getCamerasHealth();
            if (res.success && res.data?.cameras) {
                const map: Record<string, CameraStatusResponse['status']> = {};
                res.data.cameras.forEach((c) => {
                    map[c.name] = c.status;
                });
                setHealthMap(map);
            }
        } catch (err) {
            console.error('Failed to fetch cameras health:', err);
        }
    };
    const checkExistTab = (aType: string) => {
        const sResut = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === aType;
        }, false);
        return sResut;
    };

    const fetchCameraDetail = useCallback(async (id: string) => {
        try {
            const res = await getCamera(id);
            if (res.success && res.data) {
                const camera = res.data;
                return camera;
            }
        } catch (err) {
            console.error('Failed to fetch camera detail:', err);
        }
    }, []);

    // OPEN
    const openInfo = async (aInfo: CameraItem) => {
        const sExistKeyTab = checkExistTab(PAGE_TYPE);
        let sCode = undefined;
        setActiveName(aInfo.id);

        // If pCode exists (edit mode), fetch camera detail
        if (aInfo?.id) {
            sCode = await fetchCameraDetail(aInfo.id);
        }

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === PAGE_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `CAMERA: ${aInfo.id}`,
                            mode: 'edit',
                            code: sCode,
                            savedCode: sCode,
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
                    name: `CAMERA: ${aInfo.id}`,
                    mode: 'edit',
                    code: sCode,
                    savedCode: sCode,
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
        fetchHealth();
    };
    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };

    /** Load media server config from file on mount */
    useEffect(() => {
        getMediaServerConfig().then((config) => {
            if (config) {
                const url = config.port ? `${config.ip}:${config.port}` : config.ip;
                localStorage.setItem(KEY_LOCAL_STORAGE_API_BASE, url);
                setMediaServer(config);
            }
            setIsConfigReady(true);
        });
    }, []);

    /** Fetch cameras/health after config loaded or when mediaServer changes */
    useEffect(() => {
        if (!isConfigReady) return;
        getList();
        fetchHealth();
    }, [isConfigReady, mediaServer]);

    /** Re-fetch health when camera status is toggled */
    useEffect(() => {
        if (cameraHealthTrigger > 0) {
            fetchHealth();
        }
    }, [cameraHealthTrigger]);

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
                                const status = sHealthMap[aItem?.id] ?? 'stopped';
                                return (
                                    <Side.Box key={aIdx}>
                                        <Side.Item onClick={() => openInfo(aItem)} active={sActiveName === aItem?.id}>
                                            <Side.ItemContent>
                                                <Side.ItemIcon style={{ width: '16px' }}>{icons('camera')}</Side.ItemIcon>
                                                <Side.ItemText>{aItem?.id}</Side.ItemText>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '8px' }}>
                                                    <StatusIndicator variant={status === 'running' ? 'running' : 'neutral'} size="sm" style={{ marginLeft: 'auto' }} />
                                                </div>
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
