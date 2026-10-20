import icons from '@/utils/icons';
import { extractionExtension } from '@/utils';
import { GroupItemKind } from './groupModel';

/** The same icon each kind has in its own panel, so a shortcut reads as what it points at. */
const ICON_KEY: Record<Exclude<GroupItemKind, 'file'>, string> = {
    folder: 'closedDirectory',
    package: 'appStore',
    timer: 'timer',
    bridge: 'bridge',
    shell: 'term',
    table: 'DBTable',
    token: 'token',
    cert: 'key',
};

export const GroupItemIcon = ({ pKind, pRef }: { pKind: GroupItemKind; pRef: string }) => (
    <span className={`nb-item-icon nb-item-icon--${pKind}`} aria-hidden="true">
        {icons(pKind === 'file' ? extractionExtension(pRef) : ICON_KEY[pKind])}
    </span>
);
