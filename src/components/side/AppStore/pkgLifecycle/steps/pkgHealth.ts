// Probes /public/{name}/cgi-bin/health to learn whether the package supports
// start/stop AND whether the service is currently running. Served by neo-server
// outside the /web axios baseURL, so we use plain fetch (mirrors
// getMediaServerConfig in src/api/repository/mediaSvr.ts).
//
// Response shapes:
//   running:        HTTP 200 { ok: true,  data: { healthy: true,  status: "running", ... } }
//   not installed:  HTTP 200 { ok: true,  data: { healthy: false, status: "not_installed", ... } }
//   controller bad: HTTP 503 { ok: false, reason: "..." }
//
// reachable = ok === true (controller responded). When unreachable we hide
// start/stop entirely; when reachable, `running` decides which of the two to
// show as a toggle.
//
// New PKG controllers may attach `data.service_summary` describing aggregated
// child-service state for replication / opcua-client style packages. Legacy
// controllers omit the field. Parse defensively — only construct serviceSummary
// when both `total` and `running` are numbers; `errors` is normalised to a
// string[] (empty when absent or non-array). Note: `serviceSummary.running`
// is a count, while top-level `running` is a boolean derived from `healthy`.

export type PkgServiceSummary = {
    scope: string;
    total: number;
    running: number;
    errors: string[];
};

export type PkgHealthStatus = {
    reachable: boolean;
    running: boolean;
    status?: string;
    serviceSummary?: PkgServiceSummary;
};

const UNREACHABLE: PkgHealthStatus = { reachable: false, running: false };

function parseServiceSummary(raw: unknown): PkgServiceSummary | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const obj = raw as Record<string, unknown>;
    const { scope, total, running, errors } = obj;
    if (typeof total !== 'number' || typeof running !== 'number') return undefined;
    const normalizedErrors: string[] = Array.isArray(errors)
        ? (errors.filter((s) => typeof s === 'string') as string[])
        : [];
    return {
        scope: typeof scope === 'string' ? scope : '',
        total,
        running,
        errors: normalizedErrors,
    };
}

export async function checkPkgHealth(appName: string): Promise<PkgHealthStatus> {
    try {
        const res = await fetch(`/public/${appName}/cgi-bin/api/health`, { method: 'GET' });
        // 503 from a live controller still returns JSON; HTTP-level errors
        // (network, 404 because cgi-bin doesn't exist, etc.) drop into catch.
        const body: any = await res.json().catch(() => null);
        if (!body || typeof body !== 'object') return UNREACHABLE;
        if (body.ok !== true) return UNREACHABLE;
        const data = body.data ?? {};
        return {
            reachable: true,
            running: data.healthy === true,
            status: typeof data.status === 'string' ? data.status : undefined,
            serviceSummary: parseServiceSummary(data.service_summary),
        };
    } catch {
        return UNREACHABLE;
    }
}
