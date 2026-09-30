import type { ReactNode } from 'react';
import { VscArrowLeft, VscClose } from 'react-icons/vsc';
import { MuiTagAnalyzer } from '@/assets/icons/Mui';
import Modal from '@/components/modal/Modal';
import DataViewerModalPortal from './DataViewerModalPortal';
import useOutsideCloseGuard from './useOutsideCloseGuard';
import useModalDialog from './useModalDialog';

export function ValueDetailPager({ page, pageCount, count, pageSize, loading = false, hasMore, onPage, onPageSize }: {
    page: number; pageCount?: number; count: string; pageSize: number; loading?: boolean; hasMore: boolean;
    onPage: (page: number) => void; onPageSize: (size: number) => void;
}) {
    return <div className="json-key-detail-pager">
        <span className="json-key-modal-count">{count}</span>
        <div className="json-key-detail-pager-controls">
            <button type="button" className="json-key-detail-step" aria-label="First page" disabled={loading || page === 0} onClick={() => onPage(0)}>«</button>
            <button type="button" className="json-key-detail-step" aria-label="Previous page" disabled={loading || page === 0} onClick={() => onPage(page - 1)}>‹</button>
            <span className="json-key-detail-page">{page + 1}{pageCount === undefined ? '' : ` / ${pageCount}`}</span>
            <button type="button" className="json-key-detail-step" aria-label="Next page" disabled={loading || !hasMore} onClick={() => onPage(page + 1)}>›</button>
            {pageCount !== undefined ? <button type="button" className="json-key-detail-step" aria-label="Last page" disabled={loading || !hasMore} onClick={() => onPage(pageCount - 1)}>»</button> : null}
        </div>
        <div className="json-key-detail-sizes" role="group" aria-label="Rows per page">
            {[25, 50, 100].map(size => <button key={size} type="button" className={`json-key-detail-chip${pageSize === size ? ' is-active' : ''}`} aria-pressed={pageSize === size} onClick={() => onPageSize(size)}>{size}</button>)}
        </div>
    </div>;
}

/** The JSON detail view's presentation, shared with ARRAY; callers own data and query state. */
export default function ValueDetailDialog({ label, title, titleTooltip, meta, windowLabel, chart, grid, pager, error, onClose, onBack, backLabel = 'Back to keys', analyzer, className = '' }: {
    label: string; title: ReactNode; titleTooltip?: string; meta: ReactNode; windowLabel: {text: string; full: string};
    chart: ReactNode; grid: ReactNode; pager: ReactNode; error?: ReactNode; onClose: () => void; onBack?: () => void;
    backLabel?: string; className?: string; analyzer?: { onClick: () => void; disabled: boolean; title?: string };
}) {
    const dialogRef = useModalDialog<HTMLDivElement>(label);
    const outside = useOutsideCloseGuard(onClose);
    return <DataViewerModalPortal><Modal pIsDarkMode className={`json-key-modal json-key-detail-modal ${className}`} onOutSideClose={outside}>
        <div ref={dialogRef} className="modal-header json-key-detail-head">
            <div className="modal-header-title json-key-modal-title"><span title={titleTooltip}>{title}</span><span className="json-key-modal-sub">{meta}</span></div>
            <span className="json-key-detail-window" title={windowLabel.full}>{windowLabel.text}</span>
            <div className="json-key-detail-head-actions">
                {analyzer ? <button type="button" className="json-key-detail-handoff" onClick={analyzer.onClick} disabled={analyzer.disabled} title={analyzer.title ?? 'Open in Tag Analyzer'} aria-label="Open in Tag Analyzer"><MuiTagAnalyzer width={18} height={18} /></button> : null}
                <button type="button" className="btn-icon-sm" onClick={onClose} aria-label="Close"><VscClose /></button>
            </div>
        </div>
        <div className="modal-body json-key-modal-body">
            {error ? <div className="json-key-detail-error" role="alert">{error}</div> : null}
            <div className="json-key-detail-split">
                <div className="json-key-detail-chart-col"><div className="json-key-detail-chart">{chart}</div></div>
                <div className="json-key-detail-grid-col">{grid}{pager}</div>
            </div>
        </div>
        <div className="modal-footer json-key-detail-foot">
            <button type="button" className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
            {onBack ? <button type="button" className="btn btn-sm btn-primary" onClick={onBack}><VscArrowLeft className="icon-sm" /> {backLabel}</button> : null}
        </div>
    </Modal></DataViewerModalPortal>;
}
