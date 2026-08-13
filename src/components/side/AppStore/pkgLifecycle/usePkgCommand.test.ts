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

import { shouldBlockUninstall, buildBlockedMessage, shouldBlockHubCommand, buildHubBlockedMessage } from './usePkgCommand';
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

// ---------------------------------------------------------------------------
// issue #1452 — the command-path gate for hub-sourced install/update
// ---------------------------------------------------------------------------
// The card already hides these affordances offline / local-only. That gating is
// computed at RENDER time though, so a panel that has been open while the policy
// file was written (or the network dropped) can still deliver a stale click. This
// predicate is the last checkpoint before the request goes out.
describe('shouldBlockHubCommand', () => {
    test.each([
        ['install', 'localOnly'],
        ['install', 'offline'],
        ['update', 'localOnly'],
        ['update', 'offline'],
    ] as const)('%s from the hub is refused in %s mode', (command, mode) => {
        expect(shouldBlockHubCommand(mode, command, 'hub')).toBe(true);
    });

    test('online lets hub install/update through', () => {
        expect(shouldBlockHubCommand('online', 'install', 'hub')).toBe(false);
        expect(shouldBlockHubCommand('online', 'update', 'hub')).toBe(false);
    });

    // A local archive is a file on this machine — no mode can make that a network
    // request, and blocking it would strand the one install path that still works.
    test('a local-sourced command is never blocked, in any mode', () => {
        expect(shouldBlockHubCommand('localOnly', 'install', 'local')).toBe(false);
        expect(shouldBlockHubCommand('offline', 'update', 'local')).toBe(false);
    });

    // `undefined` is the historical shape of every caller that does not pick a row
    // (start/stop, and the experiment-mode custom-tag input). Widening the check to
    // "anything not local" would break the custom-tag path for no offline gain.
    test('an unsourced command keeps its pre-#1452 behaviour', () => {
        expect(shouldBlockHubCommand('localOnly', 'install', undefined)).toBe(false);
        expect(shouldBlockHubCommand('offline', 'update', undefined)).toBe(false);
    });

    // Lifecycle commands touch only what is already on disk.
    test.each(['start', 'stop', 'uninstall'] as const)('%s is never blocked, even tagged hub', (command) => {
        expect(shouldBlockHubCommand('localOnly', command, 'hub')).toBe(false);
    });
});

describe('buildHubBlockedMessage', () => {
    // The two refusals have the same effect and completely different causes, so
    // they must not share wording — an operator who reads "unreachable" for a
    // deliberate policy goes and debugs a healthy network.
    test('local-only names the policy and its file', () => {
        const msg = buildHubBlockedMessage('demo-app', 'localOnly');

        expect(msg).toContain('demo-app');
        expect(msg).toContain('local-only');
        expect(msg).toContain('/public/.pkg-conf.json');
        expect(msg).not.toMatch(/unreachable/i);
    });

    test('offline says the hub is unreachable and says nothing about policy', () => {
        const msg = buildHubBlockedMessage('demo-app', 'offline');

        expect(msg).toContain('demo-app');
        expect(msg).toMatch(/unreachable/i);
        expect(msg).not.toContain('.pkg-conf.json');
    });
});
