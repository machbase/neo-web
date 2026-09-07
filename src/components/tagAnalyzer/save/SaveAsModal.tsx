import {
    ArrowLeft,
    ArrowRight,
    Home,
    Play,
    SaveAs,
    TreeFolder,
} from '@/assets/icons/Icon';
import {
    Button,
    FileListHeader,
    Input,
    Modal,
    Toast,
} from '@/design-system/components';
import {
    elapsedSize,
    elapsedTime,
    extractionExtension,
} from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import icons from '@/utils/icons';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { tazFileApi, type FileListItem } from '../api/tazFileApi';
import { Inline, Stack, Text } from '../ui/Presentation';
import controls from '../ui/Controls.module.scss';
import './SaveAsModal.scss';

export function SaveAsModal({
    initialDirectoryPath,
    initialFileName,
    onClose,
    onSaveAs,
}: {
    initialDirectoryPath: string;
    initialFileName: string;
    onClose: () => void;
    onSaveAs: (directoryPath: string, fileName: string) => Promise<boolean>;
}) {
    const sInitialDirectory = useRef(
        normalizeDirectoryPath(initialDirectoryPath || '/')
            .split('/')
            .filter(Boolean),
    ).current;
    const [sSelectedDir, setSelectedDir] = useState(sInitialDirectory);
    const [sForwardDirStack, setForwardDirStack] = useState<string[]>([]);
    const [sSelectedFileName, setSelectedFileName] = useState('');
    const [sFileList, setFileList] = useState<FileListItem[]>();
    const [sSaveFileName, setSaveFileName] = useState(() =>
        resolveInitialFileName(initialFileName),
    );
    const [sIsDirectoryLoading, setIsDirectoryLoading] = useState(true);
    const [sIsSaving, setIsSaving] = useState(false);
    const sDirectoryRequestIdRef = useRef(0);

    const openDirectory = useCallback(async (
        directorySegments: string[],
        forwardDirStack: string[],
        closeOnError = false,
    ): Promise<void> => {
        const sRequestId = ++sDirectoryRequestIdRef.current;
        setIsDirectoryLoading(true);

        try {
            const sNextFileList = await tazFileApi.fetchTazFileList(directorySegments);
            if (sDirectoryRequestIdRef.current !== sRequestId) return;

            setSelectedDir(directorySegments);
            setSelectedFileName('');
            setForwardDirStack(forwardDirStack);
            setFileList(sNextFileList);
            setIsDirectoryLoading(false);
        } catch {
            if (sDirectoryRequestIdRef.current !== sRequestId) return;
            setIsDirectoryLoading(false);
            Toast.error(SAVE_AS_OPEN_ERROR_MESSAGE);
            if (closeOnError) onClose();
        }
    }, [onClose]);

    useEffect(() => {
        void openDirectory(sInitialDirectory, [], true);
        return () => {
            sDirectoryRequestIdRef.current += 1;
        };
    }, [openDirectory, sInitialDirectory]);

    function handleBackPath() {
        if (sSelectedDir.length === 0) return;
        const sRemovedSegment = sSelectedDir[sSelectedDir.length - 1];
        void openDirectory(
            sSelectedDir.slice(0, -1),
            sRemovedSegment
                ? [...sForwardDirStack, sRemovedSegment]
                : sForwardDirStack,
        );
    }

    function handleForwardPath() {
        const sNextDirectoryName = sForwardDirStack[sForwardDirStack.length - 1];
        if (!sNextDirectoryName) {
            return;
        }

        void openDirectory(
            [...sSelectedDir, sNextDirectoryName],
            sForwardDirStack.slice(0, -1),
        );
    }

    function handleSelectFile(
        event: MouseEvent<HTMLElement>,
        fileItem: FileListItem,
    ) {
        setSelectedFileName(fileItem.name);

        if (fileItem.type !== 'dir') {
            setSaveFileName(fileItem.name);
        }

        if (event.detail === 2 && fileItem.type === 'dir') {
            void openDirectory([...sSelectedDir, fileItem.name], []);
        }
    }

    async function handleSave() {
        if (
            sIsDirectoryLoading ||
            !sFileList ||
            !isValidTazFileName(sSaveFileName)
        ) {
            return;
        }

        const sExistingFile = sFileList.find(
            (fileItem) =>
                fileItem.type !== 'dir' && fileItem.name === sSaveFileName,
        );
        if (
            sExistingFile &&
            !window.confirm('Do you want to overwrite it?')
        ) {
            return;
        }

        const sDirectoryPath = buildDirectoryPath(sSelectedDir);

        setIsSaving(true);
        try {
            const sDidSave = await onSaveAs(sDirectoryPath, sSaveFileName);

            if (!sDidSave) {
                return;
            }

            onClose();
        } finally {
            setIsSaving(false);
        }
    }

    if (sFileList === undefined) return null;

    return (
        <Modal.Root
            isOpen
            onClose={onClose}
            size="md"
            data-testid="tag-analyzer-save-as-dialog"
        >
            <Modal.Header>
                <Modal.Title>
                    <SaveAs />
                    <span data-testid="tag-analyzer-save-as-title">
                        Save As
                    </span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Inline className="taz-save-as-modal__nav">
                <Button
                    data-testid="tag-analyzer-save-as-back-button"
                    size="sm"
                    variant="ghost"
                    active={sSelectedDir.length > 0}
                    isToolTip
                    toolTipContent="Backward"
                    icon={<ArrowLeft size={16} />}
                    onClick={handleBackPath}
                />
                <Button
                    data-testid="tag-analyzer-save-as-forward-button"
                    size="sm"
                    variant="ghost"
                    active={sForwardDirStack.length > 0}
                    isToolTip
                    toolTipContent="Forward"
                    icon={<ArrowRight size={16} />}
                    onClick={handleForwardPath}
                />
                <Input
                    data-testid="tag-analyzer-save-as-directory-path"
                    leftIcon={
                        <>
                            <Home size={14} />
                            <Play size={14} />
                        </>
                    }
                    fullWidth
                    value={sSelectedDir.join(' / ')}
                    readOnly
                />
            </Inline>
            <FileListHeader />
            <Modal.Body style={{ padding: 0 }}>
                <Stack gap={0} className="taz-save-as-modal__file-list">
                    {sFileList.map((fileItem) => (
                        <Inline
                            key={fileItem.name}
                            data-testid={`tag-analyzer-save-as-item-${encodeURIComponent(fileItem.name)}`}
                            className={`${controls.control} ${controls.selectable}`}
                            data-selected={sSelectedFileName === fileItem.name}
                            onClick={(event) => handleSelectFile(event, fileItem)}
                        >
                            <Inline className="taz-save-as-modal__column">
                                <Button
                                    forceOpacity
                                    disabled
                                    size="sm"
                                    variant="none"
                                    icon={fileItem.type === 'dir'
                                        ? fileItem.gitClone
                                            ? icons('gitClosedDirectory')
                                            : <TreeFolder />
                                        : icons(fileItem.type.replace('.', ''))}
                                />
                                <Text truncate>{fileItem.name}</Text>
                            </Inline>
                            <Text truncate tone="secondary" className="taz-save-as-modal__column">
                                {elapsedTime(fileItem.lastModifiedUnixMillis)}
                            </Text>
                            <Text truncate tone="secondary" className="taz-save-as-modal__column">
                                {elapsedSize(fileItem.size)}
                            </Text>
                        </Inline>
                    ))}
                </Stack>
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <Inline className="taz-save-as-modal__column">
                    <Input
                        data-testid="tag-analyzer-save-as-file-name-input"
                        label="File name"
                        labelPosition="left"
                        value={sSaveFileName}
                        onChange={(event) => setSaveFileName(event.target.value)}
                    />
                </Inline>
                <Button.Group>
                    <Modal.Cancel data-testid="tag-analyzer-save-as-cancel-button">
                        Cancel
                    </Modal.Cancel>
                    <Modal.Confirm
                        data-testid="tag-analyzer-save-as-submit-button"
                        disabled={
                            sIsDirectoryLoading ||
                            !isValidTazFileName(sSaveFileName) ||
                            sIsSaving
                        }
                        onClick={() => void handleSave()}
                    >
                        Save
                    </Modal.Confirm>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

// -------------------- Local --------------------

const SAVE_AS_OPEN_ERROR_MESSAGE = 'Failed to open Save As. Please try again.';

function buildDirectoryPath(directorySegments: string[]): string {
    return directorySegments.length === 0
        ? '/'
        : `/${directorySegments.join('/')}/`;
}

function isValidTazFileName(fileName: string): boolean {
    return FileNameAndExtensionValidator(fileName) &&
        extractionExtension(fileName) === 'taz';
}

function normalizeDirectoryPath(directoryPath: string): string {
    const sTrimmedPath = directoryPath.trim();
    if (sTrimmedPath === '') return '/';

    const sLeadingSlashPath = sTrimmedPath.startsWith('/')
        ? sTrimmedPath
        : `/${sTrimmedPath}`;

    return sLeadingSlashPath.endsWith('/')
        ? sLeadingSlashPath
        : `${sLeadingSlashPath}/`;
}

function resolveInitialFileName(initialFileName: string): string {
    if (initialFileName === '') return 'new.taz';

    return extractionExtension(initialFileName) === 'taz'
        ? initialFileName
        : `${initialFileName}.taz`;
}
