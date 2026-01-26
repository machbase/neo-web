// Video API Utilities

// 임시 API 서버 주소 설정
const DEFAULT_API_BASE = 'http://192.168.0.87:8088';

/**
 * Get API base URL
 */
export function getApiBase(): string {
    const stored = window.localStorage?.getItem('machbaseApiBase');
    if (stored) return stored.replace(/\/$/, '');
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
export async function loadCameras(): Promise<{ id: string; label?: string }[]> {
    try {
        const data = await fetchJSON<{ cameras: { id: string; label?: string }[] }>('/api/cameras');
        return Array.isArray(data.cameras) ? data.cameras : [];
    } catch {
        return [{ id: 'camera-0', label: 'camera-0' }];
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

export async function getTimeRange(camera: string): Promise<TimeRangeResponse | null> {
    try {
        const params = new URLSearchParams({ tagname: camera });
        return await fetchJSON<TimeRangeResponse>(`/api/get_time_range?${params}`);
    } catch {
        return null;
    }
}

/**
 * Load sensors list from API
 */
export async function loadSensors(camera: string): Promise<{ id: string; label?: string }[]> {
    try {
        const data = await fetchJSON<{ sensors: { id: string; label?: string }[] }>(
            `/api/sensors?camera=${encodeURIComponent(camera)}`
        );
        return Array.isArray(data.sensors) ? data.sensors : [];
    } catch {
        return [];
    }
}

/**
 * Get chunk info for a specific time
 */
export async function getChunkInfo(camera: string, time: string): Promise<any> {
    return fetchJSON(`/api/get_chunk_info?tagname=${encodeURIComponent(camera)}&time=${encodeURIComponent(time)}`);
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
export async function getSensorData(
    sensors: string[],
    startTime: string,
    endTime: string
): Promise<any[]> {
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
export async function getCameraRollup(
    camera: string,
    startNs: bigint,
    endNs: bigint,
    minutes: number
): Promise<{ rows: any[]; minutes: number }> {
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
