import { useState, useEffect, useCallback } from 'react';
import { Page } from '@/design-system/components';
import { getCameraListByTable } from '@/api/repository/mediaSvr';
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
        fetchCameraList(sourceInfo.table);
    }, [sourceInfo.table, fetchCameraList]);

    const handleChange = <K extends keyof SourceInfoType>(key: K, value: SourceInfoType[K]) => {
        pSetPanelOption((prev: any) => {
            const prevSourceInfo = prev.chartOptions.source;
            // Reset camera when table changes
            const newSourceInfo = key === 'table' ? { ...prevSourceInfo, [key]: value, camera: '' } : { ...prevSourceInfo, [key]: value };
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
