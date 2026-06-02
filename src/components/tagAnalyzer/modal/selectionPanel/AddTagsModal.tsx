import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal, Toast } from '@/design-system/components';
import { getTagSelectionErrorMessage } from '../seriesSelection/tagSelectionPresentation';
import TagSelectionPanel from '../seriesSelection/TagSelectionPanel';
import { useTagSelectionPanelState } from './useTagSelectionPanelState';
import {
    buildSeriesDefinitionsFromDrafts,
    mergeSelectedTagsIntoTagSet,
} from '../seriesSelection/buildSelectedSeriesDefinitions';
import {
    getMixedXAxisValueKindWarning,
    PANEL_TAG_LIMIT,
    type PanelSeriesDefinition,
} from '../../domain/SeriesDomain';
const AddTagsModal = ({
    pCloseModal,
    pTagSet,
    pOnChangeTagSet,
    pAvailableSourceTableNames,
}: {
    pCloseModal: () => void;
    pTagSet: PanelSeriesDefinition[];
    pOnChangeTagSet: (tagSet: PanelSeriesDefinition[]) => void;
    pAvailableSourceTableNames: string[];
}) => {
    const sMaxSelectedCount = PANEL_TAG_LIMIT - pTagSet.length;
    const { tagSearch: sTagSearch, viewModel: tagSelectionPanelViewModel } =
        useTagSelectionPanelState({
            tables: pAvailableSourceTableNames,
            initialTable: pAvailableSourceTableNames?.[0] || '',
            maxSelectedCount: sMaxSelectedCount,
            existingSeries: pTagSet,
            isSameSelectedTag: (item, bItem) =>
                item.table === bItem.table && item.sourceTagName === bItem.sourceTagName,
            modeTriggerStyle: { height: '25px', fontSize: '12px' },
        });
    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            sMaxSelectedCount,
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        const sNewSeriesDefinitions = buildSeriesDefinitionsFromDrafts(
            sTagSearch.selectedSeriesDrafts,
        );
        const sAxisKindWarning = getMixedXAxisValueKindWarning([
            ...pTagSet,
            ...sNewSeriesDefinitions,
        ]);
        if (sAxisKindWarning) {
            Toast.error(sAxisKindWarning, undefined);
            return;
        }

        pOnChangeTagSet(
            mergeSelectedTagsIntoTagSet(pTagSet, sTagSearch.selectedSeriesDrafts),
        );
        pCloseModal();
    };

    return (
        <Modal.Root
            isOpen
            onClose={pCloseModal}
            style={{ maxWidth: '600px', width: '100%' }}
        >
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Tag
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <TagSelectionPanel viewModel={tagSelectionPanelViewModel} />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={setPanels}>OK</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default AddTagsModal;
