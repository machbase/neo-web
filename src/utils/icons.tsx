import {
    VscGraphScatter,
    VscGraphLine,
    VscFile,
    BiLink,
    Powershell,
    Close,
    DocumentOutline,
    TreeFolder,
    TreeFolderOpen,
    FaDatabase,
    VscNotebook,
    GoTerminal,
    GoCommandPalette,
    GoDatabase,
    VscVm,
    VscTerminalCmd,
    VscJson,
    VscMarkdown,
    Csv,
    Document,
    Image,
} from '@/assets/icons/Icon';
import { FaDesktop, FaLaptop } from 'react-icons/fa6';

const icons = (aType: string) => {
    switch (aType) {
        case 'url':
            return <BiLink />;
        case 'sql':
            return <VscFile />;
        case 'new':
            return <DocumentOutline />;
        case 'tql':
            return <VscGraphScatter />;
        case 'taz':
            return <VscGraphLine />;
        case 'wrk':
            return <VscNotebook />;
        case 'json':
            return <VscJson />;
        case 'md':
            return <VscMarkdown />;
        case 'txt':
            return <Document />;
        case 'csv':
            return <Csv />;
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'bmp':
        case 'webp':
        case 'gif':
        case 'svg':
        case 'ico':
            return <Image />;
        case 'term':
            return <GoTerminal />;
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

        default:
            return <GoTerminal />;
    }

    return;
};
export default icons;
