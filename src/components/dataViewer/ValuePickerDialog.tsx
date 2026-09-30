import type { ReactNode, KeyboardEventHandler, Ref, UIEventHandler } from 'react';
import { VscClose, VscClearAll, VscListSelection } from 'react-icons/vsc';
import Modal from '@/components/modal/Modal';
import DataViewerModalPortal from './DataViewerModalPortal';
import useModalDialog from './useModalDialog';
import useOutsideCloseGuard from './useOutsideCloseGuard';

/** Shared JSON/ARRAY picker chrome, search, selection pane and actions. */
export default function ValuePickerDialog({ label, title, meta, filter, onFilter, filterLabel, placeholder, tree, selected, selectedCount, onClear, count, onConfirm, onClose, toolbar, inputRef, onInputKeyDown, treeRef, onTreeScroll, selectedRef, onSelectedScroll, className = '' }: {
    label: string; title: string; meta: ReactNode; filter: string; onFilter: (value: string) => void; filterLabel: string; placeholder: string;
    tree: ReactNode; selected: ReactNode; selectedCount: number; onClear: () => void; count: ReactNode;
    onConfirm: () => void; onClose: () => void; toolbar?: ReactNode; className?: string;
    inputRef?: Ref<HTMLInputElement>; onInputKeyDown?: KeyboardEventHandler<HTMLInputElement>;
    treeRef?: Ref<HTMLDivElement>; onTreeScroll?: UIEventHandler<HTMLDivElement>;
    selectedRef?: Ref<HTMLDivElement>; onSelectedScroll?: UIEventHandler<HTMLDivElement>;
}) {
    const dialogRef = useModalDialog<HTMLDivElement>(label);
    const outside = useOutsideCloseGuard(onClose);
    return <DataViewerModalPortal><Modal pIsDarkMode className={`json-key-modal json-key-picker-modal ${className}`} onOutSideClose={outside}>
        <div ref={dialogRef} className="modal-header json-key-picker-header">
            <div className="modal-header-title">{title}</div><span className="json-key-modal-sub">{meta}</span>
            <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close"><VscClose /></button>
        </div>
        <div className="modal-body json-key-modal-body json-key-picker-body">
            <div className="json-key-picker-tree-col">
                <div className="json-key-modal-toolbar"><input ref={inputRef} onKeyDown={onInputKeyDown} className="json-key-modal-filter" value={filter} onChange={event => onFilter(event.target.value)} placeholder={placeholder} aria-label={filterLabel} />{toolbar}</div>
                <div ref={treeRef} onScroll={onTreeScroll} className="json-key-modal-tree">{tree}</div>
            </div>
            <div className="json-key-picker-selected">
                <div className="json-key-picker-selected-head">
                    <span className="json-key-picker-selected-title"><VscListSelection className="icon-sm" /> SELECTED · {selectedCount}</span>
                    <button type="button" className="btn-icon-sm" onClick={onClear} disabled={!selectedCount} title="Clear selection" aria-label="Clear selection"><VscClearAll /></button>
                </div>
                <div ref={selectedRef} onScroll={onSelectedScroll} className="json-key-picker-selected-list">{selectedCount ? selected : <div className="empty-state">Nothing picked yet.</div>}</div>
            </div>
        </div>
        <div className="modal-footer json-key-modal-footer"><span className="json-key-modal-count">{count}</span>
            <div className="json-key-modal-buttons"><button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn btn-sm btn-primary" onClick={onConfirm} disabled={!selectedCount}>View detail</button></div>
        </div>
    </Modal></DataViewerModalPortal>;
}
