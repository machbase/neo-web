// Public types shared across the PKG lifecycle pipeline.

export type StepResult = { ok: true; log: string } | { ok: false; log: string; reason: string };

export interface PkgManifest {
    name?: string;
    version?: string;
    scripts?: {
        install?: unknown;
        uninstall?: unknown;
        start?: unknown;
        stop?: unknown;
    };
}

export interface LifecycleContext {
    appName: string;
    fullName: string;
    manifest?: PkgManifest;
    logs: string[];
    onProgress?: (label: string) => void;
}
