import { useState, useEffect, useCallback, useRef } from 'react';
import { Page } from '@/design-system/components';
import { loadCameras, buildBaseUrl } from '@/components/dashboard/panels/video/utils/api';
import { getMediaServerConfig } from '@/api/repository/mediaSvr';
import { VideoBlockSource } from './VideoBlockSource';
import { VideoBlockEvents } from './VideoBlockEvents';

export interface SourceInfoType {
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
    value: string; // composite key: "alias::cameraId"
    serverIp: string;
    serverPort: number;
    serverAlias: string;
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

    // Build composite key from source info for dropdown value matching
    const selectedCompositeValue = sourceInfo.serverAlias
        ? `${sourceInfo.serverAlias}::${sourceInfo.camera}`
        : sourceInfo.camera;

    // Fetch cameras from all media servers
    const fetchCameraList = useCallback(async () => {
        setIsLoadingCameras(true);
        try {
            const configs = await getMediaServerConfig();
            if (configs.length === 0) {
                // Fallback: load from default server (backward compat)
                const cameras = await loadCameras();
                const options: CameraOption[] = cameras.map((cam) => ({
                    label: cam.label || cam.id,
                    value: cam.id,
                    serverIp: '',
                    serverPort: 0,
                    serverAlias: '',
                }));
                cameraOptionsRef.current = options;
                setCameraList(options);
                return;
            }

            const allCameras: CameraOption[] = [];
            await Promise.all(
                configs.map(async (config) => {
                    try {
                        const base = buildBaseUrl(config.ip, config.port);
                        const cameras = await loadCameras(base);
                        cameras.forEach((cam) => {
                            allCameras.push({
                                label: `${config.alias} / ${cam.label || cam.id}`,
                                value: `${config.alias}::${cam.id}`,
                                serverIp: config.ip,
                                serverPort: config.port,
                                serverAlias: config.alias,
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

    useEffect(() => {
        // Keep saved value when valid, otherwise choose the first available camera.
        if (sCameraList.length === 0) return;
        if (selectedCompositeValue && sCameraList.some((cam) => cam.value === selectedCompositeValue)) return;

        const first = sCameraList[0];
        const cameraId = first.value.includes('::') ? first.value.split('::').slice(1).join('::') : first.value;
        pSetPanelOption((prev: any) => ({
            ...prev,
            chartOptions: {
                ...prev.chartOptions,
                source: {
                    ...prev.chartOptions.source,
                    camera: cameraId,
                    serverIp: first.serverIp,
                    serverPort: first.serverPort,
                    serverAlias: first.serverAlias,
                },
            },
        }));
    }, [sCameraList, selectedCompositeValue, pSetPanelOption]);

    const handleCameraChange = useCallback(
        (compositeValue: string) => {
            const selected = cameraOptionsRef.current.find((cam) => cam.value === compositeValue);
            if (!selected) return;

            const cameraId = compositeValue.includes('::') ? compositeValue.split('::').slice(1).join('::') : compositeValue;

            pSetPanelOption((prev: any) => ({
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    source: {
                        ...prev.chartOptions.source,
                        camera: cameraId,
                        serverIp: selected.serverIp,
                        serverPort: selected.serverPort,
                        serverAlias: selected.serverAlias,
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
