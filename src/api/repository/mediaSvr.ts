import { buildApiUrl, KEY_LOCAL_STORAGE_API_BASE } from '@/components/dashboard/panels/video/utils/api';
import { getFileList, postFileList } from '@/api/repository/api';

const MSVR_CONFIG_FILE = '.msvr.txt';

function resolveUrl(path: string, baseUrl?: string): string {
    return baseUrl ? `${baseUrl}${path}` : buildApiUrl(path);
}

////////////////////////////////////////////////////
//                  Media Server Config           //
////////////////////////////////////////////////////

export interface MediaServerConfigItem {
    ip: string;
    port: number;
    alias: string;
}

/**
 * Load media server config list from .msvr.txt file (JSON array format)
 */
export async function getMediaServerConfig(): Promise<MediaServerConfigItem[]> {
    try {
        const res: any = await getFileList('', '/', MSVR_CONFIG_FILE);
        // axios may auto-parse JSON, so res can be an array or a string
        if (Array.isArray(res)) return res;
        if (res && typeof res === 'string') {
            const content = res.trim();
            if (!content) return [];
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Save media server config list to .msvr.txt file (JSON array format)
 */
export async function saveMediaServerConfig(configs: MediaServerConfigItem[]): Promise<boolean> {
    try {
        const content = JSON.stringify(configs);
        const res: any = await postFileList(content, '/', MSVR_CONFIG_FILE);
        if (res?.success !== false) {
            // Sync config list to localStorage
            localStorage.setItem(KEY_LOCAL_STORAGE_API_BASE, JSON.stringify(configs));
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

////////////////////////////////////////////////////
//                      Types                     //
////////////////////////////////////////////////////

export interface TablesResponse {
    tables: string[];
}

export interface TableCreateRequest {
    table_name: string;
}

export interface TableCreateResponse {
    table_name: string;
    created: boolean;
}

export interface HeartbeatResponse {
    healthy: boolean;
}

export interface CameraEventRule {
    id: string;
    name: string;
    expression: string;
    recordMode: string;
    lastModified: string;
    enabled: boolean;
}

export interface CameraInfo extends MediaServerConfigItem {
    table: string;
    camera_id: string;
    name?: string;
    label?: string;
    desc?: string;
    rtsp_url?: string;
    webrtc_url?: string;
    media_url?: string;
    model_id?: number;
    detect_objects?: string[];
    save_objects?: boolean;
    ffmpeg_options?: FFmpegOption[];
    ffmpeg_command?: string;
    output_dir?: string;
    archive_dir?: string;
    enabled?: boolean;
    event_rule?: CameraEventRule[];
}

export interface FFmpegOption {
    k: string;
    v?: string | number;
}

export interface CameraCreateRequest {
    table: string;
    name: string;
    desc?: string;
    rtsp_url?: string;
    webrtc_url?: string;
    media_url?: string;
    model_id?: number;
    detect_objects?: string[];
    save_objects?: boolean;
    ffmpeg_options?: FFmpegOption[];
    ffmpeg_command?: string;
    output_dir?: string;
    archive_dir?: string;
    server_url?: string;
}

export interface CameraUpdateRequest {
    desc?: string;
    rtsp_url?: string;
    webrtc_url?: string;
    model_id?: number;
    detect_objects?: string[];
    save_objects?: boolean;
    ffmpeg_options?: FFmpegOption[];
    ffmpeg_command?: string;
    output_dir?: string;
    archive_dir?: string;
}

export type CameraStatusType = 'stopped' | 'running';

export interface CameraStatusResponse {
    name: string;
    status: CameraStatusType;
}

export interface CameraHealthResponse {
    cameras: CameraStatusResponse[];
    running: number;
    stopped: number;
    total: number;
}

export interface EventRuleItem {
    rule_id: string;
    name: string;
    expression_text: string;
    record_mode: 'ALL_MATCHES' | 'EDGE_ONLY';
    enabled: boolean;
}

export interface EventRulesResponse {
    camera_id: string;
    event_rules: EventRuleItem[];
}

export interface EventRuleCreateRequest {
    camera_id: string;
    rule: {
        rule_id: string;
        name?: string;
        expression_text: string;
        record_mode: 'ALL_MATCHES' | 'EDGE_ONLY';
        enabled?: boolean;
    };
}

export interface EventRuleUpdateRequest {
    name?: string;
    expression_text?: string;
    record_mode?: 'ALL_MATCHES' | 'EDGE_ONLY';
    enabled?: boolean;
}

export interface ModelInfo {
    id: number;
    name?: string;
    // Add additional fields as needed
}

export interface ModelsResponse {
    models: ModelInfo[];
}

export interface DetectsResponse {
    detect_objects: string[];
}

export interface CameraDetectObjectsResponse {
    camera_id: string;
    detect_objects?: string[] | null;
}

export interface CameraDetectObjectsUpdateRequest {
    detect_objects: string[];
}

export interface ApiResponse<T = void> {
    success: boolean;
    reason?: string;
    elapse: string;
    data?: T;
}

////////////////////////////////////////////////////
//                      Tables                    //
////////////////////////////////////////////////////

/**
 * Get table list
 * GET /api/tables
 */
export async function getTables(baseUrl?: string): Promise<ApiResponse<TablesResponse>> {
    const response = await fetch(resolveUrl('/api/tables', baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Create table
 * POST /api/table
 */
export async function createTable(data: TableCreateRequest, baseUrl?: string): Promise<ApiResponse<TableCreateResponse>> {
    const response = await fetch(resolveUrl('/api/table', baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

////////////////////////////////////////////////////
//                      Media                     //
////////////////////////////////////////////////////

/**
 * Check media server heartbeat
 * GET /api/media/heartbeat
 */
export async function getMediaHeartbeat(): Promise<ApiResponse<HeartbeatResponse>> {
    const response = await fetch(buildApiUrl('/api/media/heartbeat'), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

////////////////////////////////////////////////////
//                      Models                    //
////////////////////////////////////////////////////

/**
 * Get model list
 * GET /api/models
 */
export async function getModels(): Promise<ApiResponse<ModelsResponse>> {
    const response = await fetch(buildApiUrl('/api/models'), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get detect objects list
 * GET /api/detects
 */
export async function getDetects(baseUrl?: string): Promise<ApiResponse<DetectsResponse>> {
    const response = await fetch(resolveUrl('/api/detect_objects', baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

////////////////////////////////////////////////////
//                      Camera                    //
////////////////////////////////////////////////////

/**
 * Get camera list by table
 * GET /api/cameras?table={table}
 */
export async function getCameraListByTable(table: string): Promise<ApiResponse<CameraInfo[]>> {
    const response = await fetch(buildApiUrl(`/api/cameras?table=${encodeURIComponent(table)}`), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Create camera
 * POST /api/camera
 */
export async function createCamera(data: CameraCreateRequest, baseUrl?: string): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(resolveUrl('/api/camera', baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get camera detail
 * GET /api/camera/{id}
 */
export async function getCamera(id: string, baseUrl?: string): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}`, baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Update camera settings
 * POST /api/camera/{id}
 */
export async function updateCamera(id: string, data: CameraUpdateRequest, baseUrl?: string): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}`, baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Delete camera
 * DELETE /api/camera/{id}
 */
export async function deleteCamera(id: string, baseUrl?: string): Promise<ApiResponse> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}`, baseUrl), {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Enable camera
 * POST /api/camera/{id}/enable
 */
export async function enableCamera(id: string, baseUrl?: string): Promise<ApiResponse> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}/enable`, baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Disable camera
 * POST /api/camera/{id}/disable
 */
export async function disableCamera(id: string, baseUrl?: string): Promise<ApiResponse> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}/disable`, baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get camera status
 * GET /api/camera/{id}/status
 */
export async function getCameraStatus(id: string, baseUrl?: string): Promise<ApiResponse<CameraStatusResponse>> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(id)}/status`, baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get all cameras health summary
 * GET /api/cameras/health
 */
export async function getCamerasHealth(baseUrl?: string): Promise<ApiResponse<CameraHealthResponse>> {
    const response = await fetch(resolveUrl('/api/cameras/health', baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Get detect objects list for specific camera
 * GET /api/camera/:camera_id/detect_object
 */
export async function getCameraDetectObjects(cameraId: string, baseUrl?: string): Promise<ApiResponse<CameraDetectObjectsResponse>> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(cameraId)}/detect_objects`, baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Update detect objects list for specific camera
 * POST /api/camera/:camera_id/detect_object
 */
export async function updateCameraDetectObjects(cameraId: string, data: CameraDetectObjectsUpdateRequest, baseUrl?: string): Promise<ApiResponse<CameraDetectObjectsResponse>> {
    const response = await fetch(resolveUrl(`/api/camera/${encodeURIComponent(cameraId)}/detect_objects`, baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

////////////////////////////////////////////////////
//                      EVENT                     //
////////////////////////////////////////////////////

/**
 * Get event rules for camera
 * GET /api/event_rule/:camera_id
 */
export async function getEventRules(cameraId: string, baseUrl?: string): Promise<ApiResponse<EventRulesResponse>> {
    const response = await fetch(resolveUrl(`/api/event_rule/${encodeURIComponent(cameraId)}`, baseUrl), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Create event rule
 * POST /api/event_rule
 */
export async function createEventRule(data: EventRuleCreateRequest, baseUrl?: string): Promise<ApiResponse<EventRuleItem>> {
    const response = await fetch(resolveUrl('/api/event_rule', baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Update event rule
 * POST /api/event_rule/:camera_id/:rule_id
 */
export async function updateEventRule(cameraId: string, ruleId: string, data: EventRuleUpdateRequest, baseUrl?: string): Promise<ApiResponse<EventRuleItem>> {
    const response = await fetch(resolveUrl(`/api/event_rule/${encodeURIComponent(cameraId)}/${encodeURIComponent(ruleId)}`, baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Delete event rule
 * POST /api/event_rule/:camera_id/:rule_id
 */
export async function deleteEventRule(cameraId: string, ruleId: string, baseUrl?: string): Promise<ApiResponse> {
    const response = await fetch(resolveUrl(`/api/event_rule/${encodeURIComponent(cameraId)}/${encodeURIComponent(ruleId)}`, baseUrl), {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}

////////////////////////////////////////////////////
//                      Ping                      //
////////////////////////////////////////////////////

export interface PingResponse {
    ip: string;
    alive: boolean;
    latency: string;
    output: string;
}

/**
 * Ping camera IP
 * POST /cameras/ping
 */
export async function pingCamera(ip: string, baseUrl?: string): Promise<ApiResponse<PingResponse>> {
    const response = await fetch(resolveUrl('/cameras/ping', baseUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
    });
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.json();
}
