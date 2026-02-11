import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Tooltip } from 'react-tooltip';
import { VideoEvent } from '../hooks/useCameraEvents';
import { formatIsoWithMs } from '../utils/timeUtils';
import { Button, IconButton, Modal } from '@/design-system/components';
import { MdSkipPrevious, MdSkipNext, ArrowLeft, ArrowRight } from '@/assets/icons/Icon';

interface EventListModalProps {
    events: VideoEvent[];
    onClose: () => void;
    onSeek: (time: Date) => void | Promise<void>;
}

const ITEMS_PER_PAGE = 5;
const EVENT_EXPRESSION_TOOLTIP_ID = 'video-event-expression-tooltip';
const EVENT_CONTENT_TOOLTIP_ID = 'video-event-content-tooltip';
const EVENT_VALUE_TOOLTIP_ID = 'video-event-value-tooltip';

export const EventListModal: React.FC<EventListModalProps> = ({ events, onClose, onSeek }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');

    // Calculate pagination
    const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const handlePageInputEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        const parsedPage = Number.parseInt(pageInput, 10);
        if (Number.isNaN(parsedPage)) {
            setPageInput(String(currentPage));
            return;
        }
        const targetPage = Math.max(1, Math.min(parsedPage, totalPages));
        handlePageChange(targetPage);
        setPageInput(String(targetPage));
    };

    useEffect(() => {
        setCurrentPage(1);
        setPageInput('1');
    }, [events]);

    useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    const handleMoveClick = async (time: Date) => {
        try {
            await onSeek(time);
        } finally {
            onClose();
        }
    };

    const getValueDotClassName = (value: number) => {
        if (value === 2) return 'event-value-dot value-2';
        if (value === 1) return 'event-value-dot value-1';
        if (value === 0) return 'event-value-dot value-0';
        if (value === -1) return 'event-value-dot value-minus-1';
        return 'event-value-dot value-default';
    };

    const getValueTooltipText = (value: number) => {
        if (value === 2) return 'MATCH';
        if (value === 1) return 'TRIGGER';
        if (value === 0) return 'CLEAR';
        if (value === -1) return 'ERROR';
        return 'UNKNOWN';
    };

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
                        currentEvents.map((event) => {
                            const eventContent = Object.keys(event.usedCountsSnapshot).length > 0 ? JSON.stringify(event.usedCountsSnapshot) : '-';

                            return (
                                <div key={event.id} className="event-item">
                                    <div className="event-row">
                                        <span className="event-time">{formatIsoWithMs(event.timestamp)}</span>
                                        <span className="event-spacer" />
                                        <span className="event-id" data-tooltip-id={EVENT_EXPRESSION_TOOLTIP_ID} data-tooltip-content={event.expressionText || ''}>
                                            {`${event.cameraId}.${event.ruleId}`}
                                        </span>
                                        <span className="event-spacer" />
                                        <span
                                            className={getValueDotClassName(event.value)}
                                            aria-label={`Event value ${event.value}`}
                                            data-tooltip-id={EVENT_VALUE_TOOLTIP_ID}
                                            data-tooltip-content={getValueTooltipText(event.value)}
                                        />
                                        <span className="event-spacer" />
                                        <span
                                            className="event-content"
                                            data-tooltip-id={EVENT_CONTENT_TOOLTIP_ID}
                                            data-tooltip-content={eventContent}
                                        >
                                            {eventContent}
                                        </span>
                                        <Button type="button" variant="primary" size="sm" className="event-move-btn" onClick={() => void handleMoveClick(event.timestamp)}>
                                            Move
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-events">No events found in this range.</div>
                    )}
                </div>
            </Modal.Body>

            {totalPages > 1 && (
                <Modal.Footer className="event-pagination">
                    <div className="event-pagination-controls">
                        <IconButton
                            icon={<MdSkipPrevious size={16} />}
                            onClick={() => handlePageChange(1)}
                            disabled={currentPage === 1}
                            aria-label="First page"
                            variant="ghost"
                            size="xsm"
                            className="page-nav-btn"
                        />
                        <IconButton
                            icon={<ArrowLeft size={16} />}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            aria-label="Previous page"
                            variant="ghost"
                            size="xsm"
                            className="page-nav-btn"
                        />
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={handlePageInputEnter}
                            aria-label="Page number"
                            className="page-input"
                        />
                        <span className="page-total">/ {totalPages}</span>
                        <IconButton
                            icon={<ArrowRight size={16} />}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            aria-label="Next page"
                            variant="ghost"
                            size="xsm"
                            className="page-nav-btn"
                        />
                        <IconButton
                            icon={<MdSkipNext size={16} />}
                            onClick={() => handlePageChange(totalPages)}
                            disabled={currentPage === totalPages}
                            aria-label="Last page"
                            variant="ghost"
                            size="xsm"
                            className="page-nav-btn"
                        />
                    </div>
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
            <Tooltip
                id={EVENT_CONTENT_TOOLTIP_ID}
                place="top"
                positionStrategy="fixed"
                className="tooltip-div event-content-tooltip"
                classNameArrow="tooltip-div-arrow"
                noArrow={false}
                delayShow={250}
            />
            <Tooltip
                id={EVENT_VALUE_TOOLTIP_ID}
                place="top"
                positionStrategy="fixed"
                className="tooltip-div"
                classNameArrow="tooltip-div-arrow"
                noArrow={false}
                delayShow={250}
            />
        </Modal.Root>
    );
};
