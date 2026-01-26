import { useState, useEffect, useCallback } from 'react';
import { Page, Dropdown } from '@/design-system/components';
import { getCameraListByTable } from '@/api/repository/mediaSvr';

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
                </Page.TabList>
            </Page.TabContainer>
            <Page.Body style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', border: '1px solid #b8c8da41', gap: '8px' }}>
                {sSelectTab === 'source' && (
                    <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
                        <Page.DpRow style={{ gap: '4px', alignItems: 'start', flexWrap: 'wrap' }}>
                            {/* Left column: Dropdowns */}
                            <Page.ContentBlock pHoverNone style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                <Dropdown.Root
                                    label="Select Table"
                                    options={pTableList}
                                    value={videoInfo.table}
                                    onChange={(val) => handleChange('table', val)}
                                    placeholder="Select a table"
                                >
                                    <Dropdown.Trigger style={{ width: '200px' }} />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                                <Dropdown.Root
                                    label="Select Camera"
                                    options={sCameraList}
                                    value={videoInfo.camera}
                                    onChange={(val) => handleChange('camera', val)}
                                    placeholder={isLoadingCameras ? 'Loading...' : 'Select a camera'}
                                    disabled={!videoInfo.table || isLoadingCameras}
                                >
                                    <Dropdown.Trigger />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </Page.ContentBlock>

                            {/* Right column: Switches */}
                            <Page.ContentBlock pHoverNone>
                                <Page.ContentBlock pHoverNone>
                                    <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                                        <Page.Switch pState={videoInfo.realtimeStream} pCallback={() => handleChange('realtimeStream', !videoInfo.realtimeStream)} />
                                        <Page.ContentDesc>Real-time Stream</Page.ContentDesc>
                                    </Page.DpRow>
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>
                                    <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                                        <Page.Switch pState={videoInfo.enableSync} pCallback={() => handleChange('enableSync', !videoInfo.enableSync)} />
                                        <Page.ContentDesc>Enable Synchronization</Page.ContentDesc>
                                    </Page.DpRow>
                                </Page.ContentBlock>
                            </Page.ContentBlock>
                        </Page.DpRow>
                    </Page.ContentBlock>
                )}
            </Page.Body>
        </>
    );
};
