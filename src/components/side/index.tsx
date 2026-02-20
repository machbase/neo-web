import { AppStoreSide } from './AppStore';
import { BridgeSide } from './Bridge';
import { DBExplorer } from './DBExplorer/DBExplorer';
import { FileExplorer } from './FileExplorer';
import { ReferenceSide } from './Reference';
import { SecurityKeySide } from './SecurityKey';
import { Side } from '@/design-system/components';
import { TimerSide } from './Timer';
import { ShellSide } from './Shell';
import { CameraSide } from './Camera';
import { useExperiment } from '@/hooks/useExperiment';

export const SidePanel = ({ pServer, pGetInfo, pSavedPath, pSelectedExtension }: { pServer: any; pGetInfo: any; pSavedPath: any; pSelectedExtension: any }) => {
    const { getExperiment } = useExperiment();
    return (
        <Side.Root pServer={pServer}>
            <FileExplorer pGetInfo={pGetInfo} pSavedPath={pSavedPath} pDisplay={pSelectedExtension === 'EXPLORER'} />
            {pSelectedExtension === 'DBEXPLORER' && <DBExplorer />}
            {pSelectedExtension === 'SHELL' && <ShellSide />}
            {pSelectedExtension === 'BRIDGE' && <BridgeSide />}
            {pSelectedExtension === 'TIMER' && <TimerSide />}
            {pSelectedExtension === 'KEY' && <SecurityKeySide />}
            {pSelectedExtension === 'APPSTORE' && <AppStoreSide />}
            {pSelectedExtension === 'REFERENCE' && <ReferenceSide />}
            {pSelectedExtension === 'CAMERA' && getExperiment() && <CameraSide />}
        </Side.Root>
    );
};
