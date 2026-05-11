import { Input, Page, TextHighlight } from '@/design-system/components';
import { useRecoilValue } from 'recoil';
import { gMediaServer } from '@/recoil/recoil';
import { type MediaServerConfigItem } from '@/api/repository/mediaSvr';

export type ServerPageProps = {
    pCode?: MediaServerConfigItem;
};

export const ServerPage = ({ pCode }: ServerPageProps) => {
    const sMediaServer = useRecoilValue(gMediaServer);
    const config = pCode || sMediaServer;

    if (!config) return null;

    return (
        <Page>
            <Page.Header />
            <Page.Body>
                <Page.ContentBlock pHoverNone pSticky style={{ padding: '12px 0 0 0' }}>
                    <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                        <Page.DpRow style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Page.SubTitle>{config.alias || 'Unnamed Server'}</Page.SubTitle>
                        </Page.DpRow>
                    </Page.ContentBlock>
                    <Page.Divi spacing="0" />
                </Page.ContentBlock>

                <Page.ContentBlock pHoverNone>
                    <Page.DpRow style={{ textWrap: 'nowrap', gap: '20px' }}>
                        <Page.ContentTitle>Server Information</Page.ContentTitle>
                        <Page.Divi direction="horizontal" />
                    </Page.DpRow>
                    <Page.ContentBlock pHoverNone>
                        <Input label="Alias" value={config.alias} readOnly />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone>
                        <Input label="IP Address" value={config.ip} readOnly />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone>
                        <Input label="Port" value={String(config.port)} readOnly />
                    </Page.ContentBlock>
                    <Page.ContentBlock pHoverNone>
                        <Page.ContentDesc>
                            <TextHighlight variant="muted">
                                API Base URL: http://{config.ip}:{config.port}
                            </TextHighlight>
                        </Page.ContentDesc>
                    </Page.ContentBlock>
                </Page.ContentBlock>
            </Page.Body>
        </Page>
    );
};
