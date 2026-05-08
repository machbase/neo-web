import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components';
import { useEffect } from 'react';
import {
    getTagSelectionErrorMessage,
} from '../seriesSelection/tagSelectionPresentation';
import TagSelectionPanel from '../seriesSelection/TagSelectionPanel';
import { useTagSelectionPanelState } from './useTagSelectionPanelState';
import { mergeSelectedTagsIntoTagSet } from '../seriesSelection/buildSelectedSeriesDefinitions';
import { PANEL_TAG_LIMIT, type PanelSeriesDefinition } from '../../domain/SeriesModel';

/**
 * Renders the modal for adding tags to an existing panel.
 * Intent: Let the editor append more series to the current panel without changing the rest of the panel state.
 * @param {() => void} pCloseModal Closes the modal.
 * @param {PanelSeriesDefinition[]} pTagSet The current selected tag set.
 * @param {(aTagSet: PanelSeriesDefinition[]) => void} pOnChangeTagSet Saves the updated tag set.
 * @returns {JSX.Element}
 */
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
            isSameSelectedTag: (item, bItem) =>
                item.table === bItem.table && item.sourceTagName === bItem.sourceTagName,
            modeTriggerStyle: { height: '25px', fontSize: '12px' },
        });
    const { resetState } = sTagSearch;

    useEffect(() => {
        resetState(pAvailableSourceTableNames?.[0] || '');
    }, [pAvailableSourceTableNames, resetState]);

    /**
     * Commits the selected tags into the current panel tag set.
     * Intent: Validate the pending selection before applying it back to the editor state.
     * @returns {Promise<void>}
     */
    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            sMaxSelectedCount,
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        pOnChangeTagSet(mergeSelectedTagsIntoTagSet(pTagSet, sTagSearch.selectedSeriesDrafts));
        pCloseModal();
    };

    return (
        <Modal.Root
            isOpen={true}
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
                <TagSelectionPanel
                    viewModel={tagSelectionPanelViewModel}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm
                    onClick={setPanels}
                >
                    OK
                </Modal.Confirm>
                <Modal.Cancel>
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default AddTagsModal;
