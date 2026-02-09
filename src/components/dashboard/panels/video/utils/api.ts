// Video API Utilities

// 임시 API 서버 주소 설정
const DEFAULT_API_BASE = 'http://192.168.0.87:8088';
export const KEY_LOCAL_STORAGE_API_BASE = 'machbaseApiBase';

/**
 * Get API base URL
 */
export function getApiBase(): string {
    const stored = window.localStorage?.getItem(KEY_LOCAL_STORAGE_API_BASE);
    if (stored) {
        const cleaned = stored.replace(/\/$/, '');
        return /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
    }
    return DEFAULT_API_BASE;
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

export async function loadCameras(): Promise<CameraItem[]> {
    try {
        const res = await fetchJSON<CameraListResponse>('/api/cameras');
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
    const response = await fetchJSON<ChunkInfoEnvelope>(
        `/api/get_chunk_info?tagname=${encodeURIComponent(camera)}&time=${encodeURIComponent(time)}`
    );
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

/**
 * Get camera rollup info for event timeline
 */
export async function getCameraRollup(camera: string, startNs: bigint, endNs: bigint, minutes: number): Promise<{ rows: any[]; minutes: number }> {
    const params = new URLSearchParams({
        tagname: camera,
        start_time: startNs.toString(),
        end_time: endNs.toString(),
        minutes: String(minutes),
    });

    try {
        return await fetchJSON(`/api/get_camera_rollup_info?${params}`);
    } catch {
        return { rows: [], minutes };
    }
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
