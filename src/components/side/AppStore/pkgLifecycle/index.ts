export { runInstall } from './installFlow';
export { runUpdate } from './updateFlow';
export { runUninstall } from './uninstallFlow';
export { runStart } from './startFlow';
export { runStop } from './stopFlow';
export { getInstalledVersion, isPackageManaged, readManifest } from './manifest';
export { checkPkgHealth } from './steps/pkgHealth';
// issue #1452 — offline (local archive) install path.
export { runScript } from './script';
export { ARCHIVE_STAGING_PREFIX, stepArchiveExtract } from './steps/archiveExtract';
export { ARCHIVE_PROBE_ATTEMPTS, ARCHIVE_PROBE_DELAY_MS } from './fsProbe';
export type { LifecycleContext, PkgManifest, StepResult } from './types';
