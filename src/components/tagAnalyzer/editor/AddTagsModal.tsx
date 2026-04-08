import { useRecoilValue } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal } from '@/design-system/components';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../TagAnalyzerConstants';
import type { TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';
import TagSearchModalBody from '../common/TagSearchModalBody';
import TagSelectionModeRow from '../common/TagSelectionModeRow';
import {
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
    getTagSelectionErrorMessage,
    mergeSelectedTagsIntoTagSet,
} from '../common/TagSelectionHelpers';
import { useTagSearchModalState } from '../common/useTagSearchModalState';

// Adds more tags to an existing panel.
// It searches available tags, tracks selected additions, and merges the chosen tags into the current panel config.
const AddTagsModal = ({
    pCloseModal,
    pTagSet,
    pOnChangeTagSet,
}: {
    pCloseModal: () => void;
    pTagSet: TagAnalyzerTagItem[];
    pOnChangeTagSet: (aTagSet: TagAnalyzerTagItem[]) => void;
}) => {
    const sTables = useRecoilValue(gTables);
    const sTagSearch = useTagSearchModalState({
        tables: sTables,
        initialTable: sTables?.[0] || '',
        maxSelectedCount: 12 - pTagSet.length,
        isSameSelectedTag: (aItem, bItem) => aItem.table === bItem.table && aItem.sourceTagName === bItem.sourceTagName,
    });

    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(sTagSearch.selectedSeriesDrafts.length, 12 - pTagSet.length);
        if (sSelectionError) {
            Toast.error(sSelectionError);
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
                color: getTagSelectionCountColor(sTagSearch.selectedSeriesDrafts.length, 12 - pTagSet.length),
            }}
        >
            {buildTagSelectionCountLabel(sTagSearch.selectedSeriesDrafts.length, 12 - pTagSet.length)}
        </div>
    );

    return (
        <Modal.Root isOpen={true} onClose={pCloseModal} style={{ maxWidth: '600px', width: '100%' }}>
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Tag
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
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
                    maxPageNum={sTagSearch.maxPageNum}
                    tagPagination={sTagSearch.tagPagination}
                    onPageChange={(page) => sTagSearch.setTagPagination(page)}
                    keepPageNum={sTagSearch.keepPageNum}
                    onPageInputChange={(value) => sTagSearch.setKeepPageNum(value)}
                />
            </Modal.Body>
            <Modal.Footer>
                <Modal.Confirm onClick={setPanels}>OK</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default AddTagsModal;
