// Video API Utilities

// 임시 API 서버 주소 설정
const DEFAULT_API_BASE = 'http://192.168.0.87:8088';
export const KEY_LOCAL_STORAGE_API_BASE = 'machbaseApiBase';

/**
 * Get API base URL from the first entry in the stored config array
 */
export function getApiBase(): string {
    const stored = window.localStorage?.getItem(KEY_LOCAL_STORAGE_API_BASE);
    if (stored) {
        try {
            const configs = JSON.parse(stored);
            if (Array.isArray(configs) && configs.length > 0) {
                const { ip, port } = configs[0];
                const url = port ? `${ip}:${port}` : ip;
                return /^https?:\/\//i.test(url) ? url : `http://${url}`;
            }
        } catch {
            // Fallback: legacy plain string format
            const cleaned = stored.replace(/\/$/, '');
            return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
        }
    }
    return DEFAULT_API_BASE;
}

/**
 * Build base URL from ip and port
 */
export function buildBaseUrl(ip: string, port: number): string {
    const url = port ? `${ip}:${port}` : ip;
    return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

/**
 * Build full API URL
 */
export function buildApiUrl(path: string): string {
    if (/^https?:/i.test(path)) return path;
    return `${getApiBase()}${path}`;
}

/**
 * Fetch JSON from API
 */
export async function fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(buildApiUrl(url));
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetch binary data from API
 */
export async function fetchBinary(url: string): Promise<ArrayBuffer> {
    const response = await fetch(buildApiUrl(url));
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.arrayBuffer();
}

/**
 * Load camera list from API
 */
export interface CameraItem {
    id: string;
    label?: string;
}

interface CameraListResponse {
    success: boolean;
    reason: string;
    elapse: string;
    data: {
        cameras: CameraItem[];
    };
}

export async function loadCameras(baseUrl?: string): Promise<CameraItem[]> {
    try {
        const url = baseUrl ? `${baseUrl}/api/cameras` : buildApiUrl('/api/cameras');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status}`);
        const res: CameraListResponse = await response.json();
        const cameras = res.data?.cameras;
        return Array.isArray(cameras) ? cameras : [];
    } catch (e) {
        return [];
    }
}

/**
 * Get time range for a camera (from viewer-v3.html loadCameraContext)
 * Returns the actual data range for the camera
 */
export interface TimeRangeResponse {
    start: string;
    end: string;
    chunk_duration_seconds?: number;
    fps?: number;
}

interface TimeRangeEnvelope {
    success: boolean;
    reason: string;
    elapse: string;
    data?: TimeRangeResponse | null;
}

export async function getTimeRange(camera: string): Promise<TimeRangeResponse | null> {
    try {
        const params = new URLSearchParams({ tagname: camera });
        const response = await fetchJSON<TimeRangeEnvelope>(`/api/get_time_range?${params}`);
        const wrapped = response.data;
        if (wrapped && typeof wrapped.start === 'string' && typeof wrapped.end === 'string') return wrapped;
        return null;
    } catch {
        return null;
    }
}

/**
 * Load sensors list from API
 */
export async function loadSensors(camera: string): Promise<{ id: string; label?: string }[]> {
    try {
        const data = await fetchJSON<{ sensors: { id: string; label?: string }[] }>(`/api/sensors?camera=${encodeURIComponent(camera)}`);
        return Array.isArray(data.sensors) ? data.sensors : [];
    } catch {
        return [];
    }
}

/**
 * Get chunk info for a specific time
 */
export interface ChunkInfoResponse {
    camera?: string;
    time: string;
    duration?: number;
    length?: number;
    sign?: string | null;
}

interface ChunkInfoEnvelope {
    success: boolean;
    reason: string;
    elapse: string;
    data?: ChunkInfoResponse | null;
}

export async function getChunkInfo(camera: string, time: string): Promise<ChunkInfoResponse | null> {
    const response = await fetchJSON<ChunkInfoEnvelope>(`/api/get_chunk_info?tagname=${encodeURIComponent(camera)}&time=${encodeURIComponent(time)}`);
    const wrapped = response.data;
    if (wrapped && typeof wrapped.time === 'string') return wrapped;
    return null;
}

/**
 * Get chunk video data
 */
export async function getChunkData(camera: string, time: string): Promise<ArrayBuffer | null> {
    try {
        return await fetchBinary(`/api/v_get_chunk?tagname=${encodeURIComponent(camera)}&time=${encodeURIComponent(time)}`);
    } catch (err: any) {
        if (err.message?.includes('404')) {
            return null;
        }
        throw err;
    }
}

/**
 * Get sensor data for time range
 */
export async function getSensorData(sensors: string[], startTime: string, endTime: string): Promise<any[]> {
    if (!sensors.length) return [];

    const params = new URLSearchParams({
        sensors: sensors.join(','),
        start_time: startTime,
        end_time: endTime,
    });

    try {
        const data = await fetchJSON<{ samples: any[] }>(`/api/sensor_data?${params}`);
        return Array.isArray(data.samples) ? data.samples : [];
    } catch {
        return [];
    }
}

export interface CameraDataGapsResponse {
    camera_id: string;
    start_time: string;
    end_time: string;
    interval: number;
    total_gaps: number;
    missing_times: string[];
}

interface CameraDataGapsEnvelope {
    success?: boolean;
    reason?: string;
    elapse?: string;
    data?: CameraDataGapsResponse | null;
}

/**
 * Get camera data gaps for a time range.
 */
export async function getCameraDataGaps(cameraId: string, startTime: string, endTime: string, intervalSeconds: number): Promise<CameraDataGapsResponse> {
    const params = new URLSearchParams({
        camera_id: cameraId,
        start_time: startTime,
        end_time: endTime,
        interval: String(intervalSeconds),
    });

    try {
        const response = await fetchJSON<CameraDataGapsResponse | CameraDataGapsEnvelope>(`/api/data_gaps?${params}`);

        const wrapped = (response as CameraDataGapsEnvelope)?.data;
        if (wrapped && Array.isArray(wrapped.missing_times)) {
            return wrapped;
        }

        const direct = response as CameraDataGapsResponse;
        if (direct && Array.isArray(direct.missing_times)) {
            return direct;
        }
    } catch {
        // no-op
    }

    return {
        camera_id: cameraId,
        start_time: startTime,
        end_time: endTime,
        interval: intervalSeconds,
        total_gaps: 0,
        missing_times: [],
    };
}

export interface CameraEventItem {
    name: string;
    time: string;
    value: number;
    value_label: 'MATCH' | 'TRIGGER' | 'RESOLVE' | 'ERROR' | string;
    expression_text: string;
    used_counts_snapshot: string;
    camera_id: string;
    rule_id: string;
}

interface CameraEventResponse {
    success?: boolean;
    reason?: string;
    elapse?: string;
    data?: {
        camera_id?: string;
        count?: number;
        total_count?: number;
        total_pages?: number;
        table?: string;
        events?: CameraEventItem[];
    };
}

export async function getCameraEvents(cameraId: string, startNs: bigint, endNs: bigint): Promise<CameraEventItem[]> {
    try {
        const params = new URLSearchParams({
            camera_id: cameraId,
            start_time: startNs.toString(),
            end_time: endNs.toString(),
        });

        const response = await fetchJSON<CameraEventResponse>(`/api/camera_events?${params}`);
        const events = response.data?.events;
        return Array.isArray(events) ? events : [];
    } catch {
        return [];
    }
}

export interface CameraEventsQueryParams {
    camera_id?: string;
    start_time: bigint;
    end_time: bigint;
    event_name?: string;
    event_type?: 'ALL' | 'MATCH' | 'TRIGGER' | 'RESOLVE' | 'ERROR';
    size?: number;
    page?: number;
}

export interface CameraEventsPagedResponse {
    events: CameraEventItem[];
    total_count: number;
    total_pages: number;
}

/**
 * Query camera events with full filtering and pagination support
 */
/**
 * Get new event count since last check
 */
export async function getCameraEventCount(baseUrl?: string): Promise<number> {
    try {
        const url = baseUrl ? `${baseUrl}/api/camera_events/count` : buildApiUrl('/api/camera_events/count');
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${response.status}`);
        const data: { data?: { count?: number } } = await response.json();
        return data?.data?.count ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Query camera events with full filtering and pagination support
 */
export async function queryCameraEvents(params: CameraEventsQueryParams, baseUrl?: string): Promise<CameraEventsPagedResponse> {
    try {
        const searchParams = new URLSearchParams({
            start_time: params.start_time.toString(),
            end_time: params.end_time.toString(),
        });

        if (params.camera_id) searchParams.set('camera_id', params.camera_id);
        if (params.event_name) searchParams.set('event_name', params.event_name);
        if (params.event_type && params.event_type !== 'ALL') searchParams.set('event_type', params.event_type);
        if (params.size != null) searchParams.set('size', String(params.size));
        if (params.page != null) searchParams.set('page', String(params.page));

        const url = baseUrl ? `${baseUrl}/api/camera_events?${searchParams}` : buildApiUrl(`/api/camera_events?${searchParams}`);

        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`${resp.status}`);
        const response: CameraEventResponse = await resp.json();
        const events = response.data?.events;
        return {
            events: Array.isArray(events) ? events : [],
            total_count: response.data?.total_count ?? 0,
            total_pages: response.data?.total_pages ?? 1,
        };
    } catch {
        return { events: [], total_count: 0, total_pages: 1 };
    }
}
