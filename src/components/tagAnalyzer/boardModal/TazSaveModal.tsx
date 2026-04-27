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
import { gRecentModalPath } from '@/recoil/fileTree';
import { elapsedSize, elapsedTime, extractionExtension } from '@/utils';
import { FileNameAndExtensionValidator } from '@/utils/FileExtansion';
import icons from '@/utils/icons';
import { useEffect, useState, type MouseEvent } from 'react';
import { useRecoilState } from 'recoil';
import '../TazSaveModal.scss';

type TazSaveModalProps = {
    isOpen: boolean;
    initialDirectoryPath: string;
    initialFileName: string;
    onClose: () => void;
    onSave: (directoryPath: string, fileName: string) => Promise<boolean>;
};

type FileListItem = {
    name: string;
    type: string;
    isDir?: boolean | undefined;
    gitClone?: boolean | undefined;
    lastModifiedUnixMillis: number;
    size: number;
};

const TAZ_FILE_FILTER = '?filter=*.taz';

/**
 * Renders the TagAnalyzer-local Save As dialog.
 * Intent: Keep `.taz` save-as serialization on the TagAnalyzer save payload instead of the shared raw-tab save flow.
 * @param {TazSaveModalProps} aProps The modal state and save callback.
 * @returns {JSX.Element | null} The rendered save modal when open.
 */
function TazSaveModal({
    isOpen,
    initialDirectoryPath,
    initialFileName,
    onClose,
    onSave,
}: TazSaveModalProps) {
    const [sRecentModalPath, setRecentModalPath] = useRecoilState(gRecentModalPath);
    const [sSelectedDir, setSelectedDir] = useState<string[]>([]);
    const [sForwardDirStack, setForwardDirStack] = useState<string[]>([]);
    const [sSelectedFile, setSelectedFile] = useState<FileListItem | undefined>(undefined);
    const [sFileList, setFileList] = useState<FileListItem[]>([]);
    const [sSaveFileName, setSaveFileName] = useState('');
    const [sIsSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const sResolvedDirectoryPath = normalizeDirectoryPath(
            initialDirectoryPath || sRecentModalPath || '/',
        );
        const sInitialSegments = splitDirectoryPath(sResolvedDirectoryPath);

        setSelectedDir(sInitialSegments);
        setForwardDirStack([]);
        setSelectedFile(undefined);
        setSaveFileName(resolveInitialFileName(initialFileName));
        void loadFiles(sInitialSegments, setFileList);
    }, [initialDirectoryPath, initialFileName, isOpen, sRecentModalPath]);

    /**
     * Moves the current directory one level up.
     * Intent: Keep directory navigation local to the TagAnalyzer save-as modal.
     * @returns {Promise<void>} Nothing.
     */
    const handleBackPath = async function handleBackPath() {
        if (sSelectedDir.length === 0) {
            return;
        }

        const sCurrentSegments = [...sSelectedDir];
        const sRemovedSegment = sCurrentSegments.pop();

        setSelectedDir(sCurrentSegments);
        setSelectedFile(undefined);
        setForwardDirStack((prev) =>
            sRemovedSegment ? [...prev, sRemovedSegment] : prev,
        );
        await loadFiles(sCurrentSegments, setFileList);
    };

    /**
     * Moves into the provided directory.
     * Intent: Keep forward directory navigation explicit and isolated to one helper.
     * @param {string} directoryName The directory to enter.
     * @returns {Promise<void>} Nothing.
     */
    const handleEnterDirectory = async function handleEnterDirectory(directoryName: string) {
        const sNextSegments = [...sSelectedDir, directoryName];

        setSelectedDir(sNextSegments);
        setSelectedFile(undefined);
        setForwardDirStack([]);
        await loadFiles(sNextSegments, setFileList);
    };

    /**
     * Re-enters the most recently popped directory.
     * Intent: Mirror the shared save modal navigation without reusing its raw-save logic.
     * @returns {Promise<void>} Nothing.
     */
    const handleForwardPath = async function handleForwardPath() {
        const sNextDirectoryName = sForwardDirStack[sForwardDirStack.length - 1];
        if (!sNextDirectoryName) {
            return;
        }

        const sNextSegments = [...sSelectedDir, sNextDirectoryName];

        setSelectedDir(sNextSegments);
        setSelectedFile(undefined);
        setForwardDirStack((prev) => prev.slice(0, -1));
        await loadFiles(sNextSegments, setFileList);
    };

    /**
     * Selects a file row and enters directories on double-click.
     * Intent: Keep file selection behavior aligned with the existing save modal UX.
     * @param {React.MouseEvent<HTMLDivElement>} event The row click event.
     * @param {FileListItem} fileItem The clicked file row.
     * @returns {Promise<void>} Nothing.
     */
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

    /**
     * Commits the Save As request through the TagAnalyzer-local save callback.
     * Intent: Persist the clean `.taz` payload and keep the recent modal path in sync.
     * @returns {Promise<void>} Nothing.
     */
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

            setRecentModalPath(sDirectoryPath);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) {
        return null;
    }

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

/**
 * Loads the visible files for one directory.
 * Intent: Keep `.taz` save-as directory browsing on the local TagAnalyzer modal.
 * @param {string[]} directorySegments The selected directory split into path segments.
 * @param {(aFileList: FileListItem[]) => void} setFileList The local file-list setter.
 * @returns {Promise<void>} Nothing.
 */
async function loadFiles(
    directorySegments: string[],
    setFileList: (fileList: FileListItem[]) => void,
): Promise<void> {
    const sResponse = await getFileList(
        TAZ_FILE_FILTER,
        directorySegments.join('/'),
        '',
    );

    setFileList((sResponse.data?.children ?? []) as FileListItem[]);
}

/**
 * Converts one directory path into modal navigation segments.
 * Intent: Keep directory-state initialization separate from file loading.
 * @param {string} directoryPath The absolute directory path.
 * @returns {string[]} The non-empty directory segments.
 */
function splitDirectoryPath(directoryPath: string): string[] {
    return directoryPath.split('/').filter(Boolean);
}

/**
 * Normalizes a directory path to the shared leading/trailing slash shape.
 * Intent: Keep TagAnalyzer save requests aligned with the file API path format.
 * @param {string} directoryPath The directory path to normalize.
 * @returns {string} The normalized directory path.
 */
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

/**
 * Builds the absolute directory path from modal path segments.
 * Intent: Keep directory serialization explicit before the save callback runs.
 * @param {string[]} directorySegments The selected directory segments.
 * @returns {string} The absolute directory path.
 */
function buildDirectoryPath(directorySegments: string[]): string {
    if (directorySegments.length === 0) {
        return '/';
    }

    return `/${directorySegments.join('/')}/`;
}

/**
 * Resolves the initial file name shown by the local Save As modal.
 * Intent: Always start from a `.taz` file name, even if runtime tab metadata is incomplete.
 * @param {string} initialFileName The current board file name.
 * @returns {string} The normalized initial `.taz` file name.
 */
function resolveInitialFileName(initialFileName: string): string {
    if (initialFileName === '') {
        return 'new.taz';
    }

    return extractionExtension(initialFileName) === 'taz'
        ? initialFileName
        : `${initialFileName}.taz`;
}

/**
 * Checks whether the Save As file name is a valid `.taz` target.
 * Intent: Keep invalid file names from reaching the file repository call.
 * @param {string} fileName The file name to validate.
 * @returns {boolean} True when the file name is a valid `.taz` name.
 */
function isValidTazFileName(fileName: string): boolean {
    return (
        FileNameAndExtensionValidator(fileName) &&
        extractionExtension(fileName) === 'taz'
    );
}
