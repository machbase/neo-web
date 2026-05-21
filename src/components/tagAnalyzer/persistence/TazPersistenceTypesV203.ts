import type { PanelAnnotationInput } from '../domain/PanelModel';
import type { PersistedTazBoardInfoV202 } from './TazPersistenceTypesV202';

export type PersistedPanelInfoV203 = PersistedTazBoardInfoV202['panels'][number] & {
    annotations?: PanelAnnotationInput[] | undefined;
};

export type PersistedTazBoardInfoV203 = Omit<
    PersistedTazBoardInfoV202,
    'version' | 'panels'
> & {
    version: '2.0.3';
    panels: PersistedPanelInfoV203[];
};
