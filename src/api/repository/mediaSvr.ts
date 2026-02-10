import { buildApiUrl } from '@/components/dashboard/panels/video/utils/api';

////////////////////////////////////////////////////
//                      Types                     //
////////////////////////////////////////////////////

export interface TablesResponse {
    tables: string[];
}

export interface CameraEventRule {
    id: string;
    name: string;
    expression: string;
    recordMode: string;
    lastModified: string;
    enabled: boolean;
}

export interface CameraInfo {
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
    detect_objects: string[];
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
export async function getTables(): Promise<ApiResponse<TablesResponse>> {
    const response = await fetch(buildApiUrl('/api/tables'), {
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
export async function getDetects(): Promise<ApiResponse<DetectsResponse>> {
    const response = await fetch(buildApiUrl('/api/detect_objects'), {
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
export async function createCamera(data: CameraCreateRequest): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(buildApiUrl('/api/camera'), {
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
export async function getCamera(id: string): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}`), {
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
export async function updateCamera(id: string, data: CameraUpdateRequest): Promise<ApiResponse<CameraInfo>> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}`), {
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
export async function deleteCamera(id: string): Promise<ApiResponse> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}`), {
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
export async function enableCamera(id: string): Promise<ApiResponse> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}/enable`), {
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
export async function disableCamera(id: string): Promise<ApiResponse> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}/disable`), {
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
export async function getCameraStatus(id: string): Promise<ApiResponse<CameraStatusResponse>> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(id)}/status`), {
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
export async function getCamerasHealth(): Promise<ApiResponse<CameraHealthResponse>> {
    const response = await fetch(buildApiUrl('/api/cameras/health'), {
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
export async function getCameraDetectObjects(cameraId: string): Promise<ApiResponse<CameraDetectObjectsResponse>> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(cameraId)}/detect_objects`), {
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
export async function updateCameraDetectObjects(cameraId: string, data: CameraDetectObjectsUpdateRequest): Promise<ApiResponse<CameraDetectObjectsResponse>> {
    const response = await fetch(buildApiUrl(`/api/camera/${encodeURIComponent(cameraId)}/detect_objects`), {
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
export async function getEventRules(cameraId: string): Promise<ApiResponse<EventRulesResponse>> {
    const response = await fetch(buildApiUrl(`/api/event_rule/${encodeURIComponent(cameraId)}`), {
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
export async function createEventRule(data: EventRuleCreateRequest): Promise<ApiResponse<EventRuleItem>> {
    const response = await fetch(buildApiUrl('/api/event_rule'), {
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
export async function updateEventRule(cameraId: string, ruleId: string, data: EventRuleUpdateRequest): Promise<ApiResponse<EventRuleItem>> {
    const response = await fetch(buildApiUrl(`/api/event_rule/${encodeURIComponent(cameraId)}/${encodeURIComponent(ruleId)}`), {
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
export async function deleteEventRule(cameraId: string, ruleId: string): Promise<ApiResponse> {
    const response = await fetch(buildApiUrl(`/api/event_rule/${encodeURIComponent(cameraId)}/${encodeURIComponent(ruleId)}`), {
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
