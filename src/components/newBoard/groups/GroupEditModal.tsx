import { useState } from 'react';
import { Button, Modal } from '@/design-system/components';
import { accountKey } from '../layout/newTabStorage';
import { Group, GROUP_CAPTION_MAX, GROUP_COLORS, GroupItem, GroupVisibility, itemKey, newGroupId } from './groupModel';
import { KIND_LABELS } from './groupResources';
import { GroupItemIcon } from './GroupItemIcon';
import { useDialogFocus } from '../useDialogFocus';

interface GroupEditModalProps {
    /** Undefined creates a new group. */
    pGroup?: Group;
    pMissing?: Set<string>;
    pDefaultColor?: string;
    pOnSave: (aGroup: Group, aPreviousVisibility?: GroupVisibility) => Promise<boolean>;
    pOnDelete: (aGroup: Group) => Promise<boolean>;
    pOnClose: () => void;
}

export const GroupEditModal = ({ pGroup, pMissing, pDefaultColor, pOnSave, pOnDelete, pOnClose }: GroupEditModalProps) => {
    const [sName, setName] = useState(pGroup?.name ?? '');
    const [sCaption, setCaption] = useState(pGroup?.caption ?? '');
    const [sColor, setColor] = useState(pGroup?.color ?? pDefaultColor ?? GROUP_COLORS[0]);
    const [sVisibility, setVisibility] = useState<GroupVisibility>(pGroup?.visibility ?? 'private');
    const [sItems, setItems] = useState<GroupItem[]>(pGroup?.items ?? []);
    const [sConfirmDelete, setConfirmDelete] = useState(false);
    const [sBusy, setBusy] = useState(false);
    useDialogFocus('new-board-group-modal');

    const save = async () => {
        if (!sName.trim() || sBusy) return;
        setBusy(true);
        const sGroup: Group = pGroup
            ? { ...pGroup, name: sName.trim(), caption: sCaption.trim() || undefined, color: sColor, visibility: sVisibility, items: sItems }
            : { id: newGroupId(), name: sName.trim(), caption: sCaption.trim() || undefined, color: sColor, visibility: sVisibility, owner: accountKey(), items: [], updatedAt: Date.now() };
        const sOk = await pOnSave(sGroup, pGroup?.visibility);
        setBusy(false);
        if (sOk) pOnClose();
    };

    return (
        <Modal.Root
            isOpen
            onClose={pOnClose}
            className="nb-modal"
            data-testid="new-board-group-modal"
            style={{ width: '480px', maxWidth: '92vw', height: 'auto', maxHeight: '86vh' }}
            onKeyDown={(aEvent) => {
                if (aEvent.key === 'Enter' && (aEvent.target as HTMLElement).tagName === 'INPUT' && (aEvent.target as HTMLInputElement).type === 'text') save();
            }}
        >
            <Modal.Header>
                <Modal.Title>{pGroup ? 'Edit group' : 'New group'}</Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Modal.Content>
                    <div className="nb-form">
                        <label className="nb-field">
                            <span>Name</span>
                            <input className="nb-input" data-testid="name" type="text" autoFocus maxLength={40} value={sName} placeholder="e.g. Plant A monitoring" onChange={(aEvent) => setName(aEvent.target.value)} />
                        </label>
                        <label className="nb-field">
                            <span>
                                Caption <small className="nb-muted">optional</small>
                            </span>
                            <input
                                className="nb-input"
                                data-testid="caption"
                                type="text"
                                maxLength={GROUP_CAPTION_MAX}
                                value={sCaption}
                                placeholder="e.g. Line 3 sensors, dashboards and the rollup timer"
                                onChange={(aEvent) => setCaption(aEvent.target.value)}
                            />
                        </label>
                        <div className="nb-field">
                            <span>Color</span>
                            <div className="nb-swatches" role="radiogroup" aria-label="Color">
                                {GROUP_COLORS.map((aColor) => (
                                    <button
                                        type="button"
                                        key={aColor}
                                        role="radio"
                                        aria-checked={sColor === aColor}
                                        aria-label={`Color ${aColor}`}
                                        className="nb-swatch"
                                        style={{ background: aColor }}
                                        onClick={() => setColor(aColor)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="nb-field" role="radiogroup" aria-label="Who can see it">
                            <span>Who can see it</span>
                            <label className={`nb-radio${sVisibility === 'private' ? ' is-checked' : ''}`}>
                                <input type="radio" name="nb-group-visibility" data-testid="visibility-private" checked={sVisibility === 'private'} onChange={() => setVisibility('private')} />
                                <span>
                                    <b>Only me</b>
                                    <small>Shown to the account you are signed in with ({accountKey()}).</small>
                                </span>
                            </label>
                            <label className={`nb-radio${sVisibility === 'shared' ? ' is-checked' : ''}`}>
                                <input type="radio" name="nb-group-visibility" data-testid="visibility-shared" checked={sVisibility === 'shared'} onChange={() => setVisibility('shared')} />
                                <span>
                                    <b>Everyone on this server</b>
                                    <small>Every account can add it to their New tab, and change it.</small>
                                </span>
                            </label>
                        </div>
                        {/* Every shortcut can be taken out here (before, only ones not found could); the thing itself stays where it is. */}
                        {sItems.length ? (
                            <div className="nb-field">
                                <span>
                                    Shortcuts <small className="nb-muted">removing one leaves the item itself where it is</small>
                                </span>
                                <div className="nb-list nb-list--scroll" data-testid="items">
                                    {sItems.map((aItem) => {
                                        const sMissing = !!pMissing?.has(itemKey(aItem));
                                        return (
                                            <div className={`nb-list-row${sMissing ? ' is-missing' : ''}`} key={itemKey(aItem)} data-testid={`item-${encodeURIComponent(itemKey(aItem))}`}>
                                                <GroupItemIcon pKind={aItem.kind} pRef={aItem.ref} />
                                                <span className="nb-list-name">
                                                    {aItem.label}
                                                    <small>
                                                        {sMissing ? 'Not found · ' : ''}
                                                        {KIND_LABELS[aItem.kind].one} · {aItem.ref}
                                                    </small>
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    data-testid="remove"
                                                    aria-label={`Remove ${aItem.label} from the group`}
                                                    onClick={(aEvent) => {
                                                        // The row goes with its button: focus moves to the next row's Remove (or the last one's).
                                                        const sList = aEvent.currentTarget.closest('[data-testid="items"]');
                                                        const sAt = sItems.findIndex((aOld) => itemKey(aOld) === itemKey(aItem));
                                                        setItems((aList) => aList.filter((aOld) => itemKey(aOld) !== itemKey(aItem)));
                                                        requestAnimationFrame(() => {
                                                            const sButtons = sList?.querySelectorAll<HTMLElement>('[data-testid="remove"]');
                                                            sButtons?.[Math.min(sAt, sButtons.length - 1)]?.focus();
                                                        });
                                                    }}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}
                        {pGroup ? (
                            sConfirmDelete ? (
                                <div className="nb-confirm" role="alert">
                                    <span>
                                        Delete “{pGroup.name}”? It disappears from every New tab that shows it
                                        {pGroup.visibility === 'shared' ? ', for every account' : ''}. Files and other items stay where they are.
                                    </span>
                                    <span className="nb-confirm-actions">
                                        <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
                                            Keep
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            data-testid="new-board-group-delete-confirm"
                                            onClick={async () => {
                                                setBusy(true);
                                                const sOk = await pOnDelete(pGroup);
                                                setBusy(false);
                                                if (sOk) pOnClose();
                                            }}
                                        >
                                            Delete group
                                        </Button>
                                    </span>
                                </div>
                            ) : (
                                <div>
                                    <Button size="sm" variant="ghost" className="nb-danger-text" onClick={() => setConfirmDelete(true)}>
                                        Delete group
                                    </Button>
                                </div>
                            )
                        ) : null}
                    </div>
                </Modal.Content>
            </Modal.Body>
            <Modal.Footer>
                <Modal.Cancel onClick={pOnClose} />
                <Modal.Confirm data-testid="new-board-group-save" onClick={save} disabled={!sName.trim()} loading={sBusy}>
                    {pGroup ? 'Save' : 'Create group'}
                </Modal.Confirm>
            </Modal.Footer>
        </Modal.Root>
    );
};
