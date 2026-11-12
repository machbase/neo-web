export type HostErrorCode = 'INVALID_INPUT' | 'UNSUPPORTED' | 'TARGET_NOT_FOUND' | 'PREVIEW_FORBIDDEN' | 'DISPOSED' | 'ADAPTER_ERROR';
export type HostResult<T = void> = { ok: true; value: T } | { ok: false; error: { code: HostErrorCode; message: string; settingErrors?: Record<string, string> } };
export interface HostHandle { readonly id: string; dispose(): HostResult<void>; }

export interface HostFileSelection { extensions?: string[]; startPath?: string; }
export interface HostOpenRequest { path: string; kind: 'dashboard' | 'file'; target?: 'tab' | 'window'; }
export interface HostNotification { message: string; level?: 'info' | 'success' | 'error'; }

export interface HostAdapters {
    selectFile?(request: HostFileSelection, signal?: AbortSignal): Promise<string | null>;
    open?(request: HostOpenRequest, signal?: AbortSignal): void | Promise<void>;
    notify?(request: HostNotification): void;
    confirm?(message: string): Promise<boolean>;
    enterFullscreen?(): void | Promise<void>;
    exitFullscreen?(): void | Promise<void>;
}

/** Feature areas provide their own surface names, lifetime and UI adapters. */
export interface ApplicationHostEnvironment {
    surface: string;
    adapters?: HostAdapters;
}
export interface ApplicationHostContext extends ApplicationHostEnvironment {
    checkActive(): HostResult<void>;
    signal: AbortSignal;
}
