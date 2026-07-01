import type { PersistedPanelInfoV202 } from './TazPersistenceTypesV202';
import type { PersistedPanelAnnotationInput } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV203 = PersistedPanelInfoV202 & {
    annotations?: PersistedPanelAnnotationInput[] | undefined;
};
