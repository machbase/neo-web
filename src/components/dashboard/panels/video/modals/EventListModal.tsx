import React, { useState, useEffect, useRef } from 'react';
import { MockEvent } from '../hooks/useEventMockData';
import { formatIsoWithMs } from '../utils/timeUtils';
import { IconButton } from '@/design-system/components';
import { MdSkipPrevious, MdSkipNext, Close } from '@/assets/icons/Icon';

interface EventListModalProps {
    events: MockEvent[];
    onClose: () => void;
    onSeek: (time: Date) => void;
}

const ITEMS_PER_PAGE = 3;

export const EventListModal: React.FC<EventListModalProps> = ({ events, onClose, onSeek }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const modalRef = useRef<HTMLDivElement>(null);

    // Calculate pagination
    const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentEvents = events.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Add listener after a small delay to avoid immediate closing
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Close on ESC key
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [onClose]);

    return (
        <div
            className="event-notification-modal"
            ref={modalRef}
        >
            <div className="event-modal-header">
                <div className="header-left">
                    <span className="title">EVENT NOTIFICATIONS</span>
                </div>
                <IconButton
                    icon={<Close size={16} />}
                    onClick={onClose}
                    aria-label="Close"
                    variant="ghost"
                    size="xsm"
                    className="close-btn"
                />
            </div>

            <div className="event-list">
                {currentEvents.length > 0 ? (
                    currentEvents.map((event) => (
                        <div key={event.id} className="event-item" onClick={() => onSeek(event.timestamp)}>
                            <div className="event-time">
                                {formatIsoWithMs(event.timestamp)}
                                <span className="event-id">EVT-{event.id.substring(0, 4).toUpperCase()}</span>
                            </div>
                            <div className="event-content">
                                {JSON.stringify(event.objects)}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-events">No events found in this range.</div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="event-pagination">
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`page-number ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                            >
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
                </div>
            )}
        </div>
    );
};
