import { useState, useEffect, useCallback } from 'react';
import { Page } from '@/design-system/components';
import { loadCameras } from '@/components/dashboard/panels/video/utils/api';
import { VideoBlockSource } from './VideoBlockSource';
import { VideoBlockEvents } from './VideoBlockEvents';

export interface SourceInfoType {
    table: string;
    camera: string;
    liveModeOnStart: boolean;
    enableSync: boolean;
}
interface VideoBlockProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pTableList?: { label: string; value: string }[];
}

export const VideoBlock = ({ pPanelOption, pSetPanelOption, pTableList = [] }: VideoBlockProps) => {
    const [sSelectTab, setSelectTab] = useState<string>('source');
    const [sCameraList, setCameraList] = useState<{ label: string; value: string }[]>([]);
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);
    const sourceInfo: SourceInfoType = pPanelOption.chartOptions.source;
    // Fetch all cameras regardless of selected table
    const fetchCameraList = useCallback(async () => {
        setIsLoadingCameras(true);
        try {
            const cameras = await loadCameras();
            if (Array.isArray(cameras)) {
                setCameraList(
                    cameras.map((camera: { id: string; label?: string }) => ({
                        label: camera.label || camera.id,
                        value: camera.id,
                    }))
                );
            } else {
                setCameraList([]);
            }
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
        if (sourceInfo.camera && sCameraList.some((cam) => cam.value === sourceInfo.camera)) return;

        pSetPanelOption((prev: any) => {
            const prevSourceInfo = prev.chartOptions.source;
            return {
                ...prev,
                chartOptions: {
                    ...prev.chartOptions,
                    source: {
                        ...prevSourceInfo,
                        camera: sCameraList[0].value,
                    },
                },
            };
        });
    }, [sCameraList, sourceInfo.camera, pSetPanelOption]);

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
                        cameraList={sCameraList}
                        tableList={pTableList}
                        isLoadingCameras={isLoadingCameras}
                        onChangeVideoInfo={handleChange}
                    />
                )}
                {sSelectTab === 'events' && (
                    <VideoBlockEvents
                        sourceInfo={sourceInfo}
                        cameraList={sCameraList}
                        tableList={pTableList}
                        isLoadingCameras={isLoadingCameras}
                        onChangeVideoInfo={handleChange}
                    />
                )}
            </Page.Body>
        </>
    );
};
