import icons from '@/utils/icons';
import { extractionExtension } from '@/utils';
import { getInstalledDirs, getInstalledIcons } from '@/api/repository/onpremCatalog';
import { installedIconOf } from '@/components/side/AppStore/catalog';
import { PkgIcon } from '@/components/side/AppStore/PkgIcon';
import { GroupItemKind } from './groupModel';

/** The same icon each kind has in its own panel, so a shortcut reads as what it points at. */
const ICON_KEY: Record<Exclude<GroupItemKind, 'file' | 'package'>, string> = {
    folder: 'closedDirectory',
    timer: 'timer',
    bridge: 'bridge',
    shell: 'term',
    table: 'DBTable',
    token: 'token',
    cert: 'key',
};

export const GroupItemIcon = ({ pKind, pRef }: { pKind: GroupItemKind; pRef: string }) =>
    pKind === 'package' ? (
        // A package shows its own icon, as its App Store card does (the installed copy's, the icon file
        // the last App Store scan found or icon.png); one without an icon, or no longer installed, the
        // App Store's package icon.
        <PkgIcon className="nb-item-icon nb-item-icon--package" pName={pRef} pInstalled pInstalledIcon={installedIconOf(pRef, getInstalledIcons())} pInstalledVersion={getInstalledDirs()[pRef]?.version} />
    ) : (
        <span className={`nb-item-icon nb-item-icon--${pKind}`} aria-hidden="true">
            {icons(pKind === 'file' ? extractionExtension(pRef) : ICON_KEY[pKind])}
        </span>
    );
