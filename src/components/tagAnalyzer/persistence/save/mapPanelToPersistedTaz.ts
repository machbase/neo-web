import type { PanelInfo } from '../../domain/PanelDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeUnitUtils';
import type { PersistedPanelInfoV204 } from '../TazPersistenceTypesV204';

export function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV204 {
    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            interval_type:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
    };
}
