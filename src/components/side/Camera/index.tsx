import { MdRefresh } from 'react-icons/md';
import { Badge, Button, ContextMenu, Side, StatusIndicator } from '@/design-system/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gActiveCamera, gBoardList, gCameraList, gSelectedTab, gCameraHealthTrigger } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';
import { loadCameras, getCameraEventCount, buildBaseUrl, type CameraItem } from '@/components/dashboard/panels/video/utils/api';
import type { CameraPageMode } from './cameraPage';
import {
    deleteCamera,
    getCamera,
    getCamerasHealth,
    getMediaServerConfig,
    saveMediaServerConfig,
    type MediaServerConfigItem,
    type CameraStatusResponse,
} from '@/api/repository/mediaSvr';
import { VscServer, VscSettingsGear, VscEdit } from 'react-icons/vsc';
import { BadgeStatus } from '@/components/badge';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { Delete } from '@/assets/icons/Icon';
import { MediaSvrModal } from './mediaSvrModal';

export const CameraSide = () => {
    const [sSelectedTab, setSelectedTab] = useRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sIsCollapse, setIsCollapse] = useState<boolean>(true);
    const [serverCameraMap, setServerCameraMap] = useRecoilState(gCameraList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveCamera);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);
    const [isMediaSvrModalOpen, setIsMediaSvrModalOpen] = useState(false);
    const [editServerConfig, setEditServerConfig] = useState<MediaServerConfigItem | null>(null);
    const [serverEventCountMap, setServerEventCountMap] = useState<Record<string, number>>({});
    const cameraHealthTrigger = useRecoilValue(gCameraHealthTrigger);
    const PAGE_TYPE = 'camera';
    const EVENT_PAGE = 'event';

    // Per-server state
    const [serverConfigs, setServerConfigs] = useState<MediaServerConfigItem[]>([]);
    const [serverHealthMap, setServerHealthMap] = useState<Record<string, Record<string, CameraStatusResponse['status']>>>({});
    const [serverCollapseMap, setServerCollapseMap] = useState<Record<string, boolean>>({});
    const [serverErrorMap, setServerErrorMap] = useState<Record<string, boolean>>({});
    const [serverLoadedMap, setServerLoadedMap] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; config: MediaServerConfigItem | null }>({ open: false, x: 0, y: 0, config: null });
    const [isDeleteServerModalOpen, setIsDeleteServerModalOpen] = useState(false);
    const [deleteTargetConfig, setDeleteTargetConfig] = useState<MediaServerConfigItem | null>(null);
    const [cameraContextMenu, setCameraContextMenu] = useState<{ open: boolean; x: number; y: number; camera: CameraItem | null; config: MediaServerConfigItem | null }>({
        open: false,
        x: 0,
        y: 0,
        camera: null,
        config: null,
    });
    const [isDeleteCameraModalOpen, setIsDeleteCameraModalOpen] = useState(false);
    const [deleteCameraTarget, setDeleteCameraTarget] = useState<{ camera: CameraItem; config: MediaServerConfigItem } | null>(null);

    // Determine which server the currently active tab belongs to
    const activeServerAlias = useMemo(() => {
        const currentBoard = sBoardList.find((b: any) => b.id === sSelectedTab);
        if (!currentBoard) return '';
        if (currentBoard.type === 'camera' || currentBoard.type === 'event' || currentBoard.type === 'blackboxsvr') {
            return currentBoard.code?.alias || '';
        }
        return '';
    }, [sBoardList, sSelectedTab]);

    const handleServerClick = (config: MediaServerConfigItem) => {
        // Toggle collapse
        setServerCollapseMap((prev) => ({ ...prev, [config.alias]: !prev[config.alias] }));
    };

    const fetchServerCameras = async (config: MediaServerConfigItem) => {
        const baseUrl = buildBaseUrl(config.ip, config.port);
        const cameras = await loadCameras(baseUrl);
        setServerCameraMap((prev) => ({ ...prev, [config.alias]: cameras }));
        setServerLoadedMap((prev) => ({ ...prev, [config.alias]: true }));
    };

    const fetchServerHealth = async (config: MediaServerConfigItem): Promise<boolean> => {
        try {
            const baseUrl = buildBaseUrl(config.ip, config.port);
            const res = await getCamerasHealth(baseUrl);
            if (res.data?.cameras?.length) {
                const map: Record<string, CameraStatusResponse['status']> = {};
                res.data.cameras.forEach((c) => {
                    map[c.name] = c.status;
                });
                setServerHealthMap((prev) => ({ ...prev, [config.alias]: map }));
            }
            setServerErrorMap((prev) => ({ ...prev, [config.alias]: false }));
            return true;
        } catch (err) {
            setServerErrorMap((prev) => ({ ...prev, [config.alias]: true }));
            return false;
        }
    };

    const fetchServerEventCount = async (config: MediaServerConfigItem) => {
        const baseUrl = buildBaseUrl(config.ip, config.port);
        const count = await getCameraEventCount(baseUrl);
        setServerEventCountMap((prev) => ({ ...prev, [config.alias]: count }));
    };

    const fetchAllServers = async (configs: MediaServerConfigItem[]) => {
        setIsLoading(true);
        const minDelay = new Promise((r) => setTimeout(r, 100));
        await Promise.all([
            minDelay,
            ...configs.map(async (config) => {
                const healthy = await fetchServerHealth(config);
                if (!healthy) return;
                await fetchServerCameras(config);
                await fetchServerEventCount(config);
            }),
        ]);
        setIsLoading(false);
    };

    const checkExistTab = (aType: string) => {
        return sBoardList.some((aBoard: any) => aBoard.type === aType);
    };

    const fetchCameraDetail = useCallback(async (id: string, baseUrl?: string) => {
        try {
            const res = await getCamera(id, baseUrl);
            if (res.success && res.data) {
                return res.data;
            }
        } catch (err) {
            console.error('Failed to fetch camera detail:', err);
        }
    }, []);

    // Open camera info tab
    const openInfo = async (aInfo: CameraItem, config: MediaServerConfigItem, openMode: CameraPageMode = 'readonly') => {
        const sExistKeyTab = checkExistTab(PAGE_TYPE);
        let sCode = undefined;
        setActiveName(`${config.alias}::${aInfo.id}`);

        if (aInfo?.id) {
            const baseUrl = buildBaseUrl(config.ip, config.port);
            sCode = await fetchCameraDetail(aInfo.id, baseUrl);
        }

        // Merge server config into camera data so CameraPage has ip/port/alias
        const codeWithServer = sCode ? { ...sCode, ip: config.ip, port: config.port, alias: config.alias } : sCode;

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === PAGE_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `CAMERA: ${aInfo.id}`,
                            mode: openMode,
                            code: codeWithServer,
                            savedCode: codeWithServer,
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: PAGE_TYPE,
                    name: `CAMERA: ${aInfo.id}`,
                    mode: openMode,
                    code: codeWithServer,
                    savedCode: codeWithServer,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
        }
    };

    const reloadConfigs = () => {
        getMediaServerConfig().then((configs) => {
            if (configs.length > 0) {
                setServerConfigs(configs);
                setServerCollapseMap((prev) => {
                    const updated = { ...prev };
                    configs.forEach((c) => {
                        if (!(c.alias in updated)) updated[c.alias] = true;
                    });
                    return updated;
                });
                fetchAllServers(configs);
            } else {
                setServerConfigs([]);
            }
        });
    };

    const handleRefresh = (e: React.MouseEvent) => {
        e && e.stopPropagation();
        reloadConfigs();
    };

    const handleCollapse = () => {
        setIsCollapse(!sIsCollapse);
    };

    const handleServerContextMenu = (e: React.MouseEvent, config: MediaServerConfigItem) => {
        e.preventDefault();
        setContextMenu({ open: true, x: e.pageX, y: e.pageY, config });
    };

    const closeContextMenu = () => {
        setContextMenu((prev) => ({ ...prev, open: false }));
    };

    const handleDeleteServer = () => {
        if (!contextMenu.config) return;
        setDeleteTargetConfig(contextMenu.config);
        closeContextMenu();
        setIsDeleteServerModalOpen(true);
    };

    const handleCameraContextMenu = (e: React.MouseEvent, camera: CameraItem, config: MediaServerConfigItem) => {
        e.preventDefault();
        e.stopPropagation();
        setCameraContextMenu({ open: true, x: e.pageX, y: e.pageY, camera, config });
    };

    const closeCameraContextMenu = () => {
        setCameraContextMenu((prev) => ({ ...prev, open: false }));
    };

    const handleEditCameraMenu = () => {
        if (!cameraContextMenu.camera || !cameraContextMenu.config) return;
        openInfo(cameraContextMenu.camera, cameraContextMenu.config, 'edit');
        closeCameraContextMenu();
    };

    const handleDeleteCameraMenu = () => {
        if (!cameraContextMenu.camera || !cameraContextMenu.config) return;
        setDeleteCameraTarget({ camera: cameraContextMenu.camera, config: cameraContextMenu.config });
        closeCameraContextMenu();
        setIsDeleteCameraModalOpen(true);
    };

    const handleConfirmDeleteCamera = async () => {
        if (!deleteCameraTarget) return;
        const { camera, config } = deleteCameraTarget;
        const cameraId = camera.id;
        const baseUrl = buildBaseUrl(config.ip, config.port);

        try {
            const res = await deleteCamera(cameraId, baseUrl);
            if (res.success) {
                setIsDeleteCameraModalOpen(false);
                setDeleteCameraTarget(null);

                // Remove camera from gCameraList
                setServerCameraMap((prev) => ({
                    ...prev,
                    [config.alias]: (prev[config.alias] ?? []).filter((c: any) => c.id !== cameraId),
                }));

                // Close camera tab if it's currently showing the deleted camera
                const cameraTab = sBoardList.find((b: any) => b.type === PAGE_TYPE && b.code?.id === cameraId);
                if (cameraTab) {
                    const updatedBoardList = sBoardList.filter((b: any) => b.id !== cameraTab.id);
                    setBoardList(updatedBoardList);
                    if (updatedBoardList.length > 0) {
                        setSelectedTab(updatedBoardList[0].id);
                    }
                }

                // Clear active name if it was the deleted camera
                if (sActiveName === `${config.alias}::${cameraId}`) {
                    setActiveName('');
                }
            } else {
                console.error('Failed to delete camera:', res.reason);
            }
        } catch (err) {
            console.error('Failed to delete camera:', err);
        }
    };

    const handleConfirmDeleteServer = async () => {
        if (!deleteTargetConfig) return;
        const alias = deleteTargetConfig.alias;
        setIsDeleteServerModalOpen(false);
        setDeleteTargetConfig(null);
        const updated = serverConfigs.filter((c) => c.alias !== alias);
        const saved = await saveMediaServerConfig(updated);
        if (saved) {
            setServerConfigs(updated);
            // Clean up per-server state
            setServerCameraMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
            setServerHealthMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
            setServerCollapseMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
            setServerErrorMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
            setServerEventCountMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
            setServerLoadedMap((prev) => {
                const next = { ...prev };
                delete next[alias];
                return next;
            });
        }
    };

    // ADD CAMERA
    const handleAddCamera = (e: React.MouseEvent, config: MediaServerConfigItem) => {
        e.stopPropagation();

        const sExistKeyTab = checkExistTab(PAGE_TYPE);

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === PAGE_TYPE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `CAMERA: New`,
                            mode: 'create',
                            code: config,
                            savedCode: config,
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: PAGE_TYPE,
                    name: `CAMERA: New`,
                    mode: 'create',
                    code: config,
                    savedCode: config,
                    path: '',
                },
            ]);
            setSelectedTab(sId);
        }
        setActiveName('');
    };

    // EVENT
    const handleEvent = (e: React.MouseEvent, config: MediaServerConfigItem) => {
        e && e.stopPropagation();

        const sExistKeyTab = checkExistTab(EVENT_PAGE);
        setActiveName(`${config.alias}::__events__`);
        // Reset event count badge when user opens events page
        setServerEventCountMap((prev) => ({ ...prev, [config.alias]: 0 }));

        if (sExistKeyTab) {
            const aTarget = sBoardList.find((aBoard: any) => aBoard.type === EVENT_PAGE);
            setBoardList((aBoardList: any) => {
                return aBoardList.map((aBoard: any) => {
                    if (aBoard.id === aTarget.id) {
                        return {
                            ...aTarget,
                            name: `EVENT: ${config.alias}`,
                            code: config,
                            savedCode: config,
                            refreshKey: Date.now(),
                        };
                    }
                    return aBoard;
                });
            });
            setSelectedTab(aTarget.id);
        } else {
            const sId = generateUUID();
            setBoardList([
                ...sBoardList,
                {
                    id: sId,
                    type: EVENT_PAGE,
                    name: `EVENT: ${config.alias}`,
                    code: config,
                    savedCode: config,
                    refreshKey: Date.now(),
                    path: '',
                },
            ]);
            setSelectedTab(sId);
        }
    };

    /** Load media server configs from file on mount */
    useEffect(() => {
        getMediaServerConfig().then((configs) => {
            if (configs.length > 0) {
                setServerConfigs(configs);
                // Initialize collapse state (all expanded)
                const collapseInit: Record<string, boolean> = {};
                configs.forEach((c) => {
                    collapseInit[c.alias] = true;
                });
                setServerCollapseMap(collapseInit);
                fetchAllServers(configs);
            }
        });
    }, []);

    /** Sync sidebar active state when the selected tab changes (e.g. clicking tabs directly) */
    useEffect(() => {
        const currentBoard = sBoardList.find((b: any) => b.id === sSelectedTab);
        if (!currentBoard) return;

        if (currentBoard.type === PAGE_TYPE && currentBoard.code?.camera_id) {
            const alias = currentBoard.code?.alias ?? '';
            setActiveName(`${alias}::${currentBoard.code.camera_id}`);
        } else if (currentBoard.type === EVENT_PAGE) {
            const alias = currentBoard.code?.alias ?? '';
            setActiveName(`${alias}::__events__`);
        } else {
            setActiveName('');
        }
    }, [sSelectedTab]);

    /** Re-fetch health when camera status is toggled */
    useEffect(() => {
        if (cameraHealthTrigger > 0) {
            serverConfigs.forEach((config) => fetchServerHealth(config));
        }
    }, [cameraHealthTrigger]);

    /** Polling: health check + event count every 10 seconds */
    useEffect(() => {
        if (serverConfigs.length === 0) return;

        const poll = async () => {
            await Promise.all(
                serverConfigs.map(async (config) => {
                    const healthy = await fetchServerHealth(config);
                    if (healthy) {
                        await fetchServerEventCount(config);
                    }
                })
            );
        };

        const timer = setInterval(poll, 10_000);

        return () => clearInterval(timer);
    }, [serverConfigs]);

    return (
        <>
            <Side.Container>
                <Side.Section>
                    <Side.Collapse pCallback={handleCollapse} pCollapseState={sIsCollapse}>
                        <span>BLACKBOX SERVER</span>
                        <Button.Group>
                            <Button
                                size="side"
                                variant="ghost"
                                icon={<GoPlus size={16} />}
                                isToolTip
                                toolTipContent="New server"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setIsMediaSvrModalOpen(true);
                                }}
                            />
                            <Button size="side" variant="ghost" icon={<MdRefresh size={16} />} isToolTip toolTipContent="Refresh" onClick={handleRefresh} disabled={sIsLoading} />
                        </Button.Group>
                    </Side.Collapse>
                    {sIsLoading && (
                        <div style={{ width: '100%', height: '2px', overflow: 'hidden', backgroundColor: 'var(--color-bg-tertiary, #2a2a2a)' }}>
                            <div
                                style={{
                                    width: '40%',
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary, #007acc)',
                                    animation: 'indeterminate-progress 1.2s ease-in-out infinite',
                                }}
                            />
                            <style>{`@keyframes indeterminate-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }`}</style>
                        </div>
                    )}

                    {sIsCollapse && !sIsLoading && (
                        <Side.List>
                            {serverConfigs.length > 0 ? (
                                serverConfigs.map((config) => {
                                    const cameras = serverCameraMap[config.alias] || [];
                                    const healthMap = serverHealthMap[config.alias] || {};
                                    const isExpanded = serverCollapseMap[config.alias] ?? true;
                                    const hasError = serverErrorMap[config.alias] ?? false;
                                    const isLoaded = serverLoadedMap[config.alias] ?? false;

                                    const isActiveServer = activeServerAlias === config.alias;

                                    return (
                                        <Side.Box key={config.alias}>
                                            <Side.Item
                                                onClick={hasError ? undefined : () => handleServerClick(config)}
                                                onContextMenu={(e: React.MouseEvent) => handleServerContextMenu(e, config)}
                                                style={{
                                                    ...(hasError ? { cursor: 'default' } : undefined),
                                                    ...(isActiveServer ? { boxShadow: 'inset 2px 0 0 0 #007acc', backgroundColor: 'rgba(255, 255, 255, 0.1)' } : undefined),
                                                }}
                                            >
                                                <Side.ItemContent>
                                                    {!hasError && isLoaded ? (
                                                        <Side.ItemArrow isOpen={isExpanded} />
                                                    ) : (
                                                        <div style={{ minWidth: '16px', maxWidth: '16px', flexShrink: 0, marginRight: '2px' }} />
                                                    )}
                                                    <Side.ItemIcon style={{ width: '16px' }}>
                                                        <VscServer size={14} />
                                                    </Side.ItemIcon>
                                                    <Side.ItemText>{config.alias || `${config.ip}:${config.port}`}</Side.ItemText>
                                                    <Button.Group>
                                                        {!hasError && isLoaded && (
                                                            <Button
                                                                size="side"
                                                                variant="ghost"
                                                                icon={<GoPlus size={16} />}
                                                                isToolTip
                                                                toolTipContent="Add camera"
                                                                onClick={(e: React.MouseEvent) => handleAddCamera(e, config)}
                                                            />
                                                        )}
                                                        <div style={{ position: 'relative', display: 'flex', paddingRight: '11px' }}>
                                                            <Button
                                                                size="side"
                                                                variant="ghost"
                                                                icon={<VscSettingsGear size={12} />}
                                                                onClick={(e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    setEditServerConfig(config);
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: '0px',
                                                                    right: '0px',
                                                                    paddingRight: '11px',
                                                                    pointerEvents: 'none',
                                                                    transform: 'scale(0.8)',
                                                                    transformOrigin: 'top right',
                                                                }}
                                                            >
                                                                <BadgeStatus status={hasError ? 'error' : 'success'} />
                                                            </span>
                                                        </div>
                                                    </Button.Group>
                                                </Side.ItemContent>
                                            </Side.Item>
                                            {!hasError &&
                                                isLoaded &&
                                                isExpanded &&
                                                cameras.map((cam, idx) => {
                                                    const status = healthMap[cam.id] ?? 'stopped';
                                                    return (
                                                        <Side.Box key={idx}>
                                                            <Side.Item
                                                                onClick={() => openInfo(cam, config)}
                                                                onContextMenu={(e: React.MouseEvent) => handleCameraContextMenu(e, cam, config)}
                                                                active={sActiveName === `${config.alias}::${cam.id}`}
                                                                style={{ paddingLeft: '52px', paddingRight: '8px' }}
                                                            >
                                                                <Side.ItemContent>
                                                                    <Side.ItemIcon style={{ width: '16px' }}>{icons('camera')}</Side.ItemIcon>
                                                                    <Side.ItemText>{cam.label || cam.id}</Side.ItemText>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: '8px' }}>
                                                                        <StatusIndicator
                                                                            variant={status === 'running' ? 'running' : 'neutral'}
                                                                            size="sm"
                                                                            style={{ marginLeft: 'auto' }}
                                                                        />
                                                                    </div>
                                                                </Side.ItemContent>
                                                            </Side.Item>
                                                        </Side.Box>
                                                    );
                                                })}
                                            {!hasError && isLoaded && isExpanded && (
                                                <Side.Box>
                                                    <Side.Item
                                                        onClick={(e: React.MouseEvent) => handleEvent(e, config)}
                                                        active={sActiveName === `${config.alias}::__events__`}
                                                        style={{ paddingLeft: '52px', paddingRight: '8px' }}
                                                    >
                                                        <Side.ItemContent style={cameras?.length > 0 ? { borderTop: 'solid 1px #454545' } : {}}>
                                                            <Side.ItemIcon style={{ width: '16px' }}>{icons('event')}</Side.ItemIcon>
                                                            <Side.ItemText>Events</Side.ItemText>
                                                            {(serverEventCountMap[config.alias] ?? 0) > 0 && (
                                                                <Badge variant="error" size="sm">
                                                                    {serverEventCountMap[config.alias]}
                                                                </Badge>
                                                            )}
                                                        </Side.ItemContent>
                                                    </Side.Item>
                                                </Side.Box>
                                            )}
                                        </Side.Box>
                                    );
                                })
                            ) : (
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px', padding: '8px' }}>
                                    {sIsLoading ? 'Loading...' : 'No servers configured...'}
                                </span>
                            )}
                        </Side.List>
                    )}
                </Side.Section>
            </Side.Container>
            <MediaSvrModal
                isOpen={isMediaSvrModalOpen}
                onClose={(saved) => {
                    setIsMediaSvrModalOpen(false);
                    if (saved) reloadConfigs();
                }}
                mode="new"
            />
            <MediaSvrModal
                isOpen={editServerConfig !== null}
                onClose={(saved) => {
                    setEditServerConfig(null);
                    if (saved) reloadConfigs();
                }}
                mode="edit"
                initialIp={editServerConfig?.ip}
                initialPort={editServerConfig?.port}
                initialAlias={editServerConfig?.alias}
            />
            <ContextMenu isOpen={contextMenu.open} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={closeContextMenu}>
                <ContextMenu.Item onClick={handleDeleteServer}>
                    <Delete />
                    <span>Delete server</span>
                </ContextMenu.Item>
            </ContextMenu>
            <ContextMenu isOpen={cameraContextMenu.open} position={{ x: cameraContextMenu.x, y: cameraContextMenu.y }} onClose={closeCameraContextMenu}>
                <ContextMenu.Item onClick={handleEditCameraMenu}>
                    <VscEdit size={12} />
                    <span>Edit camera</span>
                </ContextMenu.Item>
                <ContextMenu.Item onClick={handleDeleteCameraMenu}>
                    <Delete />
                    <span>Delete camera</span>
                </ContextMenu.Item>
            </ContextMenu>
            {isDeleteServerModalOpen && (
                <ConfirmModal
                    setIsOpen={setIsDeleteServerModalOpen}
                    pContents={
                        <>
                            Are you sure you want to delete server <strong>"{deleteTargetConfig?.alias}"</strong>?
                            <br />
                            This action cannot be undone.
                        </>
                    }
                    pCallback={handleConfirmDeleteServer}
                />
            )}
            {isDeleteCameraModalOpen && (
                <ConfirmModal
                    setIsOpen={setIsDeleteCameraModalOpen}
                    pContents={
                        <>
                            Are you sure you want to delete camera <strong>"{deleteCameraTarget?.camera.label || deleteCameraTarget?.camera.id}"</strong>?
                            <br />
                            This action cannot be undone.
                        </>
                    }
                    pCallback={handleConfirmDeleteCamera}
                />
            )}
        </>
    );
};
