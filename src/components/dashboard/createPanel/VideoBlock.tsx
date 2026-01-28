import { useState, useEffect, useCallback } from 'react';
import { Page } from '@/design-system/components';
import { getCameraListByTable } from '@/api/repository/mediaSvr';
import { VideoBlockSource } from './VideoBlockSource';
import { VideoBlockEvents } from './VideoBlockEvents';

export interface VideoInfoType {
    table: string;
    camera: string;
    realtimeStream: boolean;
    enableSync: boolean;
}

export const VIDEO_INFO_DEFAULT: VideoInfoType = {
    table: '',
    camera: '',
    realtimeStream: false,
    enableSync: false,
};

interface VideoBlockProps {
    pPanelOption: any;
    pSetPanelOption: any;
    pTableList?: { label: string; value: string }[];
}

export const VideoBlock = ({ pPanelOption, pSetPanelOption, pTableList = [] }: VideoBlockProps) => {
    const [sSelectTab, setSelectTab] = useState<string>('source');
    const [sCameraList, setCameraList] = useState<{ label: string; value: string }[]>([]);
    const [isLoadingCameras, setIsLoadingCameras] = useState(false);

    const videoInfo: VideoInfoType = pPanelOption.videoInfo ?? VIDEO_INFO_DEFAULT;

    // Fetch camera list when table is selected
    const fetchCameraList = useCallback(async (tableName: string) => {
        if (!tableName) {
            setCameraList([]);
            return;
        }

        setIsLoadingCameras(true);
        try {
            const response = await getCameraListByTable(tableName);
            if (response?.success && response?.data) {
                const cameras = response.data.map((camera: { name: string; id: string }) => ({
                    label: camera.name,
                    value: camera.id,
                }));
                setCameraList(cameras);
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
        fetchCameraList(videoInfo.table);
    }, [videoInfo.table, fetchCameraList]);

    const handleChange = <K extends keyof VideoInfoType>(key: K, value: VideoInfoType[K]) => {
        pSetPanelOption((prev: any) => {
            const prevVideoInfo = prev.videoInfo ?? VIDEO_INFO_DEFAULT;
            // Reset camera when table changes
            const newVideoInfo = key === 'table' ? { ...prevVideoInfo, [key]: value, camera: '' } : { ...prevVideoInfo, [key]: value };
            return {
                ...prev,
                videoInfo: newVideoInfo,
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
                        videoInfo={videoInfo}
                        cameraList={sCameraList}
                        tableList={pTableList}
                        isLoadingCameras={isLoadingCameras}
                        onChangeVideoInfo={handleChange}
                    />
                )}
                {sSelectTab === 'events' && <VideoBlockEvents />}
            </Page.Body>
        </>
    );
};
