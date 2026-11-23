import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, FolderOpen, Home, TreeFolder, Play } from '@/assets/icons/Icon';
import { elapsedSize, elapsedTime } from '@/utils';
import { getFileList } from '@/api/repository/api';
import { useRecoilState } from 'recoil';
import { gRecentModalPath } from '@/recoil/fileTree';
import icons from '@/utils/icons';
import { Button, Modal, FileListHeader } from '@/design-system/components';
import { normalizeHostPath } from '@/extensions/host/paths';
import './SelectFileBtn.scss';

interface FileEntry {
    name: string;
    type?: string;
    isDir?: boolean;
    gitClone?: boolean;
    lastModifiedUnixMillis?: number;
    size?: number;
}
const isFolder = (entry: FileEntry) => entry.isDir === true || entry.type === 'dir';
const isChildName = (name: unknown): name is string => typeof name === 'string' && !!name && !name.includes('/') && !name.split('\\').includes('..') && name !== '.' && name !== '..';
export function isSelectableHostFile(entry: FileEntry, extensions: string[] = []) {
    return !!entry && isChildName(entry.name) && !isFolder(entry) && (!extensions.length || extensions.some((extension) =>
        entry.name.toLowerCase().endsWith('.' + extension.replace(/^\./, '').toLowerCase())));
}

export function SelectFileDialog({ extensions, legacyExtension, startPath, onSelect, onCancel }: {
    extensions?: string[];
    legacyExtension?: string;
    startPath?: string;
    onSelect(path: string): void;
    onCancel(): void;
}) {
    const [recentPath, setRecentPath] = useRecoilState(gRecentModalPath);
    const [sSelectedDir, setSelectedDir] = useState<string[]>(() => normalizeHostPath(startPath ?? recentPath).split('/').filter(Boolean));
    const [sSelectedFile, setSelectedFile] = useState('');
    const [sFileList, setFileList] = useState<FileEntry[]>([]);
    const [sDeletePath, setDeletePath] = useState<string[]>([]);
    const [error, setError] = useState('');
    const directory = sSelectedDir.join('/');
    const selectableFile = (entry: FileEntry) => isSelectableHostFile(entry, extensions) &&
        (!legacyExtension || entry.name.endsWith('.' + legacyExtension));

    useEffect(() => {
        let active = true;
        // A trailing slash asks for a directory even when its name ends in .dsh or .tql.
        getFileList(legacyExtension ? `?filter=${encodeURIComponent('*.' + legacyExtension)}` : '', directory ? directory + '/' : '/', '').then((response) => {
            if (!active) return;
            const data = response?.data;
            if (!response || !('success' in response) || response.success !== true || !data || !isFolder(data) || (data.children !== undefined && !Array.isArray(data.children))) {
                setError('Could not read files.');
                return;
            }
            // Neo omits children for empty directories.
            setFileList(data.children ?? []);
        }).catch(() => { if (active) setError('Could not read files.'); });
        return () => { active = false; };
    }, [directory, legacyExtension]);

    const navigate = (path: string[], forward: string[]) => {
        setSelectedDir(path);
        setDeletePath(forward);
        setSelectedFile('');
        setFileList([]);
        setError('');
    };
    const handleSave = (name: string) => {
        const file = sFileList.find((entry) => entry?.name === name && selectableFile(entry));
        if (!file) return;
        setRecentPath('/' + [...sSelectedDir, ''].join('/'));
        onSelect([...sSelectedDir, file.name].join('/'));
    };
    const handleOpen = (entry: FileEntry) => {
        if (isFolder(entry)) navigate([...sSelectedDir, entry.name], []);
        else handleSave(entry.name);
    };
    const handleBackPath = () => {
        if (sSelectedDir.length > 0) navigate(sSelectedDir.slice(0, -1), [...sDeletePath, sSelectedDir[sSelectedDir.length - 1]]);
    };
    const handleForwardPath = () => {
        if (sDeletePath.length > 0) navigate([...sSelectedDir, sDeletePath[sDeletePath.length - 1]], sDeletePath.slice(0, -1));
    };
    const handleDirectPath = (length: number) => {
        if (length < sSelectedDir.length) navigate(sSelectedDir.slice(0, length), sSelectedDir.slice(length).reverse());
    };
    const visibleFiles = sFileList.filter((entry) => entry && isChildName(entry.name) && (isFolder(entry) || selectableFile(entry)));

    return (
        <Modal.Root isOpen={true} onClose={onCancel} size="md">
            <Modal.Header>
                <Modal.Title>
                    <FolderOpen />
                    <span>Open</span>
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>

            {/* Navigation Bar */}
            <div className="select-file-btn__nav">
                <Button
                    size="sm"
                    variant="ghost"
                    active={sSelectedDir.length > 0}
                    isToolTip
                    toolTipContent="Backward"
                    icon={<ArrowLeft size={16} />}
                    aria-label="Backward"
                    onClick={handleBackPath}
                />
                <Button
                    size="sm"
                    variant="ghost"
                    active={sDeletePath.length > 0}
                    isToolTip
                    toolTipContent="Forward"
                    icon={<ArrowRight size={16} />}
                    aria-label="Forward"
                    onClick={handleForwardPath}
                />
                <div className="select-file-btn__breadcrumb">
                    <div className="select-file-btn__breadcrumb-item" onClick={() => handleDirectPath(0)}>
                        <Home size={14} />
                    </div>
                    {sSelectedDir.map((aDir, index) => {
                        return (
                            <div key={sSelectedDir.slice(0, index + 1).join('/')} className="select-file-btn__breadcrumb-wrapper">
                                <Play size={14} className="select-file-btn__breadcrumb-separator" />
                                <div className="select-file-btn__breadcrumb-item" onClick={() => handleDirectPath(index + 1)}>
                                    {aDir}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <FileListHeader />

            {/* File List */}
            <Modal.Body style={{ padding: 0 }}>
                {error && <div role="alert">{error}</div>}
                <div className="select-file-btn__file-list">
                    {visibleFiles.map((aItem) => {
                        const isSelected = sSelectedFile && sSelectedFile === aItem.name;
                        return (
                            <div
                                key={aItem.name}
                                role="button"
                                tabIndex={0}
                                aria-label={aItem.name}
                                className={`select-file-btn__file-row ${isSelected ? 'select-file-btn__file-row--selected' : ''}`}
                                onClick={() => { if (!isFolder(aItem)) setSelectedFile(aItem.name); }}
                                onDoubleClick={() => handleOpen(aItem)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    handleOpen(aItem);
                                }}
                            >
                                <div className="select-file-btn__file-name">
                                    {isFolder(aItem) ? (
                                        aItem.gitClone ? (
                                            <Button forceOpacity disabled size="sm" variant="none" icon={icons('gitClosedDirectory')} />
                                        ) : (
                                            <Button forceOpacity disabled size="sm" variant="none" icon={<TreeFolder />} />
                                        )
                                    ) : (
                                        <Button forceOpacity disabled size="sm" variant="none" icon={icons(aItem.type?.replace('.', '') ?? '')} />
                                    )}
                                    <span>{aItem.name}</span>
                                </div>
                                <span className="select-file-btn__file-modified">{elapsedTime(aItem.lastModifiedUnixMillis ?? 0)}</span>
                                <span className="select-file-btn__file-size">{elapsedSize(aItem.size ?? 0)}</span>
                            </div>
                        );
                    })}
                </div>
            </Modal.Body>

            {/* Footer */}
            <Modal.Footer>
                <Button.Group>
                    <Modal.Confirm onClick={() => handleSave(sSelectedFile)} disabled={!sSelectedFile}>OK</Modal.Confirm>
                    <Modal.Cancel>Cancel</Modal.Cancel>
                </Button.Group>
            </Modal.Footer>
        </Modal.Root>
    );
}

export const SelectFileBtn = ({ btnTxt, pType, pCallback }: { pType: string; btnTxt?: string; pCallback: (path: string) => void }) => {
    const [open, setOpen] = useState(false);
    return <>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{btnTxt ?? 'Select file'}</Button>
        {open && <SelectFileDialog legacyExtension={pType} onSelect={(path) => { pCallback(path); setOpen(false); }} onCancel={() => setOpen(false)} />}
    </>;
};
