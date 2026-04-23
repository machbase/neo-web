import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components';
import {
    getTagSelectionErrorMessage,
    TagSelectionModeRow,
    TagSelectionPanel,
    useTagSelectionState,
} from '../tagSelection';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../utils/series/PanelSeriesAggregationConstants';
import { mergeSelectedTagsIntoTagSet } from '../utils/series/TagSelectionPanelSeriesBuilder';
import { PANEL_TAG_LIMIT } from './EditorConstants';
import type { AddTagsModalProps } from './EditorTypes';

/**
 * Renders the modal for adding tags to an existing panel.
 * Intent: Let the editor append more series to the current panel without changing the rest of the panel state.
 * @param {() => void} pCloseModal Closes the modal.
 * @param {PanelSeriesConfig[]} pTagSet The current selected tag set.
 * @param {(aTagSet: PanelSeriesConfig[]) => void} pOnChangeTagSet Saves the updated tag set.
 * @returns {JSX.Element}
 */
const AddTagsModal = ({
    pCloseModal,
    pTagSet,
    pOnChangeTagSet,
    pTables,
}: AddTagsModalProps) => {
    const sMaxSelectedCount = PANEL_TAG_LIMIT - pTagSet.length;
    const sTagSearch = useTagSelectionState({
        tables: pTables,
        initialTable: pTables?.[0] || '',
        maxSelectedCount: sMaxSelectedCount,
        isSameSelectedTag: (aItem, bItem) =>
            aItem.table === bItem.table && aItem.sourceTagName === bItem.sourceTagName,
    });

    /**
     * Adds one selected tag to the pending tag list.
     * Intent: Keep tag selection capped while letting the user build the next panel incrementally.
     * @param {string} aValue The selected tag identifier.
     * @returns {Promise<void>}
     */
    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            return;
        }

        await sTagSearch.addTag(aValue);
    };

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
                    tableOptions={sTagSearch.tableOptions}
                    selectedTable={sTagSearch.selectedTable}
                    onSelectedTableChange={sTagSearch.setSelectedTable}
                    tagTotal={sTagSearch.tagTotal}
                    tagInputValue={sTagSearch.tagInputValue}
                    onTagInputChange={sTagSearch.filterTag}
                    onSearch={sTagSearch.handleSearch}
                    availableTags={sTagSearch.availableTags}
                    onAvailableTagSelect={handleSelectTag}
                    selectedSeriesDrafts={sTagSearch.selectedSeriesDrafts}
                    onSelectedSeriesDraftRemove={sTagSearch.removeSelectedTag}
                    renderSelectedSeriesDraftLabel={(aItem) => (
                        <TagSelectionModeRow
                            selectedSeriesDraft={aItem}
                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                            onModeChange={(aValue) => sTagSearch.setTagMode(aValue, aItem)}
                            triggerStyle={{ height: '25px', fontSize: '12px' }}
                        />
                    )}
                    maxSelectedCount={sMaxSelectedCount}
                    paginationProp={{
                        maxPageNum: sTagSearch.maxPageNum,
                        tagPagination: sTagSearch.tagPagination,
                        onPageChange: (page) => sTagSearch.setTagPagination(page),
                        keepPageNum: sTagSearch.keepPageNum,
                        onPageInputChange: (value) => sTagSearch.setKeepPageNum(value),
                    }}
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
