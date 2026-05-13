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
    packageService?: {
        managed: boolean;
        reason?: string;
    };
}

export interface LifecycleContext {
    appName: string;
    fullName: string;
    // Hub `version` (mapped to APP_INFO.latest_version). Appended as `@<tag>`
    // to `pkg copy github.com/<full_name>` so install / update fetches the
    // released tag rather than HEAD. Empty when the hub row has no `version`.
    tag?: string;
    manifest?: PkgManifest;
    logs: string[];
    onProgress?: (label: string) => void;
}
