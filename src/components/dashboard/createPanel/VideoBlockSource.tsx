import { Page, Dropdown } from '@/design-system/components';
import { VideoInfoType } from './VideoBlock';

interface VideoBlockSourceProps {
    videoInfo: VideoInfoType;
    cameraList: { label: string; value: string }[];
    tableList: { label: string; value: string }[];
    isLoadingCameras: boolean;
    onChangeVideoInfo: <K extends keyof VideoInfoType>(key: K, value: VideoInfoType[K]) => void;
}

export const VideoBlockSource = ({ videoInfo, cameraList, tableList, isLoadingCameras, onChangeVideoInfo }: VideoBlockSourceProps) => {
    return (
        <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
            <Page.DpRow style={{ gap: '4px', alignItems: 'start', flexWrap: 'wrap' }}>
                {/* Left column: Dropdowns */}
                <Page.ContentBlock pHoverNone style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <Dropdown.Root
                        label="Select Table"
                        options={tableList}
                        value={videoInfo.table}
                        onChange={(val) => onChangeVideoInfo('table', val)}
                        placeholder="Select a table"
                    >
                        <Dropdown.Trigger style={{ width: '200px' }} />
                        <Dropdown.Menu>
                            <Dropdown.List />
                        </Dropdown.Menu>
                    </Dropdown.Root>
                    <Dropdown.Root
                        label="Select Camera"
                        options={cameraList}
                        value={videoInfo.camera}
                        onChange={(val) => onChangeVideoInfo('camera', val)}
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
                            <Page.Switch pState={videoInfo.realtimeStream} pCallback={() => onChangeVideoInfo('realtimeStream', !videoInfo.realtimeStream)} />
                            <Page.ContentDesc>Live Mode on Start</Page.ContentDesc>
                        </Page.DpRow>
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone>
                        <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                            <Page.Switch pState={videoInfo.enableSync} pCallback={() => onChangeVideoInfo('enableSync', !videoInfo.enableSync)} />
                            <Page.ContentDesc>Enable Synchronization</Page.ContentDesc>
                        </Page.DpRow>
                    </Page.ContentBlock>
                </Page.ContentBlock>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};
