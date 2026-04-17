import { useRecoilValue } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../TagAnalyzerUtils';
import type { SeriesConfig } from '../common/modelTypes';
import TagSearchModalBody from '../common/TagSearchModalBody';
import TagSelectionModeRow from '../common/TagSelectionModeRow';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
    getTagSelectionErrorMessage,
    mergeSelectedTagsIntoTagSet,
} from '../common/tagSelectionUtils';
import { useTagSearchModalState } from '../common/useTagSearchModalState';

// Adds more tags to an existing panel.
// It searches available tags, tracks selected additions, and merges the chosen tags into the current panel config.
const AddTagsModal = ({
    pCloseModal,
    pTagSet,
    pOnChangeTagSet,
}: {
    pCloseModal: () => void;
    pTagSet: SeriesConfig[];
    pOnChangeTagSet: (aTagSet: SeriesConfig[]) => void;
}) => {
    const sTables = useRecoilValue(gTables);
    const sTagSearch = useTagSearchModalState({
        tables: sTables,
        initialTable: sTables?.[0] || '',
        maxSelectedCount: 12 - pTagSet.length,
        isSameSelectedTag: (aItem, bItem) =>
            aItem.table === bItem.table && aItem.sourceTagName === bItem.sourceTagName,
    });

    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            12 - pTagSet.length,
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        pOnChangeTagSet(mergeSelectedTagsIntoTagSet(pTagSet, sTagSearch.selectedSeriesDrafts));
        pCloseModal();
    };

    const selectedCountText = (
        <div
            style={{
                marginTop: '8px',
                textAlign: 'right',
                fontSize: '12px',
                color: getTagSelectionCountColor(
                    sTagSearch.selectedSeriesDrafts.length,
                    12 - pTagSet.length,
                ),
            }}
        >
            {buildTagSelectionCountLabel(
                sTagSearch.selectedSeriesDrafts.length,
                12 - pTagSet.length,
            )}
        </div>
    );

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
                <TagSearchModalBody
                    tableOptions={sTagSearch.tableOptions}
                    selectedTable={sTagSearch.selectedTable}
                    onSelectedTableChange={(value) => sTagSearch.setSelectedTable(value)}
                    tagTotal={sTagSearch.tagTotal}
                    tagInputValue={sTagSearch.tagInputValue}
                    onTagInputChange={sTagSearch.filterTag}
                    onSearch={sTagSearch.handleSearch}
                    availableTagResults={sTagSearch.availableTagResults}
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
                    selectedCountText={selectedCountText}
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
