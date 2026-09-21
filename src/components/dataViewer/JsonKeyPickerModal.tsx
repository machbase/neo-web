import { useEffect, useMemo, useRef, useState } from 'react';
import {
    VscChevronDown,
    VscChevronRight,
    VscChromeClose,
    VscClearAll,
    VscClose,
    VscListSelection,
    VscSymbolArray,
    VscSymbolBoolean,
    VscSymbolNamespace,
    VscSymbolNumeric,
    VscSymbolString,
} from 'react-icons/vsc';
import Modal from '@/components/modal/Modal';
import DataViewerModalPortal from './DataViewerModalPortal';
import useOutsideCloseGuard from './useOutsideCloseGuard';
import useModalDialog from './useModalDialog';
import {
    buildJsonKeyTree,
    filterJsonKeyTree,
    jsonKeyTreeLeafPaths,
    jsonKeyTreeLeavesUnder,
    jsonKeyTreeSeriesCount,
    MAX_JSON_KEY_SERIES,
    visibleJsonKeyTree,
    type JsonKeyTreeNode,
} from './jsonKeyTree';

/**
 * Pick the keys of one row.
 *
 * The row the user opened carries its own complete structure, so this modal needs nothing but that
 * row's value — no scan, no stored catalog, nothing to keep in step with a table that keeps
 * changing. Selection lives here and is handed to the detail view; closing the modal ends it.
 */
export interface JsonKeyPickerView {
    filter: string;
    collapsed: string[];
}

export interface JsonKeyPickerModalProps {
    /** Tag the opened row belongs to. Shown for orientation, and carried to the detail view. */
    tagName: string;
    /** The row's base-column value, shown so the user knows which cycle they opened. */
    baseLabel?: string;
    /** The row's JSON value, as text or already parsed. */
    document: unknown;
    /** Value column, which is what names the single row a keyless document offers. */
    valueColumn?: string;
    /**
     * What was picked last time this row was open.
     *
     * The detail view can send the user back here to change their mind, and arriving at an empty
     * tree would make "back" indistinguishable from starting over. Read once, on mount — the modal
     * is unmounted while the detail view is up, so each visit seeds itself from the last one.
     */
    initialSelected?: string[];
    /**
     * The filter text and the folded branches this row was left with.
     *
     * Same reason as `initialSelected`: "back" has to come back to what you left. Typing a filter,
     * ticking the one key it leaves and stepping into the detail used to return you to the whole
     * unfiltered tree — on a wide document that is the key you were looking at, gone. Reported
     * upward through `onViewChange` rather than owned above, so a keystroke in the filter box does
     * not re-render the page behind the modal.
     */
    initialView?: JsonKeyPickerView;
    onViewChange?: (view: JsonKeyPickerView) => void;
    onClose: () => void;
    onConfirm: (paths: string[]) => void;
}

/**
 * Which badge a type gets.
 *
 * A number and a string are different answers to "what is in here", and the value axis takes only
 * one of them — so they do not share a colour. Anything else is stated plainly.
 */
const jsonKeyBadgeTone = (dataType: string) =>
    dataType === 'NUMBER' ? 'badge-info' : dataType === 'STRING' ? 'badge-success' : 'badge-muted';

/**
 * A glyph for what a row holds, ahead of its name.
 *
 * The badge already names the type, but it sits after a key of any length — so on a tree it lands
 * in a different place on every line and cannot be scanned down. The glyph is in a fixed column,
 * which is what makes "where are the numbers" answerable at a glance. Same symbol set the editor
 * uses for the same job.
 */
const JsonKeyTypeGlyph = ({ node }: { node: JsonKeyTreeNode }) => {
    if (!node.leaf) return node.preview.startsWith('array') ? <VscSymbolArray /> : <VscSymbolNamespace />;
    if (node.dataType === 'NUMBER') return <VscSymbolNumeric />;
    if (node.dataType === 'BOOLEAN') return <VscSymbolBoolean />;
    return <VscSymbolString />;
};

/** One step of nesting at a comfortable depth — the step the design uses, and the widest one. */
const TREE_INDENT_STEP = 16;

/**
 * How much width the whole staircase may take, however deep the document goes.
 *
 * The step is what gets adjusted, not the depth: a cap on total indent draws every level past it in
 * the same place and so says nothing, and an uncapped step drags the type and the value along with
 * it until the row falls off the right edge. Fitting the staircase into a fixed budget keeps each
 * level in its own place *and* leaves the two right-hand columns where they belong — a document
 * shallow enough for the full step is unaffected, which is nearly all of them.
 */
const TREE_INDENT_BUDGET = 200;

export const JsonKeyPickerModal = ({ tagName, baseLabel, document, valueColumn = 'VALUE', initialSelected, initialView, onViewChange, onClose, onConfirm }: JsonKeyPickerModalProps) => {
    const nodes = useMemo(() => buildJsonKeyTree(document, valueColumn), [document, valueColumn]);

    // A drag that began inside and ended past the edge is still that gesture, not a click
    // outside — see `useOutsideCloseGuard`.
    const closeOnOutside = useOutsideCloseGuard(onClose);
    // Names the dialog, puts focus in it and keeps Tab inside — see the hook.
    const dialogRef = useModalDialog<HTMLDivElement>(`Choose keys from ${tagName}`);
    const [filter, setFilter] = useState(() => initialView?.filter ?? '');
    // Open. The document the user clicked is the thing they came to look at, and folding it means
    // every key past the first level costs a click before it can even be seen.
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(initialView?.collapsed ?? []));
    const [selected, setSelected] = useState<string[]>(() => initialSelected ?? []);

    /** Fitted to the deepest key, so the staircase always lands inside the budget. See it above. */
    const indentStep = useMemo(() => {
        const deepest = nodes.reduce((max, node) => Math.max(max, node.depth), 0);
        if (deepest === 0) return TREE_INDENT_STEP;
        return Math.max(2, Math.min(TREE_INDENT_STEP, Math.floor(TREE_INDENT_BUDGET / deepest)));
    }, [nodes]);

    const filtering = filter.trim().length > 0;
    const filtered = useMemo(() => filterJsonKeyTree(nodes, filter), [filter, nodes]);
    // Collapsing is ignored while filtering: the filter has already decided what is worth showing,
    // and re-hiding a match under a fold the user set earlier would look like the search failed.
    const visible = useMemo(() => (filtering ? filtered : visibleJsonKeyTree(filtered, collapsed)), [collapsed, filtered, filtering]);
    // The document's own size, not the filtered view's: the header describes the row that was
    // opened, and it would be odd for it to shrink while someone is typing in the filter box.
    const documentKeyCount = useMemo(() => jsonKeyTreeLeafPaths(nodes).length, [nodes]);
    const seriesCount = useMemo(() => jsonKeyTreeSeriesCount(nodes, selected), [nodes, selected]);

    const toggleCollapsed = (path: string) =>
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });

    /**
     * Tick a row, whatever kind it is.
     *
     * A branch is not a series, but it is the fastest way to say "all of these" — so ticking one
     * takes every leaf beneath it, and unticking gives them all back. A branch already fully picked
     * is what "untick" means; a partly picked one fills up rather than emptying, which is the answer
     * to the only question a half-filled box leaves open.
     */
    const toggle = (node: JsonKeyTreeNode) =>
        setSelected((current) => {
            const leaves = jsonKeyTreeLeavesUnder(nodes, node.path);
            if (leaves.length === 0) return current;
            const picked = new Set(current);
            const allPicked = leaves.every((path) => picked.has(path));
            if (allPicked) return current.filter((path) => !leaves.includes(path));
            return Array.from(new Set([...current, ...leaves]));
        });

    const clearAll = () => setSelected([]);

    // Report the view up as it changes so the next visit can start where this one stopped. The
    // parent keeps it in a ref, so this costs no render anywhere.
    const viewChangeRef = useRef(onViewChange);
    viewChangeRef.current = onViewChange;
    useEffect(() => {
        viewChangeRef.current?.({ filter, collapsed: Array.from(collapsed) });
    }, [collapsed, filter]);

    const renderRow = (node: JsonKeyTreeNode) => {
        // Indentation is what says where a key sits — and it says nothing once the filter has
        // flattened the tree, where the dimmed path ahead of the key carries that instead.
        const indent = { '--tree-indent': filtering ? '0px' : `${node.depth * indentStep}px` } as React.CSSProperties;
        const isCollapsed = collapsed.has(node.path);

        const leaves = node.leaf ? [node.path] : jsonKeyTreeLeavesUnder(nodes, node.path);
        const pickedCount = leaves.filter((path) => selected.includes(path)).length;
        const checked = leaves.length > 0 && pickedCount === leaves.length;
        const partial = pickedCount > 0 && !checked;

        const label = (
            <span className="json-key-name json-key-name-leaf">
                {filtering && node.parentDotted ? <span className="json-key-prefix">{node.parentDotted}.</span> : null}
                {node.label}
            </span>
        );

        // The tag list's own checkbox — same element, same rule, so the two lists cannot drift into
        // two different-looking ticks. `indeterminate` is a property rather than an attribute, so it
        // is set on the node; it says "some of what is under this" without claiming either state.
        const box = (
            <span className="node-tree-toggle">
                <input
                    type="checkbox"
                    checked={checked}
                    ref={(element) => {
                        if (element) element.indeterminate = partial;
                    }}
                    onChange={() => toggle(node)}
                    aria-label={node.dotted}
                    disabled={leaves.length === 0}
                />
            </span>
        );

        const rowClass = `json-key-row${checked ? ' is-active' : ''}${partial ? ' is-partial' : ''}`;

        if (node.leaf) {
            // A label, exactly as the tag list does it: the whole row is the checkbox's target
            // without a second control having to be wired up to it.
            return (
                <label key={node.path} className={rowClass} style={indent} title={node.dotted}>
                    <span className="json-key-caret" />
                    {box}
                    {/* Wrapped, never truncated: sibling keys share long prefixes, and an ellipsis
                        that keeps only the front makes different keys look identical. */}
                    {label}
                    {node.dataType ? <span className={`badge ${jsonKeyBadgeTone(node.dataType)}`}>{node.dataType.toLowerCase()}</span> : null}
                    <span className="json-key-preview">{node.preview}</span>
                </label>
            );
        }

        /**
         * A branch is opened far more often than it is ticked, so the body of the row opens it.
         *
         * Giving the whole row to selection left expanding to a 20px caret, which is a small target
         * for the thing people came to do. The box stays a box — it is still the way to take every
         * leaf underneath at once — but it no longer stands between the row and its own contents.
         */
        return (
            <div key={node.path} className={rowClass} style={indent}>
                <button
                    type="button"
                    className="json-key-caret json-key-caret-button"
                    onClick={() => toggleCollapsed(node.path)}
                    // Folding a branch out of a flattened list would hide nothing that is on screen.
                    disabled={filtering}
                    aria-expanded={!isCollapsed}
                    aria-label={`${node.dotted} ${isCollapsed ? 'expand' : 'collapse'}`}
                >
                    {filtering ? null : isCollapsed ? <VscChevronRight className="icon-sm" /> : <VscChevronDown className="icon-sm" />}
                </button>

                {box}

                {/* A second way to reach the caret's action, for the pointer only — `role` keeps it
                    out of the keyboard order rather than announcing the same control twice. */}
                <div
                    className="json-key-open"
                    role="presentation"
                    onClick={filtering ? undefined : () => toggleCollapsed(node.path)}
                    title={node.dotted}
                >
                    <span className="json-key-glyph">
                        <JsonKeyTypeGlyph node={node} />
                    </span>
                    {label}
                    <span className="badge badge-muted">{node.preview}</span>
                </div>
            </div>
        );
    };


    return (
        // `modal-header` / `modal-body` / `modal-footer` / `btn-icon-sm` are the page's own modal
        // parts (DataViewerPage.scss) — border, ground, shadow and spacing come from there rather
        // than from a second set of rules that would have to be kept in step with them. They are
        // written as direct children because `Modal` renders `children` straight into `.modal`.
        <DataViewerModalPortal>
            <Modal pIsDarkMode className="json-key-modal json-key-picker-modal" onOutSideClose={closeOnOutside}>
                <div ref={dialogRef} className="modal-header json-key-picker-header">
                    <div className="modal-header-title">Select keys</div>
                    <span className="json-key-modal-sub">{[tagName, `${documentKeyCount} keys`, baseLabel].filter(Boolean).join(' · ')}</span>
                    <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close">
                        <VscClose />
                    </button>
                </div>

                <div className="modal-body json-key-modal-body json-key-picker-body">
                    <div className="json-key-picker-tree-col">
                        <div className="json-key-modal-toolbar">
                            <input
                                className="json-key-modal-filter"
                                value={filter}
                                onChange={(event) => setFilter(event.target.value)}
                                placeholder="Filter keys — any depth"
                                aria-label="Filter keys"
                            />
                        </div>

                        <div className="json-key-modal-tree">
                            {nodes.length === 0 ? <div className="empty-state">This row does not hold a JSON document.</div> : null}
                            {nodes.length > 0 && visible.length === 0 ? <div className="empty-state">No keys match.</div> : null}
                            {visible.map(renderRow)}
                        </div>
                    </div>

                    {/* What is picked, gathered in one place.
                        Ticked keys are otherwise scattered down a tree that folds, filters and
                        scrolls — so the only way to review a selection was to go looking for it.
                        Here it is a list, and each entry can be dropped without finding its row. */}
                    <div className="json-key-picker-selected">
                        <div className="json-key-picker-selected-head">
                            <span className="json-key-picker-selected-title">
                                <VscListSelection className="icon-sm" /> SELECTED · {selected.length}
                            </span>
                            <button
                                type="button"
                                className="btn-icon-sm"
                                onClick={clearAll}
                                disabled={selected.length === 0}
                                title="Clear selection"
                                aria-label="Clear selection"
                            >
                                <VscClearAll />
                            </button>
                        </div>

                        <div className="json-key-picker-selected-list">
                            {selected.length === 0 ? <div className="empty-state">Nothing picked yet.</div> : null}
                            {selected.map((path) => {
                                const node = nodes.find((entry) => entry.path === path);
                                const name = node?.dotted ?? path;
                                return (
                                    <span key={path} className={`json-key-picker-chip${node?.numeric ? '' : ' is-flat'}`} title={name}>
                                        <span className="json-key-picker-chip-name">{name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelected((current) => current.filter((entry) => entry !== path))}
                                            aria-label={`Remove ${name}`}
                                            title={`Remove ${name}`}
                                        >
                                            <VscChromeClose />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="modal-footer json-key-modal-footer">
                        <span className="json-key-modal-count">
                            {`${selected.length} ${selected.length === 1 ? 'key' : 'keys'} selected · ${
                                seriesCount > MAX_JSON_KEY_SERIES ? `${MAX_JSON_KEY_SERIES} of ${seriesCount} drawn` : `${seriesCount} series`
                            }`}
                        </span>
                        <div className="json-key-modal-buttons">
                            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
                                Cancel
                            </button>
                            {/* Open for anything picked, numeric or not. The detail view is a chart
                                *and* a grid: a key holding text has no line to draw but every one of
                                its readings is a row, and the chart says so itself rather than the
                                door being held shut on account of it. The count beside this button
                                is what says how many of the picks will be drawn. */}
                            <button type="button" className="btn btn-sm btn-primary" onClick={() => onConfirm(selected)} disabled={selected.length === 0}>
                                View detail
                            </button>
                        </div>
                </div>
            </Modal>
        </DataViewerModalPortal>
    );
};

export default JsonKeyPickerModal;
