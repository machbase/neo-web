import { Dropdown, Page } from '@/design-system/components';
import { SourceInfoType } from './VideoBlock';

interface VideoBlockEventsProps {
    // TODO: Add props as needed
    sourceInfo: SourceInfoType;
    cameraList: { label: string; value: string }[];
    tableList: { label: string; value: string }[];
    isLoadingCameras: boolean;
    onChangeVideoInfo: <K extends keyof SourceInfoType>(key: K, value: SourceInfoType[K]) => void;
}

export const VideoBlockEvents = ({ cameraList, sourceInfo, isLoadingCameras, onChangeVideoInfo }: VideoBlockEventsProps) => {
    return (
        <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
            {/* 해당 선택 값은 source의 camera와 동일함 */}
            <Dropdown.Root
                label="Camera"
                options={cameraList}
                value={sourceInfo.camera}
                onChange={(val) => onChangeVideoInfo('camera', val)}
                placeholder={isLoadingCameras ? 'Loading...' : 'Select a camera'}
                disabled={!sourceInfo.table || isLoadingCameras}
                style={{ width: '200px' }}
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>
            <Page.Space />

            <Page.ContentDesc>Rule</Page.ContentDesc>

            <span>선택된 카메라 룰 리스트 (on/off) 룰은 n개 가능</span>
            <span>rule 추가 form</span>
            {/* <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                    <Page.Switch pState={sourceInfo.liveModeOnStart} pCallback={() => onChangeVideoInfo('liveModeOnStart', !sourceInfo.liveModeOnStart)} />
                    <Page.ContentDesc>Live Mode on Start</Page.ContentDesc>
                </Page.DpRow>
                <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                    <Page.Switch pState={sourceInfo.enableSync} pCallback={() => onChangeVideoInfo('enableSync', !sourceInfo.enableSync)} />
                    <Page.ContentDesc>Enable Synchronization</Page.ContentDesc>
                </Page.DpRow> */}
        </Page.ContentBlock>
    );
};
