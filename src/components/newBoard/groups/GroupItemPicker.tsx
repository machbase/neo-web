import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/design-system/components';
import { Group, GROUP_KIND_ORDER, GroupItem, GroupItemKind, itemKey } from './groupModel';
import { DirEntry, KIND_LABELS, listDirectory, listResources, ResourceEntry } from './groupResources';
import { GroupItemIcon } from './GroupItemIcon';

type Tab = Exclude<GroupItemKind, 'folder'>;
const TABS: Tab[] = GROUP_KIND_ORDER.filter((aKind): aKind is Tab => aKind !== 'folder');
const tabLabel = (aTab: Tab) => (aTab === 'file' ? 'Files & folders' : KIND_LABELS[aTab].many);

interface GroupItemPickerProps {
    pGroup: Group;
    pOnAdd: (aItems: GroupItem[]) => Promise<boolean>;
    pOnClose: () => void;
}

/** Choose shortcuts for a group: files and folders are browsed a folder at a time, every other kind is one searchable list. */
export const GroupItemPicker = ({ pGroup, pOnAdd, pOnClose }: GroupItemPickerProps) => {
    const [sTab, setTab] = useState<Tab>('file');
    const [sQuery, setQuery] = useState('');
    const [sDir, setDir] = useState('/');
    const [sRows, setRows] = useState<ResourceEntry[] | undefined>(undefined);
    const [sError, setError] = useState<string | undefined>(undefined);
    const [sChosen, setChosen] = useState<Map<string, GroupItem>>(new Map());
    const [sBusy, setBusy] = useState(false);
    const sInGroup = useMemo(() => new Set(pGroup.items.map(itemKey)), [pGroup.items]);

    useEffect(() => {
        let sAlive = true;
        setRows(undefined);
        setError(undefined);
        const sLoad: Promise<ResourceEntry[]> =
            sTab === 'file'
                ? listDirectory(sDir, true).then((aEntries: DirEntry[]) =>
                      aEntries.map((aEntry) => {
                          const sRef = sDir + aEntry.name;
                          return { kind: aEntry.isDir ? 'folder' : 'file', ref: sRef, label: aEntry.name } as ResourceEntry;
                      })
                  )
                : listResources(sTab, true);
        sLoad
            .then((aRows) => sAlive && setRows(aRows))
            .catch((aError) => sAlive && setError(aError instanceof Error ? aError.message : 'Could not load the list.'));
        return () => {
            sAlive = false;
        };
    }, [sTab, sDir]);

    const sTerm = sQuery.trim().toLowerCase();
    const sVisible = (sRows ?? []).filter((aRow) => !sTerm || `${aRow.label} ${aRow.detail ?? ''} ${aRow.ref}`.toLowerCase().includes(sTerm));
    const sCrumbs = sDir.split('/').filter(Boolean);

    const toggle = (aRow: ResourceEntry) =>
        setChosen((aPrev) => {
            const sNext = new Map(aPrev);
            const sKey = itemKey(aRow);
            if (sNext.has(sKey)) sNext.delete(sKey);
            else sNext.set(sKey, { kind: aRow.kind, ref: aRow.ref, label: aRow.label });
            return sNext;
        });

    const add = async () => {
        if (!sChosen.size || sBusy) return;
        setBusy(true);
        const sOk = await pOnAdd(Array.from(sChosen.values()));
        setBusy(false);
        if (sOk) pOnClose();
    };

    return (
        <Modal.Root isOpen onClose={pOnClose} className="nb-modal" data-testid="new-board-group-picker" style={{ width: '680px', maxWidth: '94vw', height: 'auto', maxHeight: '88vh' }}>
            <Modal.Header>
                <Modal.Title>Add to “{pGroup.name}”</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <div className="nb-form">
                        <div className="nb-picker-tabs" role="tablist" aria-label="Kind">
                            {TABS.map((aTab) => (
                                <button
                                    type="button"
                                    key={aTab}
                                    role="tab"
                                    aria-selected={sTab === aTab}
                                    data-testid={`new-board-picker-tab-${aTab}`}
                                    onClick={() => {
                                        setTab(aTab);
                                        setQuery('');
                                    }}
                                >
                                    {tabLabel(aTab)}
                                </button>
                            ))}
                        </div>
                        {/* One fixed-height line on every tab, so switching tabs never moves the dialog. */}
                        {sTab === 'file' ? (
                            <nav className="nb-crumbs" aria-label="Folder">
                                <button type="button" onClick={() => setDir('/')}>
                                    Files
                                </button>
                                {sCrumbs.map((aPart, aIndex) => (
                                    <span key={aIndex}>
                                        <span aria-hidden="true">/</span>
                                        <button type="button" onClick={() => setDir('/' + sCrumbs.slice(0, aIndex + 1).join('/') + '/')}>
                                            {aPart}
                                        </button>
                                    </span>
                                ))}
                            </nav>
                        ) : (
                            <p className="nb-crumbs nb-picker-count">
                                {sRows ? `${sRows.length} ${sRows.length === 1 ? KIND_LABELS[sTab].one.toLowerCase() : KIND_LABELS[sTab].many.toLowerCase()} on this server` : ' '}
                            </p>
                        )}
                        <input
                            className="nb-input"
                            type="search"
                            value={sQuery}
                            placeholder={sTab === 'file' ? 'Filter this folder' : `Search ${KIND_LABELS[sTab].many.toLowerCase()}`}
                            onChange={(aEvent) => setQuery(aEvent.target.value)}
                            aria-label="Search"
                        />
                        <div className="nb-list nb-picker-list" role="listbox" aria-multiselectable="true">
                            {sError ? <p className="nb-empty">{sError}</p> : null}
                            {!sError && !sRows ? <p className="nb-empty">Loading…</p> : null}
                            {!sError && sRows && !sVisible.length ? (
                                <p className="nb-empty">{sTerm ? `Nothing matches “${sQuery}”.` : sTab === 'file' ? 'This folder is empty.' : `No ${KIND_LABELS[sTab].many.toLowerCase()} on this server.`}</p>
                            ) : null}
                            {sVisible.map((aRow) => {
                                const sKey = itemKey(aRow);
                                const sAlready = sInGroup.has(sKey);
                                const sChecked = sAlready || sChosen.has(sKey);
                                return (
                                    <div key={sKey} className={`nb-list-row nb-picker-row${sAlready ? ' is-in' : ''}`} role="option" aria-selected={sChecked}>
                                        <input type="checkbox" aria-label={`Select ${aRow.label}`} checked={sChecked} disabled={sAlready} onChange={() => toggle(aRow)} />
                                        <GroupItemIcon pKind={aRow.kind} pRef={aRow.ref} />
                                        {aRow.kind === 'folder' ? (
                                            <button type="button" className="nb-list-name nb-folder-link" title="Open this folder" onClick={() => setDir(aRow.ref + '/')}>
                                                {aRow.label}/
                                            </button>
                                        ) : (
                                            <span className="nb-list-name" onClick={() => !sAlready && toggle(aRow)}>
                                                {aRow.label}
                                                {aRow.detail ? <small>{aRow.detail}</small> : null}
                                            </span>
                                        )}
                                        <span className="nb-list-side">{sAlready ? 'In group' : aRow.kind === 'folder' ? 'Folder' : ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Modal.Content>
            </Modal.Body>
            <Modal.Footer>
                <span className="nb-footer-note">{sChosen.size ? `${sChosen.size} selected` : 'Nothing selected'}</span>
                <Modal.Cancel onClick={pOnClose} />
                <Modal.Confirm data-testid="new-board-picker-add" onClick={add} disabled={!sChosen.size} loading={sBusy}>
                    {sChosen.size ? `Add ${sChosen.size}` : 'Add'}
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
};
