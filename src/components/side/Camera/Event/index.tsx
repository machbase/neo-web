import { Badge, Button, CommonTable, DatePicker, Dropdown, Page, Pagination, TextHighlight } from '@/design-system/components';
import type { ColumnDef } from '@/design-system/components';
import { useEffect, useRef, useState } from 'react';
import { loadCameras, queryCameraEvents, buildBaseUrl } from '@/components/dashboard/panels/video/utils/api';
import type { CameraEventsQueryParams } from '@/components/dashboard/panels/video/utils/api';
import type { MediaServerConfigItem } from '@/api/repository/mediaSvr';
import { VideoEvent } from '@/components/dashboard/panels/video/hooks/useCameraEvents';
import { parseTimestamp, formatIsoWithMs } from '@/components/dashboard/panels/video/utils/timeUtils';
import { getEventTypeStyleSuffix, normalizeEventTypeLabel } from '@/utils/eventTypePresentation';
import styles from '../eventsModal.module.scss';
import { EventDetailModal } from './EventDetailModal';

import moment from 'moment';
import { Tooltip } from 'react-tooltip';

const EVENT_TYPE_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'MATCH', label: 'Match' },
    { value: 'TRIGGER', label: 'Trigger' },
    { value: 'RESOLVE', label: 'Resolve' },
    { value: 'ERROR', label: 'Error' },
];

interface EventPageProps {
    pServerConfig?: MediaServerConfigItem;
}

export const EventPage = ({ pServerConfig }: EventPageProps) => {
    const baseUrl = pServerConfig ? buildBaseUrl(pServerConfig.ip, pServerConfig.port) : undefined;
    const svrName = pServerConfig ? pServerConfig.alias : undefined;
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [sStartTime, setStartTime] = useState<string>(moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss'));
    const [sEndTime, setEndTime] = useState<string>(moment().format('YYYY-MM-DD HH:mm:ss'));
    const [recordMode, setRecordMode] = useState<CameraEventsQueryParams['event_type']>('ALL');
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [cameraOptions, setCameraOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: 'All' }]);
    const [searchName, setSearchName] = useState<string>('');
    const [eventList, setEventList] = useState<VideoEvent[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<VideoEvent | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('1');
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 20;

    const handleStartTime = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStartTime(e.target.value);
    };
    const handleEndTime = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEndTime(e.target.value);
    };

    const handleSearch = () => {
        setCurrentPage(1);
        setPageInput('1');
        fetchEvents(1);
    };

    const handleReset = async () => {
        setSearchName('');
        setStartTime(moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss'));
        setEndTime(moment().format('YYYY-MM-DD HH:mm:ss'));
        setRecordMode('ALL');
        setSelectedCamera('');
        setCurrentPage(1);
        setPageInput('1');

        // Fetch with default values since state updates are async
        const startNs = BigInt(moment().subtract(7, 'days').valueOf()) * 1000000n;
        const endNs = BigInt(moment().valueOf()) * 1000000n;
        try {
            const result = await queryCameraEvents({ start_time: startNs, end_time: endNs, event_type: 'ALL', size: PAGE_SIZE, page: 1 }, baseUrl);
            setTotalCount(result.total_count);
            setTotalPages(result.total_pages);
            const events = result.events.map((item, index) => {
                const timeText = typeof item.time === 'string' ? item.time : String(item.time ?? '');
                let parsedTime: Date;
                if (/^\d{16,}$/.test(timeText)) {
                    parsedTime = new Date(Number(BigInt(timeText) / 1000000n));
                } else {
                    parsedTime = parseTimestamp(timeText) ?? new Date(timeText);
                }
                let usedCounts: Record<string, number> = {};
                try {
                    const parsed = JSON.parse(item.used_counts_snapshot || '{}');
                    if (parsed && typeof parsed === 'object') {
                        usedCounts = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                            if (typeof value === 'number') acc[key] = value;
                            return acc;
                        }, {});
                    }
                } catch {
                    usedCounts = {};
                }
                return {
                    id: `${item.camera_id}-${item.rule_id}-${item.time}-${index}`,
                    timestamp: parsedTime,
                    name: item.name,
                    value: item.value,
                    valueLabel: item.value_label,
                    expressionText: item.expression_text,
                    usedCountsSnapshot: usedCounts,
                    cameraId: item.camera_id,
                    ruleId: item.rule_id,
                    rule_name: item.rule_name,
                } as VideoEvent;
            });
            const filtered = events.filter((e) => !Number.isNaN(e.timestamp.getTime()));
            setEventList(filtered);
            tableContainerRef.current?.scrollTo({ top: 0 });
        } catch (err) {
            // console.error('Failed to fetch events:', err);
        }
    };

    const fetchEvents = async (page = currentPage) => {
        const startNs = BigInt(moment(sStartTime).valueOf()) * 1000000n;
        const endNs = BigInt(moment(sEndTime).valueOf()) * 1000000n;
        try {
            const result = await queryCameraEvents(
                {
                    camera_id: selectedCamera || undefined,
                    start_time: startNs,
                    end_time: endNs,
                    event_type: recordMode,
                    event_name: searchName || undefined,
                    size: PAGE_SIZE,
                    page,
                },
                baseUrl
            );
            setTotalCount(result.total_count);
            setTotalPages(result.total_pages);
            const events = result.events.map((item, index) => {
                const timeText = typeof item.time === 'string' ? item.time : String(item.time ?? '');
                let parsedTime: Date;
                if (/^\d{16,}$/.test(timeText)) {
                    parsedTime = new Date(Number(BigInt(timeText) / 1000000n));
                } else {
                    parsedTime = parseTimestamp(timeText) ?? new Date(timeText);
                }
                let usedCounts: Record<string, number> = {};
                try {
                    const parsed = JSON.parse(item.used_counts_snapshot || '{}');
                    if (parsed && typeof parsed === 'object') {
                        usedCounts = Object.entries(parsed).reduce<Record<string, number>>((acc, [key, value]) => {
                            if (typeof value === 'number') acc[key] = value;
                            return acc;
                        }, {});
                    }
                } catch {
                    usedCounts = {};
                }
                return {
                    id: `${item.camera_id}-${item.rule_id}-${item.time}-${index}`,
                    timestamp: parsedTime,
                    name: item.name,
                    value: item.value,
                    valueLabel: item.value_label,
                    expressionText: item.expression_text,
                    usedCountsSnapshot: usedCounts,
                    cameraId: item.camera_id,
                    ruleId: item.rule_id,
                    rule_name: item.rule_name,
                } as VideoEvent;
            });
            const filtered = events.filter((e) => !Number.isNaN(e.timestamp.getTime()));
            setEventList(filtered);
            tableContainerRef.current?.scrollTo({ top: 0 });
        } catch (err) {
            // console.error('Failed to fetch events:', err);
        }
    };

    const getCameraList = async () => {
        const res = await loadCameras(baseUrl);
        setCameraOptions([{ value: '', label: 'All' }, ...res.map((cam) => ({ value: cam.id, label: cam.label || cam.id }))]);
    };

    const init = () => {
        getCameraList();
        fetchEvents();
    };

    useEffect(() => {
        init();
    }, [baseUrl]);

    const eventColumnDefs: ColumnDef<VideoEvent>[] = [
        {
            key: 'timestamp',
            header: 'Time',
            headerStyle: { padding: '6px 12px', textAlign: 'left' },
            style: { whiteSpace: 'nowrap', padding: '6px 12px', color: 'rgba(255,255,255,0.7)' },
            render: (event) => (
                <span data-tooltip-id="event-tooltip" data-tooltip-content={formatIsoWithMs(event.timestamp)}>
                    {formatIsoWithMs(event.timestamp)}
                </span>
            ),
        },
        {
            key: 'cameraId',
            header: 'Camera',
            headerStyle: { padding: '6px 8px', textAlign: 'left' },
            style: { padding: '6px 8px' },
            render: (event) => (
                <span data-tooltip-id="event-tooltip" data-tooltip-content={event.cameraId}>
                    {event.cameraId}
                </span>
            ),
        },
        {
            key: 'rule_name',
            header: 'Rule',
            headerStyle: { padding: '6px 8px', textAlign: 'left' },
            style: { padding: '6px 8px' },
            render: (event) => (
                <span data-tooltip-id="event-tooltip" data-tooltip-content={event.rule_name}>
                    {event.rule_name ?? '-'}
                </span>
            ),
        },
        {
            key: 'expressionText',
            header: 'Expression',
            headerStyle: { padding: '6px 8px', textAlign: 'left' },
            style: { padding: '6px 8px', color: 'rgba(255,255,255,0.5)', maxWidth: '300px', overflowX: 'auto', whiteSpace: 'nowrap' },
            render: (event) => (
                <span data-tooltip-id="event-tooltip" data-tooltip-content={event.expressionText || '-'}>
                    <TextHighlight variant="muted" style={{ fontFamily: 'monospace' }}>
                        {event.expressionText || '-'}
                    </TextHighlight>
                </span>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            headerStyle: { padding: '6px 8px', textAlign: 'left' },
            render: (event) => {
                const eventTypeStyleSuffix = getEventTypeStyleSuffix(event.valueLabel);
                return (
                    <span data-tooltip-id="event-tooltip" data-tooltip-content={normalizeEventTypeLabel(event.valueLabel)}>
                        <span className={`${styles.eventTypeDot} ${styles[`eventTypeDot--${eventTypeStyleSuffix}`]}`} />
                    </span>
                );
            },
        },
        {
            key: 'content',
            header: 'Content',
            headerStyle: { padding: '6px 8px', textAlign: 'left' },
            style: { padding: '6px 8px', maxWidth: '300px', overflowX: 'auto' },
            render: (event) => (
                <span
                    data-tooltip-id="event-tooltip"
                    data-tooltip-content={Object.keys(event.usedCountsSnapshot).length > 0 ? JSON.stringify(event.usedCountsSnapshot, null, 2) : '-'}
                >
                    {Object.keys(event.usedCountsSnapshot).length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                            {Object.entries(event.usedCountsSnapshot).map(([key, value]) => (
                                <Badge key={key} variant="primary" size="md">
                                    <TextHighlight variant="neutral">
                                        {key}: {value}
                                    </TextHighlight>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        '-'
                    )}
                </span>
            ),
        },
    ];

    const handleEventRowClick = (event: VideoEvent) => {
        setSelectedEvent(event);
        setIsDetailOpen(true);
    };

    return (
        <>
            <Page>
                <Page.Header />
                <Page.Body footer style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                    {/* filter cond (time range, camera, event name, event type) */}
                    {/* time range (default = 7d) */}
                    <Page.ContentBlock pHoverNone pSticky style={{ padding: '12px 0 0 0', flexShrink: 0 }}>
                        <Page.ContentBlock pHoverNone style={{ padding: 0 }}>
                            <Page.DpRowBetween>
                                <Page.DpRow style={{ flexDirection: 'column', alignItems: 'start' }}>
                                    <Page.SubTitle style={{ minWidth: '200px' }}>Events</Page.SubTitle>
                                    <TextHighlight>{svrName}</TextHighlight>
                                    <TextHighlight variant="muted" style={{ fontSize: '12px' }}>
                                        {baseUrl}
                                    </TextHighlight>
                                </Page.DpRow>
                                <Page.DpRow style={{ gap: '8px', flexWrap: 'wrap' }}>
                                    <DatePicker
                                        pLabel="From"
                                        labelPosition="top"
                                        pTopPixel={32}
                                        pTimeValue={sStartTime}
                                        onChange={(date: any) => handleStartTime(date)}
                                        pSetApply={(date: any) => setStartTime(date)}
                                    />
                                    <DatePicker
                                        pLabel="To"
                                        labelPosition="top"
                                        pTopPixel={32}
                                        pTimeValue={sEndTime}
                                        onChange={(date: any) => handleEndTime(date)}
                                        pSetApply={(date: any) => setEndTime(date)}
                                    />
                                    <Dropdown.Root
                                        style={{ width: '200px' }}
                                        label="Camera"
                                        labelPosition="top"
                                        options={cameraOptions}
                                        value={selectedCamera}
                                        onChange={setSelectedCamera}
                                    >
                                        <Dropdown.Trigger />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                    <Dropdown.Root
                                        style={{ width: '200px' }}
                                        label="Event type"
                                        labelPosition="top"
                                        options={EVENT_TYPE_OPTIONS}
                                        value={recordMode}
                                        onChange={(v: string) => setRecordMode(v as CameraEventsQueryParams['event_type'])}
                                    >
                                        <Dropdown.Trigger />
                                        <Dropdown.Menu>
                                            <Dropdown.List />
                                        </Dropdown.Menu>
                                    </Dropdown.Root>
                                    <Page.DpRow style={{ gap: '4px', alignSelf: 'flex-end', paddingLeft: '20px' }}>
                                        <Button size="sm" onClick={handleSearch}>
                                            Search
                                        </Button>
                                        <Button size="sm" variant="secondary" onClick={handleReset}>
                                            Reset
                                        </Button>
                                    </Page.DpRow>
                                </Page.DpRow>
                            </Page.DpRowBetween>
                        </Page.ContentBlock>
                        <Page.Divi direction="horizontal" style={{ margin: 0 }} />
                    </Page.ContentBlock>
                    <div ref={tableContainerRef} style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                        <CommonTable
                            items={eventList}
                            columnDefs={eventColumnDefs}
                            rowKey={(event) => event.id}
                            onRowClick={handleEventRowClick}
                            stickyHeader
                            emptyMessage="No events found."
                            className={styles.rules__table}
                            style={{ borderCollapse: 'collapse', width: '100%' }}
                        />
                    </div>
                </Page.Body>
                <Page.Footer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                    {totalCount > 0 && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Total {totalCount}</span>}
                    {totalPages > 1 && (
                        <Pagination
                            showTotalPage
                            currentPage={currentPage}
                            totalPages={totalPages}
                            inputValue={pageInput}
                            onPageChange={(page) => {
                                setCurrentPage(page);
                                setPageInput(page.toString());
                                fetchEvents(page);
                            }}
                            onPageInputChange={setPageInput}
                            style={{ padding: '8px 0' }}
                        />
                    )}
                </Page.Footer>
            </Page>
            <Tooltip id="event-tooltip" className="tooltip-div" place="top" delayShow={400} style={{ whiteSpace: 'pre' }} />
            <EventDetailModal
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
                baseUrl={baseUrl}
            />
        </>
    );
};
