import type { PanelInfo } from '../../domain/PanelDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/interval/TimeIntervalUtils';
import { clonePanelRangeConfig } from '../../domain/time/range/PanelRangeConfigUtils';
import type { PersistedPanelInfoV205 } from '../TazPersistenceTypesV205';

export function mapPanelToPersistedTaz(
    panelInfo: PanelInfo,
): PersistedPanelInfoV205 {
    return {
        ...panelInfo,
        data: {
            ...panelInfo.data,
            interval_type:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
        time: {
            range_config: clonePanelRangeConfig(panelInfo.time.range_config),
        },
    };
}
