import { useEffect, useState } from 'react';
import { ItemWidgetSettings } from '../layout/layoutModel';
import { GroupItem, GroupItemKind } from './groupModel';
import { KIND_LABELS, ResourceEntry, resolveItem } from './groupResources';
import { AppIcon } from './AppIcon';
import { useOpenGroupItem } from './useOpenGroupItem';

type State = { status: 'loading' } | { status: 'found'; entry: ResourceEntry } | { status: 'missing' } | { status: 'unknown' };

/**
 * One shortcut on the New tab, drawn as a single app icon: a timer, package, table and so on,
 * opened the way its own panel opens it. The line under it is read live (a timer's schedule, a
 * token's expiry), and a timer carries the same on/off switch as the timer panel.
 */
export const ItemWidget = ({ pSettings, pActive }: { pSettings: ItemWidgetSettings; pActive: boolean }) => {
    const openItem = useOpenGroupItem();
    const sItem: GroupItem = { kind: pSettings.kind as GroupItemKind, ref: pSettings.ref, label: pSettings.label };
    const [sState, setState] = useState<State>({ status: 'loading' });

    useEffect(() => {
        if (!pActive) return;
        let sAlive = true;
        resolveItem(sItem)
            .then((aEntry) => sAlive && setState(aEntry ? { status: 'found', entry: aEntry } : { status: 'missing' }))
            .catch(() => sAlive && setState({ status: 'unknown' }));
        return () => {
            sAlive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pSettings.kind, pSettings.ref, pActive]);

    const sMissing = sState.status === 'missing';
    const sEntry = sState.status === 'found' ? sState.entry : undefined;
    // A timer's switch says whether it runs, so its line keeps only the schedule.
    const sDetail = sItem.kind === 'timer' ? sEntry?.raw?.schedule : sEntry?.detail;
    const sKind = KIND_LABELS[sItem.kind];

    return (
        <div className={`nb-tile nb-item-widget${sMissing ? ' is-missing' : ''}`} data-testid="new-board-item">
            <AppIcon
                pItem={{ ...sItem, label: sEntry?.label ?? sItem.label }}
                pMissing={sMissing}
                pDetail={sDetail}
                pActive={pActive}
                pSize="lg"
                pOnOpen={async () => {
                    if (!(await openItem(sItem))) setState({ status: 'missing' });
                }}
            />
            <span className="nb-item-widget-detail">{sMissing ? 'Not found' : [sKind?.one, sDetail].filter(Boolean).join(' · ')}</span>
        </div>
    );
};
