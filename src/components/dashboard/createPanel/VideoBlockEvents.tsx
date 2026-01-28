import { Page } from '@/design-system/components';

interface VideoBlockEventsProps {
    // TODO: Add props as needed
}

export const VideoBlockEvents = ({}: VideoBlockEventsProps) => {
    return (
        <Page.ContentBlock pHoverNone style={{ padding: '0' }}>
            <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                <Page.ContentDesc>Events configuration (Coming soon)</Page.ContentDesc>
            </Page.DpRow>
        </Page.ContentBlock>
    );
};
