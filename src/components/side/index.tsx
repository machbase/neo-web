import { AppStoreSide } from './AppStore';
import { BridgeSide } from './Bridge';
import { DBExplorer } from './DBExplorer/DBExplorer';
import { FileExplorer } from './FileExplorer';
import { ReferenceSide } from './Reference';
import { SecurityKeySide } from './SecurityKey';
import { Side } from '@/design-system/components';
import { TimerSide } from './Timer';
import { ShellSide } from './Shell';
import type { NeoUpdateStatus } from '@/api/repository/neoUpdate';

export const SidePanel = ({
    pServer,
    pNeoUpdateStatus,
    pGetInfo,
    pSavedPath,
    pSelectedExtension,
}: {
    pServer: any;
    pNeoUpdateStatus?: NeoUpdateStatus;
    pGetInfo: any;
    pSavedPath: any;
    pSelectedExtension: any;
}) => {
    return (
        <Side.Root pServer={pServer} pNeoUpdateStatus={pNeoUpdateStatus}>
            <FileExplorer pGetInfo={pGetInfo} pSavedPath={pSavedPath} pDisplay={pSelectedExtension === 'EXPLORER'} />
            {pSelectedExtension === 'DBEXPLORER' && <DBExplorer />}
            {pSelectedExtension === 'SHELL' && <ShellSide />}
            {pSelectedExtension === 'BRIDGE' && <BridgeSide />}
            {pSelectedExtension === 'TIMER' && <TimerSide />}
            {pSelectedExtension === 'KEY' && <SecurityKeySide />}
            {pSelectedExtension === 'APPSTORE' && <AppStoreSide />}
            {pSelectedExtension === 'REFERENCE' && <ReferenceSide />}
        </Side.Root>
    );
};
