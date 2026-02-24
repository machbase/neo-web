import { Button, Input, Page, TextHighlight } from '@/design-system/components';
import { useRecoilValue } from 'recoil';
import { gMediaServer } from '@/recoil/recoil';
import { useState } from 'react';
import { MediaSvrModal } from './mediaSvrModal';
import { saveMediaServerConfig, getMediaServerConfig, type MediaServerConfigItem } from '@/api/repository/mediaSvr';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import { KEY_LOCAL_STORAGE_API_BASE } from '@/components/dashboard/panels/video/utils/api';

export type ServerPageProps = {
    pCode?: MediaServerConfigItem;
};

export const ServerPage = ({ pCode }: ServerPageProps) => {
    const sMediaServer = useRecoilValue(gMediaServer);
    const config = pCode || sMediaServer;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDelete = async () => {
        const configs = await getMediaServerConfig();
        const updated = configs.filter((c) => c.alias !== config.alias);
        await saveMediaServerConfig(updated);
        localStorage.setItem(KEY_LOCAL_STORAGE_API_BASE, JSON.stringify(updated));
        setIsDeleteModalOpen(false);
        window.location.reload();
    };

    return (
        <>
            {config && (
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
                    <Page.Footer>
                        <Page.DpRow style={{ justifyContent: 'end', width: '100%' }}>
                            <Button.Group>
                                <Button size="sm" onClick={() => setIsEditModalOpen(true)}>
                                    Edit
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                                    Delete
                                </Button>
                            </Button.Group>
                        </Page.DpRow>
                    </Page.Footer>
                </Page>
            )}

            <MediaSvrModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                mode="edit"
                initialIp={config.ip}
                initialPort={config.port}
                initialAlias={config.alias}
            />

            {isDeleteModalOpen && (
                <ConfirmModal
                    setIsOpen={setIsDeleteModalOpen}
                    pContents={
                        <>
                            Are you sure you want to delete server <strong>"{config.alias}"</strong>?
                        </>
                    }
                    pCallback={handleDelete}
                />
            )}
        </>
    );
};
