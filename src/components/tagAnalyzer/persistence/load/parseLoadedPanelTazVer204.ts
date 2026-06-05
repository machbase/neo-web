import type { PanelInfo } from '../../domain/PanelDomain';
import { normalizeStoredTimeUnit } from '../../domain/time/TimeIntervalUtils';
import {
    clonePanelAnnotations,
    clonePanelHighlights,
} from '../PersistenceCloneUtils';
import type { PersistedPanelInfoV204 } from '../TazPersistenceTypesV204';
import { normalizePersistedTimeRangeConfig } from './normalizePersistedTimeRangeConfig';

export function isPersistedPanelInfoV204(
    panelInfo: unknown,
): panelInfo is PersistedPanelInfoV204 {
    if (!panelInfo || typeof panelInfo !== 'object') {
        return false;
    }

    const sPanelInfo = panelInfo as Partial<PanelInfo>;
    const sGeneral = sPanelInfo.general;
    const sData = sPanelInfo.data;
    const sTime = sPanelInfo.time;

    return (
        !!sGeneral &&
        typeof sGeneral === 'object' &&
        typeof sGeneral.chart_title === 'string' &&
        typeof sGeneral.use_zoom === 'boolean' &&
        typeof sGeneral.use_last_viewed_range === 'boolean' &&
        typeof sGeneral.is_raw === 'boolean' &&
        (sGeneral.is_order_by === undefined ||
            typeof sGeneral.is_order_by === 'boolean') &&
        typeof sGeneral.use_normalize === 'boolean' &&
        !!sData &&
        typeof sData === 'object' &&
        typeof sData.index_key === 'string' &&
        Array.isArray(sData.tag_set) &&
        !!sTime &&
        typeof sTime === 'object' &&
        !!sTime.range_config &&
        !!sPanelInfo.axes &&
        typeof sPanelInfo.axes === 'object' &&
        !!sPanelInfo.display &&
        typeof sPanelInfo.display === 'object'
    );
}

export function parseLoadedPanelTazVer204(
    panelInfo: PersistedPanelInfoV204,
): PanelInfo {
    const sRangeConfig = normalizePersistedTimeRangeConfig(
        panelInfo.time.range_config,
    );
    if (!sRangeConfig) {
        throw new Error('Unsupported TagAnalyzer .taz panel time range_config shape.');
    }

    return {
        ...panelInfo,
        general: {
            ...panelInfo.general,
            is_order_by: panelInfo.general.is_order_by ?? false,
        },
        data: {
            ...panelInfo.data,
            interval_type:
                normalizeStoredTimeUnit(panelInfo.data.interval_type ?? '') ??
                panelInfo.data.interval_type,
        },
        time: {
            range_config: sRangeConfig,
        },
        highlights: clonePanelHighlights(panelInfo.highlights),
        annotations: clonePanelAnnotations(panelInfo.annotations),
    };
}
