import { Button, Checkbox, Dropdown, Input, Page, TextHighlight } from '@/design-system/components';
import { DetectObjectPicker } from './DetectObjectPicker';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { gActiveCamera, gMediaServer, gCameraList, gBoardList, gSelectedTab, gCameraHealthTrigger } from '@/recoil/recoil';
import { useCallback, useEffect, useState } from 'react';
import { MdRefresh } from 'react-icons/md';
import { CreateTableModal } from './CreateTableModal';
import { FFmpegConfig, FFmpegConfigType, FFMPEG_DEFAULT_CONFIG } from './FFmpegConfig';
import { EventsConfig } from './eventsConfig';
import { ConfirmModal } from '@/components/modal/ConfirmModal';
import {
    getTables,
    getDetects,
    createCamera,
    getCamera,
    getCameraStatus,
    CameraCreateRequest,
    CameraInfo,
    CameraStatusType,
    CameraUpdateRequest,
    updateCamera,
    updateCameraDetectObjects,
    getCameraDetectObjects,
    deleteCamera,
    enableCamera,
    disableCamera,
} from '@/api/repository/mediaSvr';
import { buildBaseUrl } from '@/components/dashboard/panels/video/utils/api';

export type CameraPageMode = 'create' | 'edit';

export type CameraPageProps = {
    mode?: CameraPageMode;
    pCode?: CameraInfo;
};

export enum E_CAMERA {
    KEY = 'camera_id',
}

export const CameraPage = ({ mode = 'edit', pCode }: CameraPageProps) => {
    const isCreateMode = mode === 'create';
    const isEditMode = mode === 'edit';
    const baseUrl = pCode && pCode?.ip ? buildBaseUrl(pCode?.ip, pCode?.port) : undefined;
    const svrName = pCode ? pCode?.alias : undefined;
    const setSelectedTab = useSetRecoilState<any>(gSelectedTab);
    const [sBoardList, setBoardList] = useRecoilState<any[]>(gBoardList);
    const [sActiveName, setActiveName] = useRecoilState<any>(gActiveCamera);
    const setCameraList = useSetRecoilState<any>(gCameraList);
    const [sPayload, setPayload] = useState<any>(pCode);
    const [isCreateTableModalOpen, setIsCreateTableModalOpen] = useState<boolean>(false);
    const sMediaServer = useRecoilValue(gMediaServer);
    const setCameraHealthTrigger = useSetRecoilState(gCameraHealthTrigger);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [ffmpegConfig, setFfmpegConfig] = useState<FFmpegConfigType>(FFMPEG_DEFAULT_CONFIG);
    const [tableList, setTableList] = useState<string[]>([]);
    const [detectList, setDetectList] = useState<string[]>([]);

    // Form state
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [newTableName, setNewTableName] = useState<string>('');
    const [cameraName, setCameraName] = useState<string>('');
    const [cameraDesc, setCameraDesc] = useState<string>('');
    const [rtspUrl, setRtspUrl] = useState<string>(`rtsp://${pCode?.ip ?? '{IP}'}:${pCode?.port ?? '{PORT}'}/live`);
    const [webrtcUrl, setWebrtcUrl] = useState<string>(`http://${pCode?.ip ?? '{IP}'}:${pCode?.port ?? '{PORT}'}/live/whep`);

    // AI Model state
    const [detectObjects, setDetectObjects] = useState<string[]>([]);
    const [saveObjects, setSaveObjects] = useState<boolean>(false);

    // Validation state
    const [cameraNameError, setCameraNameError] = useState<string>('');

    // Camera status state
    const [cameraStatus, setCameraStatus] = useState<CameraStatusType>('stopped');

    const handleAddDetectObject = async (name: string) => {
        if (!detectObjects.includes(name)) {
            const newDetectObjects = [...detectObjects, name];
            setDetectObjects(newDetectObjects);

            // Update API in real-time for edit mode
            if (isEditMode && pCode) {
                try {
                    const res = await updateCameraDetectObjects(pCode[E_CAMERA.KEY], {
                        detect_objects: newDetectObjects,
                    }, baseUrl);
                    if (!res.success) {
                        console.error('Failed to update detect objects:', res.reason);
                    }
                } catch (err) {
                    console.error('Failed to update detect objects:', err);
                }
            }
        }
    };

    const handleRemoveDetectObject = async (name: string) => {
        const newDetectObjects = detectObjects.filter((d) => d !== name);
        setDetectObjects(newDetectObjects);

        // Update API in real-time for edit mode
        if (isEditMode && pCode) {
            try {
                const res = await updateCameraDetectObjects(pCode[E_CAMERA.KEY], {
                    detect_objects: newDetectObjects,
                }, baseUrl);
                if (!res.success) {
                    console.error('Failed to update detect objects:', res.reason);
                }
            } catch (err) {
                console.error('Failed to update detect objects:', err);
            }
        }
    };

    const fetchTables = useCallback(async () => {
        try {
            const res = await getTables(baseUrl);
            if (res.success && res.data?.tables) {
                const tables: string[] = res.data?.tables;
                setTableList(tables);

                // If tables exist, set first table as default
                if (tables.length > 0) {
                    setSelectedTable(tables[0]);
                } else {
                    // If no tables exist, open create table modal
                    setIsCreateTableModalOpen(true);
                }
            }
        } catch (err) {
            console.error('Failed to fetch tables:', err);
        }
    }, []);

    const fetchDetects = useCallback(async () => {
        try {
            const res = await getDetects(baseUrl);
            if (res.success && res.data?.detect_objects) {
                setDetectList(res.data.detect_objects);
            }
        } catch (err) {
            console.error('Failed to fetch detects:', err);
        }
    }, []);

    const fetchCameraStatus = useCallback(async (id: string) => {
        try {
            const res = await getCameraStatus(id, baseUrl);
            if (res.success && res.data?.status) {
                setCameraStatus(res.data.status);
            }
        } catch (err) {
            console.error('Failed to fetch camera status:', err);
        }
    }, []);

    const fetchCameraDetectObjects = useCallback(async () => {
        if (!pCode?.[E_CAMERA.KEY]) {
            setDetectObjects([]);
            return;
        }
        try {
            const res = await getCameraDetectObjects(pCode[E_CAMERA.KEY], baseUrl);
            setDetectObjects(res.success ? res.data?.detect_objects ?? [] : []);
        } catch (err) {
            console.error('Failed to fetch camera detect objects:', err);
            setDetectObjects([]);
        }
    }, [pCode]);

    const handleToggleCameraStatus = useCallback(async () => {
        if (!pCode?.[E_CAMERA.KEY]) return;
        try {
            const res = cameraStatus === 'running' ? await disableCamera(pCode[E_CAMERA.KEY], baseUrl) : await enableCamera(pCode[E_CAMERA.KEY], baseUrl);
            if (res.success) {
                fetchCameraStatus(pCode[E_CAMERA.KEY]);
                setCameraHealthTrigger((prev) => prev + 1);
            }
        } catch (err) {
            console.error('Failed to toggle camera status:', err);
        }
    }, [pCode, cameraStatus, fetchCameraStatus]);

    const handleTableCreated = useCallback((tableName: string) => {
        setTableList((prevList) => [...prevList, tableName]);
        setSelectedTable(tableName);
    }, []);

    const closeCurrentTab = useCallback(() => {
        const cameraTab = sBoardList.find((board: any) => board.type === 'camera');
        if (cameraTab) {
            const updatedBoardList = sBoardList.filter((board: any) => board.id !== cameraTab.id);
            setBoardList(updatedBoardList);
            if (updatedBoardList.length > 0) {
                setSelectedTab(updatedBoardList[0].id);
            }
        }
        setActiveName('');
    }, [sBoardList, setBoardList, setSelectedTab, setActiveName]);

    // create | update
    const handleCreate = useCallback(async () => {
        setCameraNameError(!cameraName ? 'Camera name is required' : '');
        if (!selectedTable || !cameraName) {
            return;
        }

        setIsLoading(true);
        try {
            const payload: CameraCreateRequest = {
                table: selectedTable,
                name: cameraName,
                desc: cameraDesc || undefined,
                rtsp_url: rtspUrl || undefined,
                webrtc_url: webrtcUrl || undefined,
                model_id: 0, // FIX 0
                detect_objects: detectObjects.length > 0 ? detectObjects : undefined,
                save_objects: saveObjects,
                ffmpeg_options: [
                    { k: 'rtsp_transport', v: ffmpegConfig.rtspTransport },
                    { k: 'rtsp_flags', v: ffmpegConfig.rtspFlags },
                    { k: 'buffer_size', v: String(ffmpegConfig.bufferSize) },
                    { k: 'max_delay', v: String(ffmpegConfig.maxDelay) },
                    { k: 'probesize', v: String(ffmpegConfig.probesize) },
                    { k: 'analyzeduration', v: String(ffmpegConfig.analyzeduration) },
                    { k: 'use_wallclock_as_timestamps', v: ffmpegConfig.useWallclockAsTimestamps },
                    { k: 'c:v', v: ffmpegConfig.videoCodec },
                    { k: 'f', v: ffmpegConfig.format },
                    { k: 'seg_duration', v: String(ffmpegConfig.segDuration) },
                    { k: 'use_template', v: ffmpegConfig.useTemplate ? '1' : '0' },
                    { k: 'use_timeline', v: ffmpegConfig.useTimeline ? '1' : '0' },
                ],
                ffmpeg_command: ffmpegConfig.ffmpegCommand || undefined,
                output_dir: ffmpegConfig.outputDir || undefined,
                archive_dir: ffmpegConfig.archiveDir || undefined,
            };

            const res = await createCamera(payload, baseUrl);
            if (res.success && res.data) {
                const createdCamera = res.data;

                const serverAlias = pCode?.alias ?? '';

                // 1. Add new camera to gCameraList (hierarchy: serverAlias -> CameraItem[])
                setCameraList((prev: Record<string, any[]>) => ({
                    ...prev,
                    [serverAlias]: [...(prev[serverAlias] ?? []), { id: createdCamera.camera_id, label: createdCamera.name }],
                }));

                // 2. Set gActiveCamera to the newly created camera (composite key: alias::cameraId)
                setActiveName(`${serverAlias}::${createdCamera.camera_id}`);

                // 3. Fetch full camera detail from server (same as openInfo flow)
                const baseUrl = pCode?.ip ? buildBaseUrl(pCode.ip, pCode.port) : undefined;
                const detailRes = await getCamera(createdCamera.camera_id, baseUrl);
                const fullCamera =
                    detailRes.success && detailRes.data
                        ? { ...detailRes.data, ip: pCode?.ip, port: pCode?.port, alias: serverAlias }
                        : { ...createdCamera, ip: pCode?.ip, port: pCode?.port, alias: serverAlias };

                // 4. Update current tab to edit mode with full camera data
                const currentTab = sBoardList.find((board: any) => board.type === 'camera' && board.mode === 'create');
                if (currentTab) {
                    setBoardList((prevList: any[]) =>
                        prevList.map((board: any) =>
                            board.id === currentTab.id
                                ? {
                                      ...board,
                                      name: `CAMERA: ${createdCamera.camera_id}`,
                                      mode: 'edit',
                                      code: fullCamera,
                                      savedCode: fullCamera,
                                  }
                                : board
                        )
                    );
                }
            } else {
                console.error('Failed to create camera:', res.reason);
            }
        } catch (err) {
            console.error('Failed to create camera:', err);
        } finally {
            setIsLoading(false);
        }
    }, [selectedTable, cameraName, cameraDesc, rtspUrl, webrtcUrl, detectObjects, saveObjects, ffmpegConfig, setCameraList, setActiveName, sBoardList, setBoardList]);

    const handleUpdate = useCallback(async () => {
        const payload: CameraUpdateRequest = {
            desc: cameraDesc || undefined,
            rtsp_url: rtspUrl || undefined,
            webrtc_url: webrtcUrl || undefined,
            model_id: 0, // FIX 0
            detect_objects: detectObjects.length > 0 ? detectObjects : undefined,
            save_objects: saveObjects,
            ffmpeg_options: [
                { k: 'rtsp_transport', v: ffmpegConfig.rtspTransport },
                { k: 'rtsp_flags', v: ffmpegConfig.rtspFlags },
                { k: 'buffer_size', v: String(ffmpegConfig.bufferSize) },
                { k: 'max_delay', v: String(ffmpegConfig.maxDelay) },
                { k: 'probesize', v: String(ffmpegConfig.probesize) },
                { k: 'analyzeduration', v: String(ffmpegConfig.analyzeduration) },
                { k: 'use_wallclock_as_timestamps', v: ffmpegConfig.useWallclockAsTimestamps },
                { k: 'c:v', v: ffmpegConfig.videoCodec },
                { k: 'f', v: ffmpegConfig.format },
                { k: 'seg_duration', v: String(ffmpegConfig.segDuration) },
                { k: 'use_template', v: ffmpegConfig.useTemplate ? '1' : '0' },
                { k: 'use_timeline', v: ffmpegConfig.useTimeline ? '1' : '0' },
            ],
            ffmpeg_command: ffmpegConfig.ffmpegCommand || undefined,
            output_dir: ffmpegConfig.outputDir || undefined,
            archive_dir: ffmpegConfig.archiveDir || undefined,
        };
        setIsLoading(true);
        try {
            // Update camera general information
            // Note: detect_objects are updated in real-time via handleAddDetectObject/handleRemoveDetectObject
            const cameraRes = await updateCamera(pCode![E_CAMERA.KEY], payload, baseUrl);
            if (!cameraRes.success) {
                console.error('Failed to update camera:', cameraRes.reason);
                return;
            }

            // TODO: handle success (e.g., navigate, show toast, etc.)
        } catch (err) {
            console.error('Failed to update camera:', err);
        } finally {
            setIsLoading(false);
        }
    }, [cameraDesc, rtspUrl, webrtcUrl, detectObjects, saveObjects, ffmpegConfig, pCode]);

    const handleDeleteClick = useCallback(() => {
        if (!pCode?.[E_CAMERA.KEY]) {
            console.error('No camera ID available for deletion');
            return;
        }
        setIsDeleteModalOpen(true);
    }, [pCode]);

    const handleConfirmDelete = useCallback(async () => {
        if (!pCode?.[E_CAMERA.KEY]) {
            return;
        }

        const cameraId = pCode[E_CAMERA.KEY];

        try {
            const res = await deleteCamera(cameraId, baseUrl);
            if (res.success) {
                setIsDeleteModalOpen(false);

                // Update Recoil states
                // 1. Remove camera from gCameraList
                const serverAlias = pCode?.alias ?? '';
                setCameraList((prev: Record<string, any[]>) => ({
                    ...prev,
                    [serverAlias]: (prev[serverAlias] ?? []).filter((camera: any) => camera.id !== cameraId),
                }));

                // 2. Close camera tab
                closeCurrentTab();
            } else {
                console.error('Failed to delete camera:', res.reason);
            }
        } catch (err) {
            console.error('Failed to delete camera:', err);
        }
    }, [pCode, sBoardList, setCameraList, setActiveName, setBoardList, setSelectedTab]);

    useEffect(() => {
        setPayload(pCode);

        // Reset all form state
        setSelectedTable('');
        setNewTableName('');
        setCameraName('');
        setCameraDesc('');
        setDetectObjects([]);
        setSaveObjects(false);
        setFfmpegConfig({ ...FFMPEG_DEFAULT_CONFIG });
        setCameraStatus('stopped');

        if (isCreateMode) {
            // Create mode: set default URL templates
            setRtspUrl(`rtsp://${pCode?.ip ?? ''}:${pCode?.port ?? ''}/live`);
            setWebrtcUrl(`http://${pCode?.ip ?? ''}:${pCode?.port ?? ''}/live/whep`);
        } else if (isEditMode && pCode) {
            // Edit mode: initialize empty, then populate from server data
            setRtspUrl(pCode.rtsp_url ?? '');
            setWebrtcUrl(pCode.webrtc_url ?? '');
            setNewTableName(pCode.table ?? '');
            setCameraName(pCode.name ?? '');
            setCameraDesc(pCode.desc ?? '');
            setDetectObjects(pCode.detect_objects ?? []);
            if (pCode.save_objects !== undefined) setSaveObjects(pCode.save_objects);

            // Populate ffmpegConfig from pCode.ffmpeg_options
            if (pCode.ffmpeg_options) {
                const newFfmpegConfig: FFmpegConfigType = { ...FFMPEG_DEFAULT_CONFIG };

                // Convert array of {k, v} to config object
                pCode.ffmpeg_options.forEach((option) => {
                    const { k, v } = option;
                    switch (k) {
                        case 'rtsp_transport':
                            newFfmpegConfig.rtspTransport = String(v || '');
                            break;
                        case 'rtsp_flags':
                            newFfmpegConfig.rtspFlags = String(v || '');
                            break;
                        case 'buffer_size':
                            newFfmpegConfig.bufferSize = Number(v) || 0;
                            break;
                        case 'max_delay':
                            newFfmpegConfig.maxDelay = Number(v) || 0;
                            break;
                        case 'probesize':
                            newFfmpegConfig.probesize = Number(v) || 0;
                            break;
                        case 'analyzeduration':
                            newFfmpegConfig.analyzeduration = Number(v) || 0;
                            break;
                        case 'use_wallclock_as_timestamps':
                            newFfmpegConfig.useWallclockAsTimestamps = String(v || '');
                            break;
                        case 'c:v':
                            newFfmpegConfig.videoCodec = String(v || '');
                            break;
                        case 'f':
                            newFfmpegConfig.format = String(v || '');
                            break;
                        case 'seg_duration':
                            newFfmpegConfig.segDuration = Number(v) || 0;
                            break;
                        case 'use_template':
                            newFfmpegConfig.useTemplate = v === '1' || v === 1;
                            break;
                        case 'use_timeline':
                            newFfmpegConfig.useTimeline = v === '1' || v === 1;
                            break;
                    }
                });

                // Set additional ffmpeg fields
                if (pCode.ffmpeg_command) newFfmpegConfig.ffmpegCommand = pCode.ffmpeg_command;
                if (pCode.output_dir) newFfmpegConfig.outputDir = pCode.output_dir;
                if (pCode.archive_dir) newFfmpegConfig.archiveDir = pCode.archive_dir;

                setFfmpegConfig(newFfmpegConfig);
            }

            // Fetch camera status
            if (pCode[E_CAMERA.KEY]) {
                fetchCameraStatus(pCode[E_CAMERA.KEY]);
            }
        }
    }, [pCode, mode, fetchCameraStatus]);

    useEffect(() => {
        // Only fetch tables in create mode
        if (isCreateMode) {
            fetchTables();
        }
        fetchDetects();
    }, [isCreateMode, fetchTables, fetchDetects]);

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
                                        <Page.DpRow style={{ gap: '8px' }}>
                                            <Page.SubTitle>New Camera</Page.SubTitle>
                                        </Page.DpRow>
                                    ) : (
                                        <Page.DpRow style={{ gap: '8px' }}>
                                            <Page.SubTitle>{cameraName}</Page.SubTitle>
                                            <Page.DpRow style={{ gap: '8px', alignItems: 'center' }}>
                                                <Page.Switch pState={cameraStatus === 'running'} pCallback={handleToggleCameraStatus} />
                                                <TextHighlight variant={cameraStatus === 'running' ? 'neutral' : 'muted'} style={{ cursor: 'pointer', fontSize: '12px' }}>
                                                    {cameraStatus === 'running' ? 'Enabled' : 'Disabled'}
                                                </TextHighlight>
                                            </Page.DpRow>
                                        </Page.DpRow>
                                    )}
                                </Page.DpRow>
                                <Page.DpRow style={{ flexDirection: 'column', alignItems: 'start', paddingBottom: '8px' }}>
                                    <TextHighlight>{svrName}</TextHighlight>
                                    <TextHighlight variant="muted" style={{ fontSize: '12px' }}>
                                        {baseUrl}
                                    </TextHighlight>
                                </Page.DpRow>
                                {!isCreateMode && (
                                    <>
                                        <Page.ContentDesc>
                                            <TextHighlight variant="primary">TABLE:</TextHighlight> {newTableName}
                                        </Page.ContentDesc>
                                        <Page.Space />
                                        <Page.ContentDesc>{cameraDesc}</Page.ContentDesc>
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
                                        disabled
                                        fullWidth
                                        options={tableList.map((table) => ({ label: table, value: table }))}
                                        placeholder="Select table"
                                        value={selectedTable}
                                        onChange={(val) => setSelectedTable(val)}
                                        label={<span style={{ fontSize: '12px', fontWeight: 500 }}>Target table</span>}
                                    >
                                        <Dropdown.Trigger />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>
                                    <Input
                                        size="md"
                                        label={
                                            <>
                                                Camera name <span style={{ color: 'var(--color-danger, #e74c3c)' }}>*</span>
                                            </>
                                        }
                                        placeholder="CAM-01"
                                        fullWidth
                                        value={cameraName}
                                        error={cameraNameError}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v === '' || /^[^!@#$%^&*()+=\[\]{};:'",<>?/\\|`~\s]+$/.test(v)) {
                                                setCameraName(v);
                                                if (cameraNameError) setCameraNameError('');
                                            }
                                        }}
                                    />
                                </Page.ContentBlock>
                                <Page.ContentBlock pHoverNone>
                                    <Input
                                        label="Description"
                                        placeholder="Enter camera description"
                                        fullWidth
                                        value={cameraDesc}
                                        onChange={(e) => setCameraDesc(e.target.value)}
                                    />
                                </Page.ContentBlock>
                            </Page.ContentBlock>
                        ) : null}

                        {/* conn info */}
                        <Page.ContentBlock pHoverNone>
                            <Page.DpRow style={{ textWrap: 'nowrap', gap: '20px' }}>
                                <Page.ContentTitle>Connection parameters</Page.ContentTitle>
                                <Page.Divi direction="horizontal" />
                            </Page.DpRow>
                            <Page.ContentBlock pHoverNone>
                                <Input
                                    label="RTSP URL (for webcam)"
                                    placeholder={`rtsp://${sMediaServer?.ip ?? '192.168.0.87'}:8554/live`}
                                    value={rtspUrl}
                                    onChange={(e) => setRtspUrl(e.target.value)}
                                />
                            </Page.ContentBlock>
                            <Page.ContentBlock pHoverNone>
                                <Input
                                    label="webRTC URL (for realtime)"
                                    placeholder={`http://${sMediaServer?.ip ?? '192.,168.0.87'}:8889/live/whep`}
                                    value={webrtcUrl}
                                    onChange={(e) => setWebrtcUrl(e.target.value)}
                                />
                            </Page.ContentBlock>
                        </Page.ContentBlock>

                        {/* model info */}
                        <Page.ContentBlock pHoverNone>
                            <Page.DpRow style={{ textWrap: 'nowrap', gap: '20px' }}>
                                <Page.ContentTitle>Detect information</Page.ContentTitle>
                                <Page.Divi direction="horizontal" />
                            </Page.DpRow>
                            <Page.ContentBlock pHoverNone>
                                <Page.DpRow style={{ gap: '4px', alignItems: 'center', marginBottom: '8px' }}>
                                    <TextHighlight variant="muted" style={{ fontSize: '12px' }}>
                                        Detect objects
                                    </TextHighlight>
                                    <Button variant="ghost" size="xsm" icon={<MdRefresh size={16} />} onClick={fetchDetects} />
                                </Page.DpRow>
                                <DetectObjectPicker items={detectObjects} options={detectList} onAdd={handleAddDetectObject} onRemove={handleRemoveDetectObject} />
                            </Page.ContentBlock>
                            <Page.ContentBlock pHoverNone>
                                <Checkbox
                                    size="sm"
                                    label="Save detection results"
                                    helperText="Enable to save AI detection results to database"
                                    checked={saveObjects}
                                    onChange={(e) => setSaveObjects(e.target.checked)}
                                />
                            </Page.ContentBlock>
                        </Page.ContentBlock>

                        {/* event info */}
                        {pCode && isEditMode ? (
                            <Page.ContentBlock pHoverNone style={{ margin: 0 }}>
                                <EventsConfig selectedCamera={pCode[E_CAMERA.KEY]} onDetectObjectsChange={fetchCameraDetectObjects} baseUrl={baseUrl} />
                            </Page.ContentBlock>
                        ) : null}

                        {/* ffmpeg info */}
                        <FFmpegConfig value={ffmpegConfig} onChange={setFfmpegConfig} />
                    </Page.Body>
                    <Page.Footer>
                        <Page.DpRow style={{ justifyContent: 'end', width: '100%' }}>
                            <Button.Group>
                                <Button size="sm" onClick={isCreateMode ? handleCreate : handleUpdate} loading={isLoading} disabled={isLoading}>
                                    {isCreateMode ? 'Create' : 'Save'}
                                </Button>
                                {!isCreateMode && (
                                    <Button size="sm" variant="danger" onClick={handleDeleteClick} disabled={isLoading}>
                                        Delete
                                    </Button>
                                )}
                            </Button.Group>
                        </Page.DpRow>
                    </Page.Footer>
                </Page>
            )}

            <CreateTableModal
                isOpen={isCreateTableModalOpen}
                onClose={() => {
                    setIsCreateTableModalOpen(false);
                    // If no tables exist, close camera create page
                    if (tableList.length === 0) closeCurrentTab();
                }}
                onCreated={handleTableCreated}
                baseUrl={baseUrl}
            />

            {isDeleteModalOpen && (
                <ConfirmModal
                    setIsOpen={setIsDeleteModalOpen}
                    pContents={
                        <>
                            Are you sure you want to delete camera <strong>"{cameraName}"</strong>?
                            <br />
                            This action cannot be undone.
                        </>
                    }
                    pCallback={handleConfirmDelete}
                />
            )}
        </>
    );
};
