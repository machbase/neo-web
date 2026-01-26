import { Badge, Button, Dropdown, Input, Page, TextHighlight } from '@/design-system/components';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveBridge, gBoardList, gMediaServer, gSelectedTab } from '@/recoil/recoil';
import { BridgeItemType } from '@/api/repository/bridge';
import { useEffect, useState } from 'react';
import { GoPlus } from 'react-icons/go';
import { MediaSvrModal } from './mediaSvrModal';
import { FFmpegConfig, FFmpegConfigType, FFMPEG_DEFAULT_CONFIG } from './FFmpegConfig';

export type CameraPageMode = 'create' | 'edit';

export type CameraPageProps = {
    mode?: CameraPageMode;
    pCode?: BridgeItemType;
};

export const CameraPage = ({ mode = 'edit', pCode }: CameraPageProps) => {
    const isCreateMode = mode === 'create';
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveBridge);
    const [sPayload, setPayload] = useState<any>(pCode);
    const [isTableCreate, setTableCreate] = useState<boolean>(false);
    const sMediaServer = useRecoilValue(gMediaServer);
    const [isMediaSvrModalOpen, setIsMediaSvrModalOpen] = useState(false);
    const [ffmpegConfig, setFfmpegConfig] = useState<FFmpegConfigType>(FFMPEG_DEFAULT_CONFIG);

    const checkExistTab = (aType: string) => {
        const sResut = sBoardList.reduce((prev: boolean, cur: any) => {
            return prev || cur.type === aType;
        }, false);
        return sResut;
    };

    useEffect(() => {
        setPayload(pCode);
    }, [pCode]);

    return (
        <>
            {/* Show info */}
            {(isCreateMode || (sPayload && sActiveName !== '')) && (
                <Page>
                    <Page.Header />
                    <Page.Body footer>
                        <Page.ContentBlock pHoverNone pSticky style={{ padding: '12px 0 0 0' }}>
                            <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                                <Page.DpRow style={{ width: '100%', justifyContent: 'space-between' }}>
                                    {isCreateMode ? (
                                        <Page.SubTitle>New Camera</Page.SubTitle>
                                    ) : (
                                        <Page.DpRow style={{ gap: '8px' }}>
                                            <Page.SubTitle>CAM-01</Page.SubTitle>
                                            <Badge variant="success" showDot dotColor="primary" size="md">
                                                active
                                            </Badge>
                                        </Page.DpRow>
                                    )}
                                    <Button
                                        size="lg"
                                        variant="ghost"
                                        icon={
                                            <Badge variant="muted" style={{ cursor: 'pointer' }}>
                                                <TextHighlight variant="muted" style={{ cursor: 'pointer', width: '100%', display: 'flex' }}>
                                                    Media server
                                                </TextHighlight>
                                                <Page.Space pHeight="2px" />
                                                <TextHighlight variant="neutral" style={{ cursor: 'pointer' }}>
                                                    {sMediaServer.ip && sMediaServer.port ? `${sMediaServer.ip}:${sMediaServer.port}` : 'Not configured'}
                                                </TextHighlight>
                                            </Badge>
                                        }
                                        style={{ padding: '0', minHeight: 'auto' }}
                                        onClick={() => setIsMediaSvrModalOpen(true)}
                                    />
                                </Page.DpRow>
                                {!isCreateMode && (
                                    <>
                                        <Page.ContentDesc>
                                            <TextHighlight variant="primary">TABLE:</TextHighlight> CAM_TABLE
                                        </Page.ContentDesc>
                                        <Page.Space />
                                        <Page.ContentDesc>
                                            Adjust stream settings, hardware acceleration, and output formatting for the high-definition security node CAM-01. Changes made here
                                            impact live throughput and archival storage efficiency.
                                        </Page.ContentDesc>
                                    </>
                                )}
                            </Page.ContentBlock>
                            <Page.Divi spacing="0" />
                        </Page.ContentBlock>

                        {isCreateMode ? (
                            <Page.ContentBlock pHoverNone>
                                <Page.ContentTitle>Basic information</Page.ContentTitle>
                                <Page.ContentBlock pHoverNone>
                                    <Dropdown.Root
                                        label={
                                            <Page.DpRowBetween>
                                                Target table
                                                {isTableCreate ? null : (
                                                    <Button
                                                        variant="secondary"
                                                        size="xsm"
                                                        icon={<GoPlus size={16} />}
                                                        label={<TextHighlight variant="primary">create new table</TextHighlight>}
                                                        labelPosition="right"
                                                        onClick={() => {
                                                            setTableCreate(true);
                                                        }}
                                                    />
                                                )}
                                            </Page.DpRowBetween>
                                        }
                                        fullWidth
                                        options={[
                                            { label: 'CAM_TABLE', value: 'CAM_TABLE' },
                                            { label: 'VIDEO_LOG', value: 'VIDEO_LOG' },
                                        ]}
                                        placeholder="Select table"
                                        onChange={() => {}}
                                    >
                                        <Dropdown.Trigger />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                    {isTableCreate ? (
                                        <Page.ContentBlock pHoverNone>
                                            <Page.DpRow>
                                                <Button.Group style={{ alignItems: 'end' }}>
                                                    <Input label="Table name" />
                                                    <Button variant="primary" size="sm" style={{ height: '32px' }}>
                                                        Create
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        style={{ height: '32px' }}
                                                        onClick={() => {
                                                            setTableCreate(false);
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </Button.Group>
                                            </Page.DpRow>
                                        </Page.ContentBlock>
                                    ) : null}
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>
                                    <Input size="md" label="Camera name" placeholder="CAM-01" fullWidth value="" onChange={() => {}} />
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>
                                    <Input label="Description" placeholder="Enter camera description" fullWidth value="" onChange={() => {}} />
                                </Page.ContentBlock>
                            </Page.ContentBlock>
                        ) : null}

                        {/* conn info */}
                        <Page.ContentBlock pHoverNone>
                            <Page.ContentTitle>Connection parameters</Page.ContentTitle>
                            <Page.ContentBlock pHoverNone>
                                <Input label="RTSP URL" placeholder="rtsp://192.168.1.104:554" value="" onChange={() => {}} />
                            </Page.ContentBlock>
                            <Page.ContentBlock pHoverNone>
                                <Input label="webRTC URL" placeholder="https://192.168.1.104:554" value="" onChange={() => {}} />
                            </Page.ContentBlock>
                        </Page.ContentBlock>

                        {/* ffmpeg info */}
                        <FFmpegConfig value={ffmpegConfig} onChange={setFfmpegConfig} />
                    </Page.Body>
                    <Page.Footer>
                        <Page.DpRow style={{ justifyContent: 'end', width: '100%' }}>
                            <Button.Group>
                                {!isCreateMode && (
                                    <Button size="sm" variant="danger">
                                        Delete
                                    </Button>
                                )}
                                <Button size="sm">{isCreateMode ? 'Create' : 'Save'}</Button>
                            </Button.Group>
                        </Page.DpRow>
                    </Page.Footer>
                </Page>
            )}

            <MediaSvrModal isOpen={isMediaSvrModalOpen} onClose={() => setIsMediaSvrModalOpen(false)} initialIp={sMediaServer.ip} initialPort={sMediaServer.port} />
        </>
    );
};
