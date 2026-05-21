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
    version: '2.0.2';
    panels: PersistedPanelInfoV202[];
};
