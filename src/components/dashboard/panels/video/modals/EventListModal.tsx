import React, { useState, useEffect } from 'react';
import { Tooltip } from 'react-tooltip';
import { VideoEvent } from '../hooks/useCameraEvents';
import { formatIsoWithMs } from '../utils/timeUtils';
import { IconButton, Modal } from '@/design-system/components';
import { MdSkipPrevious, MdSkipNext } from '@/assets/icons/Icon';

interface EventListModalProps {
    events: VideoEvent[];
    onClose: () => void;
    onSeek: (time: Date) => void;
}

const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 10;
const EVENT_EXPRESSION_TOOLTIP_ID = 'video-event-expression-tooltip';

export const EventListModal: React.FC<EventListModalProps> = ({ events, onClose, onSeek }) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Calculate pagination
    const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const getVisiblePages = () => {
        if (totalPages <= MAX_VISIBLE_PAGES) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const half = Math.floor(MAX_VISIBLE_PAGES / 2);
        let start = currentPage - half;
        let end = start + MAX_VISIBLE_PAGES - 1;

        if (start < 1) {
            start = 1;
            end = MAX_VISIBLE_PAGES;
        } else if (end > totalPages) {
            end = totalPages;
            start = totalPages - MAX_VISIBLE_PAGES + 1;
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [events]);

    return (
        <Modal.Root isOpen onClose={onClose} size="fit" className="event-modal-root">
            <Modal.Header className="event-modal-header">
                <div className="header-left">
                    <Modal.Title>EVENT NOTIFICATIONS</Modal.Title>
                </div>
                <Modal.Close />
            </Modal.Header>

            <Modal.Body className="event-modal-body">
                <div className="event-list">
                    {currentEvents.length > 0 ? (
                        currentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="event-item"
                                onClick={() => onSeek(event.timestamp)}
                            >
                                <div className="event-row">
                                    <span className="event-time">{formatIsoWithMs(event.timestamp)}</span>
                                    <span className="event-spacer" />
                                    <span className="event-id">{`${event.cameraId}.${event.ruleId}`}</span>
                                    <span className="event-spacer" />
                                    <span
                                        className="event-content"
                                        data-tooltip-id={EVENT_EXPRESSION_TOOLTIP_ID}
                                        data-tooltip-content={event.expressionText || ''}
                                    >
                                        {Object.keys(event.usedCountsSnapshot).length > 0 ? JSON.stringify(event.usedCountsSnapshot) : '-'}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-events">No events found in this range.</div>
                    )}
                </div>
            </Modal.Body>

            {totalPages > 1 && (
                <Modal.Footer className="event-pagination">
                    <IconButton
                        icon={<MdSkipPrevious size={16} />}
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                        variant="ghost"
                        size="xsm"
                        className="page-nav-btn"
                    />

                    <div className="page-numbers">
                        {getVisiblePages().map((page) => (
                            <button key={page} className={`page-number ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page)}>
                                {page}
                            </button>
                        ))}
                    </div>

                    <IconButton
                        icon={<MdSkipNext size={16} />}
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                        variant="ghost"
                        size="xsm"
                        className="page-nav-btn"
                    />
                </Modal.Footer>
            )}
            <Tooltip
                id={EVENT_EXPRESSION_TOOLTIP_ID}
                place="top"
                positionStrategy="fixed"
                className="tooltip-div"
                classNameArrow="tooltip-div-arrow"
                noArrow={false}
                delayShow={300}
            />
        </Modal.Root>
    );
};
