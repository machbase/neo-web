import { getFileList } from '@/api/repository/api';
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
} from '@/design-system/components';
import { elapsedSize, elapsedTime, extractionExtension } from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import icons from '@/utils/icons';
import { useState, type MouseEvent } from 'react';
import '../TazSaveModal.scss';

type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean | undefined;
    gitClone?: boolean | undefined;
    lastModifiedUnixMillis: number;
    size: number;
};

const TAZ_FILE_FILTER = '?filter=*.taz';
export type TazSaveModalInitialState = {
    directorySegments: string[];
    fileName: string;
    fileList: FileListItem[];
};

function TazSaveModal({
    initialState,
    onClose,
    onSave,
    onRecentModalPathChange,
}: {
    initialState: TazSaveModalInitialState;
    onClose: () => void;
    onSave: (directoryPath: string, fileName: string) => Promise<boolean>;
    onRecentModalPathChange: (path: string) => void;
}) {
    const [sSelectedDir, setSelectedDir] = useState<string[]>(
        initialState.directorySegments,
    );
    const [sForwardDirStack, setForwardDirStack] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<FileListItem | undefined>(undefined);
    const [sFileList, setFileList] = useState<FileListItem[]>(initialState.fileList);
    const [sSaveFileName, setSaveFileName] = useState(initialState.fileName);
    const [sIsSaving, setIsSaving] = useState(false);

    async function openDirectory(
        directorySegments: string[],
        forwardDirStack: string[],
    ) {
        setSelectedDir(directorySegments);
        setSelectedFile(undefined);
        setForwardDirStack(forwardDirStack);
        setFileList(await fetchTazFileList(directorySegments));
    }

    const handleBackPath = async function handleBackPath() {
        if (sSelectedDir.length === 0) {
            return;
        }

        const sCurrentSegments = [...sSelectedDir];
        const sRemovedSegment = sCurrentSegments.pop();

        await openDirectory(
            sCurrentSegments,
            sRemovedSegment
                ? [...sForwardDirStack, sRemovedSegment]
                : sForwardDirStack,
        );
    };
    const handleEnterDirectory = async function handleEnterDirectory(directoryName: string) {
        await openDirectory([...sSelectedDir, directoryName], []);
    };
    const handleForwardPath = async function handleForwardPath() {
        const sNextDirectoryName = sForwardDirStack[sForwardDirStack.length - 1];
        if (!sNextDirectoryName) {
            return;
        }

        await openDirectory(
            [...sSelectedDir, sNextDirectoryName],
            sForwardDirStack.slice(0, -1),
        );
    };
    const handleSelectFile = async function handleSelectFile(
        event: MouseEvent<HTMLDivElement>,
        fileItem: FileListItem,
    ) {
        setSelectedFile(fileItem);

        if (fileItem.type !== 'dir') {
            setSaveFileName(fileItem.name);
        }

        if (event.detail === 2 && fileItem.type === 'dir') {
            await handleEnterDirectory(fileItem.name);
        }
    };
    const handleSave = async function handleSave() {
        if (!isValidTazFileName(sSaveFileName)) {
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
            const sDidSave = await onSave(sDirectoryPath, sSaveFileName);

            if (!sDidSave) {
                return;
            }

            onRecentModalPathChange(sDirectoryPath);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal.Root isOpen onClose={onClose} size="md">
            <Modal.Header>
                <Modal.Title>
                    <SaveAs />
                    <span>Save As</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <div className="taz-save-modal__nav">
                <Button
                    size="sm"
                    variant="ghost"
                    active={sSelectedDir.length > 0}
                    isToolTip
                    toolTipContent="Backward"
                    icon={<ArrowLeft size={16} />}
                    onClick={() => void handleBackPath()}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    active={sForwardDirStack.length > 0}
                    isToolTip
                    toolTipContent="Forward"
                    icon={<ArrowRight size={16} />}
                    onClick={() => void handleForwardPath()}
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
                <div className="taz-save-modal__file-list">
                    {sFileList.map((fileItem, index) => {
                        const sIsSelected = sSelectedFile?.name === fileItem.name;

                        return (
                            <div
                                key={`${fileItem.name}-${index}`}
                                className={`taz-save-modal__file-row${sIsSelected ? ' taz-save-modal__file-row--selected' : ''}`}
                                onClick={(event) => void handleSelectFile(event, fileItem)}
                            >
                                <div className="taz-save-modal__file-name">
                                    {fileItem.type === 'dir' ? (
                                        fileItem.gitClone ? (
                                            <Button
                                                forceOpacity
                                                disabled
                                                size="sm"
                                                variant="none"
                                                icon={icons('gitClosedDirectory')}
                                            />
                                        ) : (
                                            <Button
                                                forceOpacity
                                                disabled
                                                size="sm"
                                                variant="none"
                                                icon={<TreeFolder />}
                                            />
                                        )
                                    ) : (
                                        <Button
                                            forceOpacity
                                            disabled
                                            size="sm"
                                            variant="none"
                                            icon={icons(fileItem.type.replace('.', ''))}
                                        />
                                    )}
                                    <span>{fileItem.name}</span>
                                </div>
                                <span className="taz-save-modal__file-modified">
                                    {elapsedTime(fileItem.lastModifiedUnixMillis)}
                                </span>
                                <span className="taz-save-modal__file-size">
                                    {elapsedSize(fileItem.size)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Modal.Body>
            <Modal.Footer style={{ justifyContent: 'space-between' }}>
                <div className="taz-save-modal__footer-input">
                    <Input
                        label="File name"
                        labelPosition="left"
                        value={sSaveFileName}
                        onChange={(event) => setSaveFileName(event.target.value)}
                    />
                </div>
                <Button.Group>
                    <Modal.Confirm
                        disabled={!isValidTazFileName(sSaveFileName) || sIsSaving}
                        onClick={() => void handleSave()}
                    >
                        Apply
                    </Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

export default TazSaveModal;
export async function loadTazSaveModalInitialState({
    initialDirectoryPath,
    initialFileName,
    recentModalPath,
}: {
    initialDirectoryPath: string;
    initialFileName: string;
    recentModalPath: string;
}): Promise<TazSaveModalInitialState> {
    const sResolvedDirectoryPath = normalizeDirectoryPath(
        initialDirectoryPath || recentModalPath || '/',
    );
    const sDirectorySegments = splitDirectoryPath(sResolvedDirectoryPath);

    return {
        directorySegments: sDirectorySegments,
        fileName: resolveInitialFileName(initialFileName),
        fileList: await fetchTazFileList(sDirectorySegments),
    };
}
async function fetchTazFileList(
    directorySegments: string[],
): Promise<FileListItem[]> {
    const sResponse = await getFileList(
        TAZ_FILE_FILTER,
        directorySegments.join('/'),
        '',
    );

    return (sResponse.data?.children ?? []) as FileListItem[];
}
function splitDirectoryPath(directoryPath: string): string[] {
    return directoryPath.split('/').filter(Boolean);
}
function normalizeDirectoryPath(directoryPath: string): string {
    const sTrimmedPath = directoryPath.trim();

    if (sTrimmedPath === '') {
        return '/';
    }

    const sLeadingSlashPath = sTrimmedPath.startsWith('/')
        ? sTrimmedPath
        : `/${sTrimmedPath}`;

    return sLeadingSlashPath.endsWith('/')
        ? sLeadingSlashPath
        : `${sLeadingSlashPath}/`;
}
function buildDirectoryPath(directorySegments: string[]): string {
    if (directorySegments.length === 0) {
        return '/';
    }

    return `/${directorySegments.join('/')}/`;
}
function resolveInitialFileName(initialFileName: string): string {
    if (initialFileName === '') {
        return 'new.taz';
    }

    return extractionExtension(initialFileName) === 'taz'
        ? initialFileName
        : `${initialFileName}.taz`;
}
function isValidTazFileName(fileName: string): boolean {
    return (
        FileNameAndExtensionValidator(fileName) &&
        extractionExtension(fileName) === 'taz'
    );
}
