import { ArrowLeft, ArrowRight, Home, Play, SaveAs, TreeFolder } from '@/assets/icons/Icon';
import {
    Button,
    FileListHeader,
    Input,
    Modal,
    Toast,
} from '@/design-system/components';
import { elapsedSize, elapsedTime, extractionExtension } from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import icons from '@/utils/icons';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { tazFileApi, type FileListItem } from '../api/tazFileApi';
import './Board.scss';

const SAVE_AS_OPEN_ERROR_MESSAGE = 'Failed to open Save As. Please try again.';

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
        if (sSelectedDir.length === 0) {
            return;
        }

        const sCurrentSegments = [...sSelectedDir];
        const sRemovedSegment = sCurrentSegments.pop();

        void openDirectory(
            sCurrentSegments,
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
        event: MouseEvent<HTMLDivElement>,
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
        <Modal.Root isOpen onClose={onClose} size="md">
            <Modal.Header>
                <Modal.Title>
                    <SaveAs />
                    <span>Save As</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <div className="taz-save-as-modal__nav">
                <Button
                    size="sm"
                    variant="ghost"
                    active={sSelectedDir.length > 0}
                    isToolTip
                    toolTipContent="Backward"
                    icon={<ArrowLeft size={16} />}
                    onClick={handleBackPath}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    active={sForwardDirStack.length > 0}
                    isToolTip
                    toolTipContent="Forward"
                    icon={<ArrowRight size={16} />}
                    onClick={handleForwardPath}
                />
                <Input
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
            </div>
            <FileListHeader />
            <Modal.Body style={{ padding: 0 }}>
                <div className="taz-save-as-modal__file-list">
                    {sFileList.map((fileItem) => (
                        <div
                            key={fileItem.name}
                            className={`taz-save-as-modal__file-row${sSelectedFileName === fileItem.name ? ' taz-save-as-modal__file-row--selected' : ''}`}
                            onClick={(event) => handleSelectFile(event, fileItem)}
                        >
                            <div className="taz-save-as-modal__file-name">
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
                                <span>{fileItem.name}</span>
                            </div>
                            <span className="taz-save-as-modal__file-modified">
                                {elapsedTime(fileItem.lastModifiedUnixMillis)}
                            </span>
                            <span className="taz-save-as-modal__file-size">
                                {elapsedSize(fileItem.size)}
                            </span>
                        </div>
                    ))}
                </div>
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <div className="taz-save-as-modal__footer-input">
                    <Input
                        label="File name"
                        labelPosition="left"
                        value={sSaveFileName}
                        onChange={(event) => setSaveFileName(event.target.value)}
                    />
                </div>
                <Button.Group>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                    <Modal.Confirm
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
