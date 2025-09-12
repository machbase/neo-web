interface TreeViewFilter {
    origin: any;
    filterTxt: string;
}

export const TreeViewFilter = (props: TreeViewFilter) => {
    const { origin, filterTxt } = props;
    const sResultTree = JSON.parse(JSON.stringify(origin));

    if (sResultTree && sResultTree.files && sResultTree.files.length > 0) {
        sResultTree.files = FindTargetList(sResultTree.files, filterTxt);
    }
    if (sResultTree && sResultTree.dirs && sResultTree.dirs.length > 0) {
        sResultTree.dirs = FindTargetDir(sResultTree.dirs, filterTxt);
    }

    return sResultTree;
};

const FindTargetDir = (aDirList: any, aFilterText: string) => {
    return aDirList.filter((aDir: any) => {
        if (aDir.files && aDir.files.length > 0) aDir.files = FindTargetList(aDir.files, aFilterText);
        if (aDir.dirs && aDir.dirs.length > 0) {
            aDir.dirs = FindTargetDir(aDir.dirs, aFilterText);
            if (aDir.dirs.length > 0) return true;
        }
        if (IsTargetItem(aDir.name, aFilterText) || aDir.files.length > 0) return true;
        else return false;
    });
};
const FindTargetList = (aTargetList: any, aFilterText: string): any[] => {
    return aTargetList.filter((aTarget: any) => IsTargetItem(aTarget.name, aFilterText));
};
const IsTargetItem = (aTarget: string, aFilterText: string) => {
    if (aTarget.toLowerCase().includes(aFilterText.toLowerCase())) return true;
    else return false;
};
