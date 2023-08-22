import {
    DotChart,
    Worksheet,
    Document,
    LineChart,
    BiLink,
    Cmd,
    Powershell,
    Close,
    DocumentOutline,
    TreeFolder,
    TreeFolderOpen,
    FaDatabase,
    Monitor,
    LuMonitorSpeaker,
    MdMonitorHeart,
    Phone,
} from '@/assets/icons/Icon';

const icons = (aType: string) => {
    switch (aType) {
        case 'url':
            return <BiLink></BiLink>;
        case 'sql':
            return <Document></Document>;
        case 'new':
            return <DocumentOutline></DocumentOutline>;
        case 'tql':
            return <DotChart></DotChart>;
        case 'taz':
            return <LineChart></LineChart>;
        case 'wrk':
            return <Worksheet></Worksheet>;
        case 'term':
            return <Cmd></Cmd>;
        case 'close':
            return <Close></Close>;
        case 'closedDirectory':
            return <TreeFolder />;
        case 'openDirectory':
            return <TreeFolderOpen />;
        case 'console-network-outline':
            return <FaDatabase></FaDatabase>;
        case 'console-network':
            return <Powershell></Powershell>;
        case 'database-outline':
            return <Monitor></Monitor>;
        case 'database':
            return <LuMonitorSpeaker></LuMonitorSpeaker>;
        case 'console-line':
            return <MdMonitorHeart></MdMonitorHeart>;
        case 'powershell':
            return <Phone></Phone>;
        case 'monitor':
            return <Cmd></Cmd>;

        default:
            return <Cmd></Cmd>;
    }

    return;
};
export default icons;
