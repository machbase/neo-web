import { Badge, Button, DatePicker, Dropdown, Input, Page, Pagination, TextHighlight } from '@/design-system/components';


import { useEffect, useState } from 'react';
import { loadCameras, queryCameraEvents, buildBaseUrl } from '@/components/dashboard/panels/video/utils/api';
import type { CameraEventsQueryParams } from '@/components/dashboard/panels/video/utils/api';
import type { MediaServerConfigItem } from '@/api/repository/mediaSvr';
import { VideoEvent } from '@/components/dashboard/panels/video/hooks/useCameraEvents';
import { parseTimestamp, formatIsoWithMs } from '@/components/dashboard/panels/video/utils/timeUtils';
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
    const [sStartTime, setStartTime] = useState<string>(moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss'));
    const [sEndTime, setEndTime] = useState<string>(moment().format('YYYY-MM-DD HH:mm:ss'));
    const [recordMode, setRecordMode] = useState<CameraEventsQueryParams['event_type']>('ALL');
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [cameraOptions, setCameraOptions] = useState<{ value: string; label: string }[]>([{ value: '', label: 'All' }]);
    const [searchName, setSearchName] = useState<string>('');
    const [eventList, setEventList] = useState<VideoEvent[]>([]); // MOCK_EVENTS
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

    const handleReset = () => {
        setSearchName('');
        setStartTime(moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss'));
        setEndTime(moment().format('YYYY-MM-DD HH:mm:ss'));
        setRecordMode('ALL');
        setSelectedCamera('');
        setCurrentPage(1);
        setPageInput('1');
    };

    const fetchEvents = async (page = currentPage) => {
        const startNs = BigInt(moment(sStartTime).valueOf()) * 1000000n;
        const endNs = BigInt(moment(sEndTime).valueOf()) * 1000000n;
        try {
            const result = await queryCameraEvents({
                camera_id: selectedCamera || undefined,
                start_time: startNs,
                end_time: endNs,
                event_type: recordMode,
                event_name: searchName || undefined,
                size: PAGE_SIZE,
                page,
            }, baseUrl);
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
                } as VideoEvent;
            });
            const filtered = events.filter((e) => !Number.isNaN(e.timestamp.getTime()));
            setEventList(filtered);
        } catch (err) {
            console.error('Failed to fetch events:', err);
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
                                <Page.SubTitle style={{ minWidth: '200px' }}>Events</Page.SubTitle>
                                <Page.DpRow style={{ gap: '8px', flexWrap: 'wrap' }}>
                                    <Input
                                        label="Event Name"
                                        labelPosition="top"
                                        placeholder="Search event name"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        style={{ width: '200px' }}
                                    />
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
                                </Page.DpRow>
                            </Page.DpRowBetween>
                        </Page.ContentBlock>
                        <Page.ContentBlock pHoverNone style={{ padding: '4px 0' }}>
                            <Page.DpRow style={{ gap: '4px', flexWrap: 'wrap', justifyContent: 'end' }}>
                                {searchName && (
                                    <Badge variant="primary" size="lg">
                                        <TextHighlight variant="neutral">Name: {searchName}</TextHighlight>
                                    </Badge>
                                )}
                                <Badge variant="primary" size="lg">
                                    <TextHighlight variant="neutral">
                                        {sStartTime} ~ {sEndTime}
                                    </TextHighlight>
                                </Badge>
                                {selectedCamera && (
                                    <Badge variant="primary" size="lg">
                                        <TextHighlight variant="neutral"> Camera: {cameraOptions.find((o) => o.value === selectedCamera)?.label || selectedCamera}</TextHighlight>
                                    </Badge>
                                )}
                                {recordMode !== 'ALL' && (
                                    <Badge variant="primary" size="lg">
                                        <TextHighlight variant="neutral"> Type: {recordMode}</TextHighlight>
                                    </Badge>
                                )}
                                <Page.DpRow style={{ gap: '4px', alignSelf: 'flex-end', paddingLeft: '20px' }}>
                                    <Button size="sm" onClick={handleSearch}>
                                        Search
                                    </Button>
                                    <Button size="sm" variant="secondary" onClick={handleReset}>
                                        Reset
                                    </Button>
                                </Page.DpRow>
                            </Page.DpRow>
                        </Page.ContentBlock>
                        <Page.Divi direction="horizontal" />
                    </Page.ContentBlock>

                    <div style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
                        <table className={styles.rules__table} style={{ fontSize: '12px', borderCollapse: 'collapse', width: '100%' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#252525', boxShadow: '0 1px 0 rgba(255, 255, 255, 0.1)' }}>
                                <tr>
                                    <th style={{ padding: '6px 12px', textAlign: 'left' }}>Time</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Camera</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Name</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Type</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Content</th>
                                    <th style={{ padding: '6px 12px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {eventList.length > 0 ? (
                                    eventList.map((event) => (
                                        <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                            <td
                                                style={{ whiteSpace: 'nowrap', padding: '6px 12px', color: 'rgba(255,255,255,0.7)' }}
                                                data-tooltip-id="event-tooltip"
                                                data-tooltip-content={formatIsoWithMs(event.timestamp)}
                                            >
                                                {formatIsoWithMs(event.timestamp)}
                                            </td>
                                            <td
                                                style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.5)' }}
                                                data-tooltip-id="event-tooltip"
                                                data-tooltip-content={event.cameraId}
                                            >
                                                {event.cameraId}
                                            </td>
                                            <td
                                                style={{ padding: '6px 8px', color: 'rgba(255,255,255,0.5)' }}
                                                data-tooltip-id="event-tooltip"
                                                data-tooltip-content={event.expressionText || event.name}
                                            >
                                                {event.name}
                                            </td>
                                            <td data-tooltip-id="event-tooltip" data-tooltip-content={event.valueLabel || ''}>
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor:
                                                            event.valueLabel === 'MATCH' || event.valueLabel === 'TRIGGER'
                                                                ? '#f97316'
                                                                : event.valueLabel === 'RESOLVE'
                                                                ? '#22c55e'
                                                                : event.valueLabel === 'ERROR'
                                                                ? '#ef4444'
                                                                : '#888',
                                                    }}
                                                />
                                            </td>
                                            <td
                                                style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}
                                                data-tooltip-id="event-tooltip"
                                                data-tooltip-content={Object.keys(event.usedCountsSnapshot).length > 0 ? JSON.stringify(event.usedCountsSnapshot, null, 2) : '-'}
                                            >
                                                {Object.keys(event.usedCountsSnapshot).length > 0 ? JSON.stringify(event.usedCountsSnapshot) : '-'}
                                            </td>
                                            <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        setSelectedEvent(event);
                                                        setIsDetailOpen(true);
                                                    }}
                                                >
                                                    Move
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className={styles.rules__empty}>
                                            No events found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Page.Body>
                <Page.Footer style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                    {totalCount > 0 && (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                            Total {totalCount}
                        </span>
                    )}
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
