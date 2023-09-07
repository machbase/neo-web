import {
    VscGraphScatter,
    VscGraphLine,
    VscFile,
    BiLink,
    Powershell,
    Close,
    TreeFolder,
    TreeFolderOpen,
    FaDatabase,
    VscNotebook,
    GoTerminal,
    GoCommandPalette,
    GoDatabase,
    VscVm,
    VscTerminalCmd,
} from '@/assets/icons/Icon';
import {
    MuiCsv,
    MuiDocument,
    MuiFolderGit,
    MuiFolderGitOpen,
    MuiImage,
    MuiJson,
    MuiMarkdown,
    MuiSql,
    MuiSvg,
    MuiWorksheet,
    MuiShell,
    MuiNewDocument,
    MuiTagAnalyzer,
    MuiTql,
} from '@/assets/icons/Mui';
import { FaDesktop, FaLaptop } from 'react-icons/fa6';

const icons = (aType: string, aIsHome?: boolean) => {
    switch (aType) {
        case 'url':
            return <BiLink />;
        case 'sql':
            return aIsHome ? <VscFile /> : <MuiSql />;
        case 'new':
            return <MuiNewDocument />;
        case 'tql':
            return aIsHome ? <VscGraphScatter /> : <MuiTql />;
        case 'taz':
            return aIsHome ? <VscGraphLine /> : <MuiTagAnalyzer />;
        case 'wrk':
            return aIsHome ? <VscNotebook /> : <MuiWorksheet />;
        case 'json':
            return <MuiJson />;
        case 'md':
            return <MuiMarkdown />;
        case 'txt':
            return <MuiDocument />;
        case 'csv':
            return <MuiCsv />;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'bmp':
        case 'webp':
        case 'gif':
        case 'ico':
            return <MuiImage />;
        case 'svg':
            return <MuiSvg />;
        case 'term':
            return aIsHome ? <GoTerminal /> : <MuiShell />;
        case 'close':
            return <Close />;
        case 'closedDirectory':
            return <TreeFolder />;
        case 'openDirectory':
            return <TreeFolderOpen />;
        case 'console-network-outline':
            return <GoCommandPalette />;
        case 'console-network':
            return <VscVm />;
        case 'monitor-small':
            return <VscTerminalCmd />;
        case 'console-line':
            return <Powershell />;
        case 'powershell':
            return <FaLaptop />;
        case 'laptop':
            return <FaDesktop />;
        case 'database-outline':
            return <FaDatabase />;
        case 'database':
            return <GoDatabase />;
        case 'monitor':
            return <GoTerminal />;
        case 'gitClosedDirectory':
            return <MuiFolderGit />;
        case 'gitOpenDirectory':
            return <MuiFolderGitOpen />;
        default:
            return <GoTerminal />;
    }

    return;
};
export default icons;
