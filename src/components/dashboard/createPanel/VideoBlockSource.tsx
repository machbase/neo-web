import { Page, Dropdown } from '@/design-system/components';
import { SourceInfoType } from './VideoBlock';

interface VideoBlockSourceProps {
    sourceInfo: SourceInfoType;
    cameraList: { label: string; value: string }[];
    tableList: { label: string; value: string }[];
    isLoadingCameras: boolean;
    onChangeVideoInfo: <K extends keyof SourceInfoType>(key: K, value: SourceInfoType[K]) => void;
}

export const VideoBlockSource = ({ sourceInfo, cameraList, isLoadingCameras, onChangeVideoInfo }: VideoBlockSourceProps) => {
    return (
        <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
            <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                <Dropdown.Root
                    label="Camera"
                    options={cameraList}
                    value={sourceInfo.camera}
                    onChange={(val) => onChangeVideoInfo('camera', val)}
                    placeholder={isLoadingCameras ? 'Loading...' : 'Select a camera'}
                    disabled={isLoadingCameras}
                    style={{ width: '200px' }}
                >
                    <Dropdown.Trigger />
                    <Dropdown.Menu>
                        <Dropdown.List />
                    </Dropdown.Menu>
                </Dropdown.Root>
            </Page.DpRow>
            <Page.Space />
            <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                <Page.Switch pState={sourceInfo.liveModeOnStart} pCallback={() => onChangeVideoInfo('liveModeOnStart', !sourceInfo.liveModeOnStart)} />
                <Page.ContentDesc>Live Mode on Start</Page.ContentDesc>
            </Page.DpRow>
            <Page.Space />
            <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                <Page.Switch pState={sourceInfo.enableSync} pCallback={() => onChangeVideoInfo('enableSync', !sourceInfo.enableSync)} />
                <Page.ContentDesc>Enable Synchronization</Page.ContentDesc>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};
