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

export type PkgHealthStatus = {
    reachable: boolean;
    running: boolean;
    status?: string;
};

const UNREACHABLE: PkgHealthStatus = { reachable: false, running: false };

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
        };
    } catch {
        return UNREACHABLE;
    }
}
