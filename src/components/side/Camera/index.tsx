import { MdRefresh } from 'react-icons/md';
import { Badge, Button, ContextMenu, Side, StatusIndicator } from '@/design-system/components';
import { useCallback, useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveCamera, gBoardList, gCameraList, gSelectedTab, gCameraHealthTrigger } from '@/recoil/recoil';
import { generateUUID } from '@/utils';
import icons from '@/utils/icons';
import { loadCameras, getCameraEventCount, buildBaseUrl, type CameraItem } from '@/components/dashboard/panels/video/utils/api';
import { getCamera, getCamerasHealth, getMediaServerConfig, saveMediaServerConfig, type MediaServerConfigItem, type CameraStatusResponse } from '@/api/repository/mediaSvr';
import { VscServer, VscSettingsGear } from 'react-icons/vsc';
import { BadgeStatus } from '@/components/badge';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { MediaSvrModal } from './mediaSvrModal';

export const CameraSide = () => {
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
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
    // const BLACKBOX_SVR_PAGE = 'blackboxsvr';
    const EVENT_PAGE = 'event';

    // Per-server state
    const [serverConfigs, setServerConfigs] = useState<MediaServerConfigItem[]>([]);
    const [serverHealthMap, setServerHealthMap] = useState<Record<string, Record<string, CameraStatusResponse['status']>>>({});
    const [serverCollapseMap, setServerCollapseMap] = useState<Record<string, boolean>>({});
    const [serverErrorMap, setServerErrorMap] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ open: boolean; x: number; y: number; config: MediaServerConfigItem | null }>({ open: false, x: 0, y: 0, config: null });
    const [isDeleteServerModalOpen, setIsDeleteServerModalOpen] = useState(false);
    const [deleteTargetConfig, setDeleteTargetConfig] = useState<MediaServerConfigItem | null>(null);

    const handleServerClick = (config: MediaServerConfigItem) => {
        // Toggle collapse
        setServerCollapseMap((prev) => ({ ...prev, [config.alias]: !prev[config.alias] }));

        // Open server detail tab
        // const sExistKeyTab = checkExistTab(BLACKBOX_SVR_PAGE);
        // if (sExistKeyTab) {
        //     const aTarget = sBoardList.find((aBoard: any) => aBoard.type === BLACKBOX_SVR_PAGE);
        //     setBoardList((aBoardList: any) => {
        //         return aBoardList.map((aBoard: any) => {
        //             if (aBoard.id === aTarget.id) {
        //                 return {
        //                     ...aTarget,
        //                     name: `SERVER: ${config.alias}`,
        //                     code: config,
        //                     savedCode: config,
        //                 };
        //             }
        //             return aBoard;
        //         });
        //     });
        //     setSelectedTab(aTarget.id);
        // } else {
        //     const sId = generateUUID();
        //     setBoardList([
        //         ...sBoardList,
        //         {
        //             id: sId,
        //             type: BLACKBOX_SVR_PAGE,
        //             name: `SERVER: ${config.alias}`,
        //             code: config,
        //             savedCode: config,
        //             path: '',
        //         },
        //     ]);
        //     setSelectedTab(sId);
        // }
    };

    const fetchServerCameras = async (config: MediaServerConfigItem) => {
        const baseUrl = buildBaseUrl(config.ip, config.port);
        const cameras = await loadCameras(baseUrl);
        setServerCameraMap((prev) => ({ ...prev, [config.alias]: cameras }));
    };

    const fetchServerHealth = async (config: MediaServerConfigItem): Promise<boolean> => {
        try {
            const baseUrl = buildBaseUrl(config.ip, config.port);
            const res = await getCamerasHealth(baseUrl);
            if (res.success && res.data?.cameras) {
                const map: Record<string, CameraStatusResponse['status']> = {};
                res.data.cameras.forEach((c) => {
                    map[c.name] = c.status;
                });
                setServerHealthMap((prev) => ({ ...prev, [config.alias]: map }));
                setServerErrorMap((prev) => ({ ...prev, [config.alias]: false }));
                return true;
            }
            return false;
        } catch (err) {
            console.error(`Failed to fetch health for ${config.alias}:`, err);
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
        await Promise.all(
            configs.map(async (config) => {
                const healthy = await fetchServerHealth(config);
                if (!healthy) return;
                await fetchServerCameras(config);
                await fetchServerEventCount(config);
            })
        );
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
    const openInfo = async (aInfo: CameraItem, config: MediaServerConfigItem) => {
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
                            mode: 'edit',
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
                    mode: 'edit',
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

    /** Re-fetch health when camera status is toggled */
    useEffect(() => {
        if (cameraHealthTrigger > 0) {
            serverConfigs.forEach((config) => fetchServerHealth(config));
        }
    }, [cameraHealthTrigger]);

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

                    {sIsCollapse && (
                        <Side.List>
                            {serverConfigs.length > 0 ? (
                                serverConfigs.map((config) => {
                                    const cameras = serverCameraMap[config.alias] || [];
                                    const healthMap = serverHealthMap[config.alias] || {};
                                    const isExpanded = serverCollapseMap[config.alias] ?? true;
                                    const hasError = serverErrorMap[config.alias] ?? false;

                                    return (
                                        <Side.Box key={config.alias}>
                                            <Side.Item
                                                onClick={hasError ? undefined : () => handleServerClick(config)}
                                                onContextMenu={(e: React.MouseEvent) => handleServerContextMenu(e, config)}
                                                style={hasError ? { cursor: 'default' } : undefined}
                                            >
                                                <Side.ItemContent>
                                                    {!hasError && cameras.length > 0 ? (
                                                        <Side.ItemArrow isOpen={isExpanded} />
                                                    ) : (
                                                        <div style={{ minWidth: '16px', maxWidth: '16px', flexShrink: 0, marginRight: '2px' }} />
                                                    )}
                                                    <Side.ItemIcon style={{ width: '16px' }}>
                                                        <VscServer size={14} />
                                                    </Side.ItemIcon>
                                                    <Side.ItemText>{config.alias || `${config.ip}:${config.port}`}</Side.ItemText>
                                                    <Button.Group>
                                                        {!hasError && (
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
                                                            {hasError && (
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
                                                                    <BadgeStatus />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Button.Group>
                                                </Side.ItemContent>
                                            </Side.Item>
                                            {!hasError &&
                                                isExpanded &&
                                                cameras.map((cam, idx) => {
                                                    const status = healthMap[cam.id] ?? 'stopped';
                                                    return (
                                                        <Side.Box key={idx}>
                                                            <Side.Item
                                                                onClick={() => openInfo(cam, config)}
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
                                            {!hasError && isExpanded && (
                                                <Side.Box>
                                                    <Side.Item onClick={(e: React.MouseEvent) => handleEvent(e, config)} style={{ paddingLeft: '52px', paddingRight: '8px' }}>
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
                onClose={() => {
                    setIsMediaSvrModalOpen(false);
                    reloadConfigs();
                }}
                mode="new"
            />
            <MediaSvrModal
                isOpen={editServerConfig !== null}
                onClose={() => {
                    setEditServerConfig(null);
                    reloadConfigs();
                }}
                mode="edit"
                initialIp={editServerConfig?.ip}
                initialPort={editServerConfig?.port}
                initialAlias={editServerConfig?.alias}
            />
            <ContextMenu isOpen={contextMenu.open} position={{ x: contextMenu.x, y: contextMenu.y }} onClose={closeContextMenu}>
                <ContextMenu.Item onClick={handleDeleteServer}>
                    <span>Delete blackbox server</span>
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
        </>
    );
};
