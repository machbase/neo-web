import { Dropdown, Page } from '@/design-system/components';
import { SourceInfoType } from './VideoBlock';
import { EventsConfig } from '@/components/side/Camera/eventsConfig';

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
                disabled={isLoadingCameras}
                style={{ width: '200px' }}
            >
                <Dropdown.Trigger />
                <Dropdown.Menu>
                    <Dropdown.List />
                </Dropdown.Menu>
            </Dropdown.Root>

            <Page.Space pHeight="20px" />

            <EventsConfig />
        </Page.ContentBlock>
    );
};
