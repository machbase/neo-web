import { Dropdown, Page } from '@/design-system/components';
import { SourceInfoType } from './VideoBlock';
import { EventsConfig } from '@/components/side/Camera/eventsConfig';
import { resolveBaseUrl } from '@/components/dashboard/panels/video/utils/api';

interface VideoBlockEventsProps {
    sourceInfo: SourceInfoType;
    cameraList: { label: string; value: string }[];
    tableList: { label: string; value: string }[];
    isLoadingCameras: boolean;
    onChangeVideoInfo: <K extends keyof SourceInfoType>(key: K, value: SourceInfoType[K]) => void;
    onCameraChange: (compositeValue: string) => void;
    selectedCompositeValue: string;
}

export const VideoBlockEvents = ({ cameraList, sourceInfo, isLoadingCameras, onCameraChange, selectedCompositeValue }: VideoBlockEventsProps) => {
    const baseUrl = resolveBaseUrl(sourceInfo);

    return (
        <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
            <Dropdown.Root
                label="Camera"
                options={cameraList}
                value={selectedCompositeValue}
                onChange={(val) => onCameraChange(val)}
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

            <EventsConfig selectedCamera={sourceInfo.camera} baseUrl={baseUrl} />
        </Page.ContentBlock>
    );
};
