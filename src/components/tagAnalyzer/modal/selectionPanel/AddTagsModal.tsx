import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components';
import {
    getTagSelectionErrorMessage,
} from '../seriesSelection/tagSelectionPresentation';
import TagSelectionPanel from '../seriesSelection/TagSelectionPanel';
import { useTagSelectionPanelState } from './useTagSelectionPanelState';
import { mergeSelectedTagsIntoTagSet } from '../../utils/series/TagSelectionPanelSeriesBuilder';
import { PANEL_TAG_LIMIT } from '../../editor/EditorConstants';
import type { AddTagsModalProps } from '../../editor/EditorTypes';

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
    pTables,
}: AddTagsModalProps) => {
    const sMaxSelectedCount = PANEL_TAG_LIMIT - pTagSet.length;
    const { tagSearch: sTagSearch, viewModel: tagSelectionPanelViewModel } =
        useTagSelectionPanelState({
            tables: pTables,
            initialTable: pTables?.[0] || '',
            maxSelectedCount: sMaxSelectedCount,
            isSameSelectedTag: (item, bItem) =>
                item.table === bItem.table && item.sourceTagName === bItem.sourceTagName,
            modeTriggerStyle: { height: '25px', fontSize: '12px' },
        });

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
            className={undefined}
            size={undefined}
            closeOnEscape={undefined}
            closeOnOutsideClick={undefined}
        >
            <Modal.Header className={undefined} style={undefined} key={undefined}>
                <Modal.Title className={undefined} style={undefined} key={undefined}>
                    <BiSolidChart key={undefined} />
                    New Tag
                </Modal.Title>
                <Modal.Close
                    children={undefined}
                    className={undefined}
                    style={undefined}
                    key={undefined}
                />
            </Modal.Header>
            <Modal.Body className={undefined} style={undefined} key={undefined}>
                <TagSelectionPanel
                    viewModel={tagSelectionPanelViewModel}
                />
            </Modal.Body>
            <Modal.Footer className={undefined} style={undefined} key={undefined}>
                <Modal.Confirm
                    onClick={setPanels}
                    className={undefined}
                    style={undefined}
                    disabled={undefined}
                    loading={undefined}
                    autoFocus={undefined}
                    key={undefined}
                >
                    OK
                </Modal.Confirm>
                <Modal.Cancel
                    className={undefined}
                    style={undefined}
                    onClick={undefined}
                    autoFocus={undefined}
                    key={undefined}
                >
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default AddTagsModal;
