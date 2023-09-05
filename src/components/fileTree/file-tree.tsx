import React, { useState } from 'react';
import styled from '@emotion/styled';
import icons from '@/utils/icons';
import { FileTreeType, FileType, sortDir, sortFile } from '@/utils/fileTreeParser';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { gBoardList, gSelectedTab } from '@/recoil/recoil';
import { gRecentDirectory } from '@/recoil/fileTree';
import { extractionExtension } from '@/utils';

interface FileTreeProps {
    rootDir: FileTreeType;
    selectedFile: FileType | undefined;
    onSelect: (file: FileType) => void;
    onFetchDir: (item: FileTreeType) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
}

export const FileTree = (props: FileTreeProps) => {
    return <SubTree directory={props.rootDir} {...props} />;
};

interface SubTreeProps {
    directory: FileTreeType;
    selectedFile: FileType | undefined;
    onSelect: (file: FileType) => void;
    onFetchDir: (item: FileTreeType) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
}

const SubTree = (props: SubTreeProps) => {
    return (
        <div>
            {props.directory.dirs.length > 0 ? (
                props.directory.dirs.sort(sortDir).map((dir) => (
                    <React.Fragment key={'' + dir.depth + dir.id}>
                        <DirDiv directory={dir} selectedFile={props.selectedFile} onSelect={props.onSelect} onSelectDir={props.onFetchDir} onContextMenu={props.onContextMenu} />
                    </React.Fragment>
                ))
            ) : (
                <></>
            )}
            {props.directory.files.length > 0 ? (
                props.directory.files.sort(sortFile).map((file) => (
                    <React.Fragment key={'' + file.depth + file.id}>
                        <FileDiv file={file} selectedFile={props.selectedFile} onClick={() => props.onSelect(file)} onContextMenu={props.onContextMenu} />
                    </React.Fragment>
                ))
            ) : (
                <></>
            )}
        </div>
    );
};

const FileDiv = ({
    file,
    icon,
    onClick,
    onContextMenu,
}: {
    file: FileType | FileTreeType;
    icon?: string;
    selectedFile: FileType | undefined;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
}) => {
    const [sSelectedTab] = useRecoilState(gSelectedTab);
    const [sBoardList] = useRecoilState(gBoardList);
    const setRecentDirectory = useSetRecoilState(gRecentDirectory);
    const selectBoard: any = sBoardList.find((aItem) => aItem.id === sSelectedTab);
    const isSelected = selectBoard?.path + selectBoard?.name === file.path + file.id;
    const depth = file.depth;

    const handleClick = () => {
        if (file.type === 0) setRecentDirectory(file.path);
        if (file.type === 1) setRecentDirectory(file.path + file.name + '/');
        onClick();
    };

    const handleOnContextMenu = (e: React.MouseEvent<HTMLDivElement>, afile: FileType | FileTreeType) => {
        onContextMenu(e, afile);
    };
    return (
        <Div depth={depth} isSelected={isSelected} onClick={handleClick} onContextMenu={(e) => handleOnContextMenu(e, file)}>
            <FileIcon name={icon} extension={extractionExtension(file.name) || ''} />
            <span style={{ marginLeft: 1, fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name}</span>
        </Div>
    );
};

const Div = styled.div<{
    depth: number;
    isSelected: boolean;
}>`
    display: flex;
    align-items: center;
    padding-left: ${(props) => props.depth * 16}px;
    background-color: ${(props) => (props.isSelected ? '#242424' : 'transparent')};

    :hover {
        cursor: pointer;
        background-color: #242424;
    }
`;

const DirDiv = ({
    directory,
    selectedFile,
    onSelect,
    onSelectDir,
    onContextMenu,
}: {
    directory: FileTreeType;
    selectedFile: FileType | undefined;
    onSelect: (file: FileType) => void;
    onSelectDir: (item: FileTreeType) => void;
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>, file: FileType | FileTreeType) => void;
}) => {
    let defaultOpen = false;
    if (selectedFile) defaultOpen = isChildSelected(directory, selectedFile);
    const [open, setOpen] = useState(defaultOpen);

    return (
        <>
            {
                <FileDiv
                    file={directory}
                    icon={open ? 'openDirectory' : 'closedDirectory'}
                    selectedFile={selectedFile}
                    onClick={() => {
                        if (!open) onSelectDir(directory);
                        setOpen(!open);
                    }}
                    onContextMenu={onContextMenu}
                />
            }
            {open ? <SubTree directory={directory} selectedFile={selectedFile} onSelect={onSelect} onFetchDir={onSelectDir} onContextMenu={onContextMenu} /> : null}
        </>
    );
};

const isChildSelected = (directory: FileTreeType, selectedFile: FileType) => {
    let res: boolean = false;

    function isChild(dir: FileTreeType, file: FileType) {
        if (selectedFile.parentId === dir.id) {
            res = true;
            return;
        }
        if (selectedFile.parentId === '0') {
            res = false;
            return;
        }
        dir.dirs.forEach((item) => {
            isChild(item, file);
        });
    }

    isChild(directory, selectedFile);
    return res;
};

const FileIcon = ({ extension, name }: { name?: string; extension?: string }) => {
    const icon = icons(name || (extension as string));
    return <Span>{icon}</Span>;
};

const Span = styled.span`
    display: flex;
    width: 16px;
    height: 22px;
    margin-right: 6px;
    justify-content: center;
    align-items: center;
`;
