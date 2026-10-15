import { AppStoreSide } from './AppStore';
import { BridgeSide } from './Bridge';
import { DBExplorer } from './DBExplorer/DBExplorer';
import { FileExplorer } from './FileExplorer';
import { ReferenceSide } from './Reference';
import { SecurityKeySide } from './SecurityKey';
import { ErrorBoundary, Side } from '@/design-system/components';
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
            {/* The explorer stays mounted and hides itself while another panel is open; this wrapper hides
                its error card the same way, or the card would sit on top of whichever panel is showing. */}
            <div style={{ display: pSelectedExtension === 'EXPLORER' ? 'contents' : 'none' }}>
                <ErrorBoundary name="side:EXPLORER" variant="region">
                    <FileExplorer pGetInfo={pGetInfo} pSavedPath={pSavedPath} pDisplay={pSelectedExtension === 'EXPLORER'} />
                </ErrorBoundary>
            </div>
            {/* One boundary for whichever panel is showing; the key gives each its own, as mounting it does. */}
            <ErrorBoundary key={pSelectedExtension} name={`side:${pSelectedExtension}`} variant="region">
                {pSelectedExtension === 'DBEXPLORER' && <DBExplorer />}
                {pSelectedExtension === 'SHELL' && <ShellSide />}
                {pSelectedExtension === 'BRIDGE' && <BridgeSide />}
                {pSelectedExtension === 'TIMER' && <TimerSide />}
                {pSelectedExtension === 'KEY' && <SecurityKeySide />}
                {pSelectedExtension === 'APPSTORE' && <AppStoreSide />}
                {pSelectedExtension === 'REFERENCE' && <ReferenceSide />}
            </ErrorBoundary>
        </Side.Root>
    );
};
