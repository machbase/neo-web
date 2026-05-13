// Tests for the uninstall pre-flight guard. The hook itself (useRecoilCallback)
// is hard to unit-test in isolation, so the guard predicate is exported as a
// pure function (`shouldBlockUninstall`) and exercised here. We also assert the
// guard message shape (`buildBlockedMessage`) so the Toast copy stays stable.
//
// Predicate contract:
//   - serviceSummary present → only `running > 0` blocks (errors-only does NOT)
//   - serviceSummary absent (legacy) → block when boolean `running` is true OR
//     `status === 'running'`
//   - reachable=false → never block (don't punish unreachable controllers)

import { shouldBlockUninstall, buildBlockedMessage } from './usePkgCommand';
import type { PkgHealthStatus } from './steps/pkgHealth';

describe('shouldBlockUninstall', () => {
    test('serviceSummary.running > 0 → blocks', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: true,
            status: 'running',
            serviceSummary: { scope: 'replication', total: 3, running: 2, errors: [] },
        };
        expect(shouldBlockUninstall(fresh)).toBe(true);
    });

    test('serviceSummary.running === 0 → does NOT block', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: false,
            status: 'stopped',
            serviceSummary: { scope: 'replication', total: 3, running: 0, errors: [] },
        };
        expect(shouldBlockUninstall(fresh)).toBe(false);
    });

    test('legacy: no serviceSummary + status=running → blocks', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: true,
            status: 'running',
        };
        expect(shouldBlockUninstall(fresh)).toBe(true);
    });

    test('legacy: no serviceSummary + running=true → blocks (even without status)', () => {
        const fresh: PkgHealthStatus = { reachable: true, running: true };
        expect(shouldBlockUninstall(fresh)).toBe(true);
    });

    test('legacy: no serviceSummary + running=false + status=stopped → does NOT block', () => {
        const fresh: PkgHealthStatus = { reachable: true, running: false, status: 'stopped' };
        expect(shouldBlockUninstall(fresh)).toBe(false);
    });

    test('reachable=false → does NOT block (unreachable controller is not a running service)', () => {
        const fresh: PkgHealthStatus = { reachable: false, running: false };
        expect(shouldBlockUninstall(fresh)).toBe(false);
    });

    test('errors-only (running=0 with errors[]) → does NOT block — errors !== running', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: false,
            status: 'stopped',
            serviceSummary: { scope: 'replication', total: 3, running: 0, errors: ['fetch failed'] },
        };
        expect(shouldBlockUninstall(fresh)).toBe(false);
    });
});

describe('buildBlockedMessage', () => {
    test('uses serviceSummary.running count when available', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: true,
            status: 'running',
            serviceSummary: { scope: 'replication', total: 3, running: 2, errors: [] },
        };
        const msg = buildBlockedMessage('demo-app', fresh);
        expect(msg).toContain('demo-app');
        expect(msg).toContain('2 service');
    });

    test('falls back to "1 service" when serviceSummary is absent (legacy single-service)', () => {
        const fresh: PkgHealthStatus = {
            reachable: true,
            running: true,
            status: 'running',
        };
        const msg = buildBlockedMessage('demo-app', fresh);
        expect(msg).toContain('demo-app');
        expect(msg).toContain('1 service');
    });
});
