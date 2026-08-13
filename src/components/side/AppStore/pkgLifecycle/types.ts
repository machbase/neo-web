// Public types shared across the PKG lifecycle pipeline — plus the two string
// constants that are part of the `StepResult` contract rather than of any one
// module (see below).

export type StepResult = { ok: true; log: string } | { ok: false; log: string; reason: string };

/**
 * The row prefix a server-side script uses to say "I failed, and here is why"
 * (issue #1452).
 *
 * WHY IT EXISTS: TQL answers `success: true` even for a script that threw, and
 * only the rows yielded BEFORE the throw come back — so a reason has to leave as
 * a ROW or not at all. `runScript` (script.ts) turns a row starting with this
 * prefix into `{ ok: false, reason }`; `failScript` (archiveScript.ts) is the one
 * writer. The full measurement is in the doc comment of `runScript`.
 *
 * WHY IT LIVES HERE, next to `StepResult`, and not in script.ts: the producer
 * (the script source) and the consumer (`runScript`) must agree on one spelling,
 * and this is the module both can import without either depending on the other.
 *
 * DELIBERATELY UNMISTAKABLE. A plain prefix (`ERROR:`, `failed:`) would collide
 * with a package's own log output, and the collision fails CLOSED — a healthy
 * install reported as a failure.
 */
export const SCRIPT_ERROR_SENTINEL = '__PKG_SCRIPT_ERROR__';

/**
 * What an empty row set means. With `success` useless as a signal (see above),
 * "the script printed literally nothing" is the only evidence left that it died
 * before reaching its first `$.yield`.
 */
export const SCRIPT_NO_OUTPUT_REASON = 'script produced no output (it likely threw before yielding)';

export interface PkgManifest {
    name?: string;
    version?: string;
    /**
     * issue #1452 — OPTIONAL. Both installed packages measured on a real server
     * (neo-pkg-opcua-client 1.0.8, neo-pkg-replication 1.0.6) ship without it, so
     * every consumer must default it rather than require it.
     */
    description?: string;
    /**
     * issue #1452 — the server floor, spelled `minServerVersion` HERE (package.json)
     * and `minServer` on the hub/card side (`PkgVersionInfo`). The rename happens
     * where the two meet: the archive scan in `api/repository/onpremCatalog.ts`.
     * Absent means "no constraint" — see `isEligible`.
     */
    minServerVersion?: string;
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
    // THE VERSION, for both sources. Hub `version` (mapped to
    // APP_INFO.latest_version) or the version the user picked in the menu.
    // Appended as `@<tag>` to `pkg copy github.com/<full_name>` on the hub path,
    // and matched against every archive's root package.json on the local path
    // (`steps/archiveExtract.ts`). Empty when the row carries no `version`.
    tag?: string;
    /**
     * issue #1452 — where the bytes for `tag` come from.
     *   'hub' / undefined → `pkg copy github.com/<fullName>@<tag>` (historical path)
     *   'local'           → find and extract the archive holding `<appName>@<tag>`
     * Filled in by the version picker, which is the only caller that knows which
     * catalog row was clicked. Absent for every other entry point, which keeps
     * those on the GitHub path exactly as before.
     *
     * THE ONLY ROUTING INPUT the browser supplies, and it has to be: it is a UI
     * choice, not a fact about the server. There is deliberately no archive path
     * next to it — the server re-finds the zip from `appName` + `tag`.
     */
    source?: 'hub' | 'local';
    manifest?: PkgManifest;
    logs: string[];
    onProgress?: (label: string) => void;
}
