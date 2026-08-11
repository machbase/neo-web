export function getFileTreeItemTestId(
    directoryPath: string,
    fileName: string,
): string {
    return `file-tree-item-${encodeURIComponent(`${directoryPath}${fileName}`)}`;
}
