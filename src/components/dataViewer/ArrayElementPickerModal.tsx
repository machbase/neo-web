import ValuePickerDialog from './ValuePickerDialog';
import { useMemo, useRef, useState } from 'react';
import { VscClose } from 'react-icons/vsc';
import { formatArrayType, type ArrayColumnMetadata } from '@/utils/arrayValue';
import './arrayElements.scss';

export type ArrayPickerView = { filter: string; scrollTop: number; selectedScrollTop: number };
const HEIGHT = 320;
const ROW_HEIGHT = 28;

/** Fixed-height windows keep both 1024-element lists small, including select-all. */
function IndexList({ indexes, scrollTop, onScroll, render }: {
    indexes: number[]; scrollTop: number; onScroll: (value: number) => void;
    render: (index: number) => React.ReactNode;
}) {
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
    return <div className="array-index-list" style={{ height: HEIGHT }}
        ref={(node) => { if (node && Math.abs(node.scrollTop - scrollTop) > 1) node.scrollTop = scrollTop; }}
        onScroll={(event) => onScroll(event.currentTarget.scrollTop)}>
        <div style={{ height: indexes.length * ROW_HEIGHT, position: 'relative' }}>
            {indexes.slice(first, first + Math.ceil(HEIGHT / ROW_HEIGHT) + 4).map((index, offset) =>
                <div className="array-index-row" key={index} style={{ position: 'absolute', top: (first + offset) * ROW_HEIGHT, height: ROW_HEIGHT }}>{render(index)}</div>)}
        </div>
    </div>;
}

export default function ArrayElementPickerModal({ tagName, baseLabel, valueColumn, metadata, preview, initialSelected = [], initialView, onViewChange, onConfirm, onClose }: {
    tagName: string; baseLabel: string; valueColumn: string; metadata: ArrayColumnMetadata; preview: unknown;
    initialSelected?: number[]; initialView?: ArrayPickerView; onViewChange: (view: ArrayPickerView) => void;
    onConfirm: (indexes: number[]) => void; onClose: () => void;
}) {
    const [selected, setSelected] = useState(() => new Set(initialSelected));
    const [view, setView] = useState<ArrayPickerView>(() => initialView ?? { filter: '', scrollTop: 0, selectedScrollTop: 0 });
    const viewRef = useRef(view);
    const updateView = (patch: Partial<ArrayPickerView>) => {
        const next = { ...viewRef.current, ...patch }; viewRef.current = next; setView(next); onViewChange(next);
    };
    const all = useMemo(() => Array.from({ length: metadata.cardinality }, (_, index) => index), [metadata.cardinality]);
    const filtered = useMemo(() => all.filter((index) => String(index).includes(view.filter.trim())), [all, view.filter]);
    const chosen = useMemo(() => [...selected], [selected]);
    const toggle = (index: number) => setSelected((old) => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next; });
    const valueAt = (index: number) => {
        if (preview === null) return 'Array is NULL';
        if (!Array.isArray(preview)) return 'Preview unavailable';
        return preview[index] === null ? 'NULL' : String(preview[index] ?? 'Unavailable');
    };
    return <ValuePickerDialog className="array-element-modal" label={`Array elements for ${tagName}`} title="Select elements"
        meta={`${tagName} · ${formatArrayType(metadata)} · ${baseLabel}`}
        filter={view.filter} onFilter={filter => updateView({filter, scrollTop: 0})} filterLabel="Filter element index" placeholder="Filter index"
        toolbar={<button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set(all))}>Select all {all.length}</button>}
        tree={<>{!filtered.length ? <div className="empty-state">No elements match.</div> : null}<IndexList indexes={filtered} scrollTop={view.scrollTop} onScroll={(scrollTop) => updateView({ scrollTop })} render={(index) => <label className={`json-key-row${selected.has(index) ? ' is-active' : ''}`}><input type="checkbox" checked={selected.has(index)} onChange={() => toggle(index)} /><span className="json-key-name json-key-name-leaf">{valueColumn}[{index}]</span><code className="json-key-preview" title={valueAt(index)}>{valueAt(index)}</code></label>} /></>}
        selected={<IndexList indexes={chosen} scrollTop={Math.min(view.selectedScrollTop, Math.max(0, chosen.length * ROW_HEIGHT - HEIGHT))} onScroll={(selectedScrollTop) => updateView({ selectedScrollTop })} render={(index) => <span className="json-key-picker-chip"><span className="json-key-picker-chip-name">{valueColumn}[{index}]</span><button onClick={() => toggle(index)} aria-label={`Remove element ${index}`}><VscClose /></button></span>} />} selectedCount={chosen.length} onClear={() => { setSelected(new Set()); updateView({selectedScrollTop: 0}); }}
        count={`${selected.size} selected · ${all.length} elements`} onConfirm={() => onConfirm(chosen)} onClose={onClose} />;
}
