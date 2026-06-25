import type { PersistedPanelInfoV201 } from './TazPersistenceTypesV201';

export type PersistedPanelInfoV202 = PersistedPanelInfoV201 & {
    display: PersistedPanelInfoV201['display'] & {
        connectNulls: boolean;
    };
};
