import type { PersistedTazBoardInfoV202 } from './TazPersistenceTypesV202';
import type { PersistedPanelAnnotationInput } from './TazPersistenceTypesV200';

export type PersistedPanelInfoV203 = PersistedTazBoardInfoV202['panels'][number] & {
    annotations?: PersistedPanelAnnotationInput[] | undefined;
};

export type PersistedTazBoardInfoV203 = Omit<
    PersistedTazBoardInfoV202,
    'version' | 'panels'
> & {
    version: '2.0.3';
    panels: PersistedPanelInfoV203[];
};
