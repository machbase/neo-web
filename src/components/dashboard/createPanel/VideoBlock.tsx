import { useState, useEffect, useCallback, useRef } from 'react';
import { Page } from '@/design-system/components';
import { loadCameras, getMediaServerBaseUrl } from '@/components/dashboard/panels/video/utils/api';
import { getMediaServerConfig, type MediaServerConfigItem } from '@/api/repository/mediaSvr';
import { VideoBlockSource } from './VideoBlockSource';
import { VideoBlockEvents } from './VideoBlockEvents';

export interface SourceInfoType {
    serverId?: string;
    table: string;
    camera: string;
    serverIp: string;
    serverPort: number;
    serverAlias: string;
    liveModeOnStart: boolean;
    enableSync: boolean;
}

interface CameraOption {
    label: string;
    value: string;
    cameraId: string;
    server: MediaServerConfigItem;
}

interface VideoBlockProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pTableList?: { label: string; value: string }[];
}

export const VideoBlock = ({ pPanelOption, pSetPanelOption, pTableList = [] }: VideoBlockProps) => {
    const [sSelectTab, setSelectTab] = useState<string>('source');
    const [sCameraList, setCameraList] = useState<CameraOption[]>([]);
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);
    const sourceInfo: SourceInfoType = pPanelOption.chartOptions.source;
    const cameraOptionsRef = useRef<CameraOption[]>([]);

    const selectedCompositeValue = sCameraList.find(({ cameraId, server }) => (
        cameraId === sourceInfo.camera && server.id === sourceInfo.serverId
    ))?.value ?? '';

    // Fetch cameras from all media servers
    const fetchCameraList = useCallback(async () => {
        setIsLoadingCameras(true);
        try {
            const configs = await getMediaServerConfig();
            if (configs.length === 0) {
                cameraOptionsRef.current = [];
                setCameraList([]);
                return;
            }

            const allCameras: CameraOption[] = [];
            await Promise.all(
                configs.filter((config) => config.id).map(async (config) => {
                    try {
                        const base = getMediaServerBaseUrl(config);
                        const cameras = await loadCameras(base);
                        cameras.forEach((cam) => {
                            allCameras.push({
                                label: `${config.alias} / ${cam.label || cam.id}`,
                                value: JSON.stringify([config.id, cam.id]),
                                cameraId: cam.id,
                                server: config,
                            });
                        });
                    } catch {
                        // skip unreachable server
                    }
                })
            );
            cameraOptionsRef.current = allCameras;
            setCameraList(allCameras);
        } catch {
            setCameraList([]);
        } finally {
            setIsLoadingCameras(false);
        }
    }, []);

    useEffect(() => {
        fetchCameraList();
    }, [fetchCameraList]);

    const handleCameraChange = useCallback(
        (value: string) => {
            const selected = cameraOptionsRef.current.find((cam) => cam.value === value);
            if (!selected) return;

            pSetPanelOption((prev: any) => ({
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    source: {
                        ...prev.chartOptions.source,
                        camera: selected.cameraId,
                        serverId: selected.server.id,
                        serverIp: selected.server.ip,
                        serverPort: selected.server.port,
                        serverAlias: selected.server.alias,
                    },
                },
            }));
        },
        [pSetPanelOption]
    );

    const handleChange = <K extends keyof SourceInfoType>(key: K, value: SourceInfoType[K]) => {
        pSetPanelOption((prev: any) => {
            const prevSourceInfo = prev.chartOptions.source;
            const newSourceInfo = { ...prevSourceInfo, [key]: value };
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    source: newSourceInfo,
                },
            };
        });
    };

    // Dropdown-compatible list (label + value only)
    const dropdownCameraList = sCameraList.map(({ label, value }) => ({ label, value }));

    return (
        <>
            <Page.TabContainer>
                <Page.TabList>
                    <Page.TabItem active={sSelectTab === 'source'} onClick={() => setSelectTab('source')}>
                        Source
                    </Page.TabItem>
                    <Page.TabItem active={sSelectTab === 'events'} onClick={() => setSelectTab('events')}>
                        Events
                    </Page.TabItem>
                </Page.TabList>
            </Page.TabContainer>
            <Page.Body style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', border: '1px solid #b8c8da41', gap: '8px' }}>
                {sSelectTab === 'source' && (
                    <VideoBlockSource
                        sourceInfo={sourceInfo}
                        cameraList={dropdownCameraList}
                        tableList={pTableList}
                        isLoadingCameras={isLoadingCameras}
                        onChangeVideoInfo={handleChange}
                        onCameraChange={handleCameraChange}
                        selectedCompositeValue={selectedCompositeValue}
                    />
                )}
                {sSelectTab === 'events' && (
                    <VideoBlockEvents
                        sourceInfo={sourceInfo}
                        cameraList={dropdownCameraList}
                        tableList={pTableList}
                        isLoadingCameras={isLoadingCameras}
                        onChangeVideoInfo={handleChange}
                        onCameraChange={handleCameraChange}
                        selectedCompositeValue={selectedCompositeValue}
                    />
                )}
            </Page.Body>
        </>
    );
};
