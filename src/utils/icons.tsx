import {
    VscGraphScatter,
    VscGraphLine,
    VscFile,
    BiLink,
    Cmd,
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
} from '@/assets/icons/Icon';
import { FaDesktop, FaLaptop } from 'react-icons/fa6';

const icons = (aType: string) => {
    switch (aType) {
        case 'url':
            return <BiLink></BiLink>;
        case 'sql':
            return <VscFile></VscFile>;
        case 'new':
            return <DocumentOutline></DocumentOutline>;
        case 'tql':
            return <VscGraphScatter></VscGraphScatter>;
        case 'taz':
            return <VscGraphLine></VscGraphLine>;
        case 'wrk':
            return <VscNotebook></VscNotebook>;
        case 'term':
            return <GoTerminal></GoTerminal>;
        case 'close':
            return <Close></Close>;
        case 'closedDirectory':
            return <TreeFolder />;
        case 'openDirectory':
            return <TreeFolderOpen />;
        case 'console-network-outline':
            return <GoCommandPalette></GoCommandPalette>;
        case 'console-network':
            return <VscVm></VscVm>;
        case 'monitor-small':
            return <VscTerminalCmd></VscTerminalCmd>;
        case 'console-line':
            return <Powershell></Powershell>;
        case 'powershell':
            return <FaLaptop></FaLaptop>;
        case 'laptop':
            return <FaDesktop></FaDesktop>;
        case 'database-outline':
            return <FaDatabase></FaDatabase>;
        case 'database':
            return <GoDatabase></GoDatabase>;
        case 'monitor':
            return <GoTerminal></GoTerminal>;

        default:
            return <GoTerminal></GoTerminal>;
    }

    return;
};
export default icons;
