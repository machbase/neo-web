import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VscCheck, VscClose, VscCopy, VscError } from 'react-icons/vsc';
import Modal from '@/components/modal/Modal';
import DataViewerModalPortal from './DataViewerModalPortal';
import useOutsideCloseGuard from './useOutsideCloseGuard';
import useModalDialog from './useModalDialog';
import { writeClipboard } from './writeClipboard';

/**
 * One cell's text, at a size it can actually be read at.
 *
 * The grid gives every value one ellipsised line, which is right for a column of numbers and wrong
 * for the column that holds a stack trace or a serialized payload. This is the whole of the answer
 * for those: the text as it came, wrapped, scrollable, copyable — no parsing, no folding, nothing
 * that could show something other than what the column holds. A JSON column has the key picker
 * instead, which is a different question about a different kind of value.
 */

const COPY_HINT_MS = 1600;

/**
 * Pretty-print text that turns out to be a JSON document.
 *
 * A TEXT or CLOB column is free to hold one, and a minified payload on a single 4000-character line
 * is exactly the value this modal exists to make readable. Anything that does not parse is shown
 * untouched — reformatting is offered where it is certainly safe and never guessed at.
 */
const prettyJson = (text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
        return null;
    }
};

export interface TextValueModalProps {
    /** The column, which is what the reader came here for. */
    title: string;
    /** The row it belongs to — tag and base value — so the text has a place. */
    subtitle?: string;
    value: unknown;
    onClose: () => void;
}

export const TextValueModal = ({ title, subtitle, value, onClose }: TextValueModalProps) => {
    const closeOnOutside = useOutsideCloseGuard(onClose);
    const dialogRef = useModalDialog<HTMLDivElement>(`Value — ${title}`);
    const headRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<boolean | null>(null);
    const [formatted, setFormatted] = useState(true);
    const copyTimer = useRef<number>(0);

    useEffect(() => () => window.clearTimeout(copyTimer.current), []);

    const text = useMemo(() => (value === null || value === undefined ? '' : String(value)), [value]);
    const pretty = useMemo(() => prettyJson(text), [text]);
    const shown = pretty && formatted ? pretty : text;

    const copy = useCallback(() => {
        const host = headRef.current?.closest('.modal') as HTMLElement | null;
        writeClipboard(shown, host).then((ok) => {
            window.clearTimeout(copyTimer.current);
            setCopied(ok);
            copyTimer.current = window.setTimeout(() => setCopied(null), COPY_HINT_MS);
        });
    }, [shown]);

    return (
        <DataViewerModalPortal>
            <Modal pIsDarkMode className="text-value-modal modal-md" onOutSideClose={closeOnOutside}>
                <div className="modal-header text-value-modal-header" ref={headRef}>
                    <div className="text-value-modal-head">
                        <div className="text-value-modal-crumbs">
                            {subtitle ? <span className="text-value-modal-chip">{subtitle}</span> : null}
                            <span className="text-value-modal-position">{`${text.length.toLocaleString()} chars`}</span>
                        </div>
                        <button type="button" onClick={onClose} title="Close (Esc)" aria-label="Close">
                            <VscClose />
                        </button>
                    </div>
                    <div className="text-value-modal-title" title={title}>
                        {title}
                    </div>
                </div>

                <div className="modal-body text-value-modal-body" ref={dialogRef}>
                    {/* Monospace is set on the `<pre>` itself: the app's global `* { font-family }`
                        overrides the UA default and breaks inheritance, so a container carrying the
                        face would not reach this element. */}
                    <pre className="text-value-modal-text">{shown || <span className="is-null">NULL</span>}</pre>
                </div>

                <div className="modal-footer text-value-modal-foot">
                    <span className="text-value-modal-hint">{copied === null ? 'Esc to close' : copied ? 'Copied' : 'Copy failed — select the text manually'}</span>
                    <div className="text-value-modal-actions">
                        {/* Offered only when the text really is a document, so the control never
                            promises a formatting this value cannot take. */}
                        {pretty ? (
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setFormatted((current) => !current)}>
                                {formatted ? 'Raw' : 'Formatted'}
                            </button>
                        ) : null}
                        <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
                            {copied === null ? <VscCopy /> : copied ? <VscCheck /> : <VscError />}
                            <span>Copy</span>
                        </button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </DataViewerModalPortal>
    );
};

export default TextValueModal;
