import type { TazVersion } from './TazVersion';
import type { PersistedTazBoardInfoV201 } from './TazPersistenceTypesV201';

export type PersistedPanelInfoV202 = PersistedTazBoardInfoV201['panels'][number] & {
    display: PersistedTazBoardInfoV201['panels'][number]['display'] & {
        connectNulls: boolean;
    };
};

export type PersistedTazBoardInfoV202 = Omit<
    PersistedTazBoardInfoV201,
    'version' | 'panels'
> & {
    version: TazVersion.V202;
    panels: PersistedPanelInfoV202[];
};
