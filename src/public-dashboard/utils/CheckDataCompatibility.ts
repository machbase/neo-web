// The public board reads a .dsh exactly as the editor does: same repair (validator, axis/block patches,
// backfills) and the same per-panel load error. A private copy here fell behind the editor's fixes (#1558).
export { CheckDataCompatibility, getPanelLoadError, RefreshUnitSnapshots, VARIABLE_REGEX, VARIABLE_RM_REGEX } from '@/utils/CheckDataCompatibility';
