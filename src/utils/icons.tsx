import {
    VscGraphScatter,
    VscGraphLine,
    VscFile,
    BiLink,
    Powershell,
    Close,
    FaDatabase,
    VscNotebook,
    GoTerminal,
    GoCommandPalette,
    GoDatabase,
    VscVm,
    VscTerminalCmd,
    AiOutlineDashboard,
    FaDesktop,
    FaLaptop,
    FaHtml5,
    FaCss3,
    IoLogoJavascript,
    VscKey,
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
    MuiFolder,
    MuiFolderOpen,
} from '@/assets/icons/Mui';
import { GiCableStayedBridge } from 'react-icons/gi';
import { PiDatabaseLight } from 'react-icons/pi';
import { RxLapTimer } from 'react-icons/rx';
import { TbBell } from 'react-icons/tb';
import { VscTypeHierarchy } from 'react-icons/vsc';

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
        case 'html':
            return <FaHtml5 color="fc7976" />;
        case 'css':
            return <FaCss3 color="399af6" />;
        case 'js':
            return <IoLogoJavascript color="fdda19" />;
        case 'dsh':
            return aIsHome ? <AiOutlineDashboard /> : <AiOutlineDashboard color="fc7676" />;
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
            return <MuiFolder />;
        case 'openDirectory':
            return <MuiFolderOpen />;
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
        case 'key':
            return <VscKey />;
        case 'timer':
            return <RxLapTimer />;
        case 'bridge':
            return <GiCableStayedBridge />;
        case 'bridge-db':
            return <PiDatabaseLight />;
        case 'bridge-sub':
            return <VscTypeHierarchy />;
        case 'subscriber':
        case 'bridge-child':
            return <TbBell />;
        default:
            return <GoTerminal />;
    }
};
export default icons;
