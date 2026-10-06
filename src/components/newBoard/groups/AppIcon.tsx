import { GroupItem } from './groupModel';
import { KIND_LABELS } from './groupResources';
import { GroupItemIcon } from './GroupItemIcon';
import { TimerSwitch } from './TimerSwitch';
import { appColor } from './appColor';

interface AppIconProps {
    pItem: GroupItem;
    pMissing?: boolean;
    /** Shown as the tooltip, e.g. a timer's schedule or a file's path. */
    pDetail?: string;
    pActive: boolean;
    pOnOpen: () => void;
    pSize?: 'md' | 'lg';
}

/**
 * One item drawn like an app on a phone's home screen: a tinted rounded tile with the item's own
 * icon, its name underneath. Timers carry their on/off switch under the name.
 */
export const AppIcon = ({ pItem, pMissing = false, pDetail, pActive, pOnOpen, pSize = 'md' }: AppIconProps) => {
    const sKind = KIND_LABELS[pItem.kind];
    const sTitle = pMissing
        ? `${sKind?.one ?? 'Item'} "${pItem.label}" was not found. Edit the group to remove it.`
        : [`${sKind?.action ?? 'Open'} ${pItem.label}`, pDetail || (pItem.kind === 'file' || pItem.kind === 'folder' ? pItem.ref : sKind?.one)].filter(Boolean).join('\n');
    return (
        <div className={`nb-app nb-app--${pSize}${pMissing ? ' is-missing' : ''}`} data-testid="new-board-app">
            <button type="button" className="nb-app-btn" title={sTitle} onClick={pOnOpen}>
                <span className="nb-app-icon" style={{ ['--nb-app-color' as string]: appColor(pItem) }}>
                    <GroupItemIcon pKind={pItem.kind} pRef={pItem.ref} />
                    {pMissing ? (
                        <span className="nb-app-badge" aria-label="Not found">
                            !
                        </span>
                    ) : null}
                </span>
                <span className="nb-app-label">{pItem.label}</span>
            </button>
            {pItem.kind === 'timer' && !pMissing ? (
                <span className="nb-app-extra">
                    <TimerSwitch pRef={pItem.ref} pActive={pActive} />
                </span>
            ) : null}
        </div>
    );
};
