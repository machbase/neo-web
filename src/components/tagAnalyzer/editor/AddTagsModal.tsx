import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { gTables } from '@/recoil/recoil';
import { convertTagChartType } from '@/utils/utils';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Toast } from '@/design-system/components';
import { Modal, Dropdown } from '@/design-system/components';
import { concatTagSet } from '@/utils/helpers/tags';
import { TAG_ANALYZER_AGGREGATION_MODES } from '../TagAnalyzerConstants';
import type { TagAnalyzerTagItem } from '../panel/TagAnalyzerPanelModelTypes';
import TagSearchModalBody from '../common/TagSearchModalBody';
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
        isSameSelectedTag: (aItem, bItem) => aItem.table === bItem.table && aItem.tagName === bItem.tagName,
    });

    const aggregationModeOptions = useMemo(() => {
        return TAG_ANALYZER_AGGREGATION_MODES.map((aItem) => ({ label: aItem.value, value: aItem.value }));
    }, []);

    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        if (sTagSearch.selectedTags.length === 0) {
            Toast.error('please select tag.');
            return;
        }
        if (sTagSearch.selectedTags.length > 12 - pTagSet.length) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }
        const tagSet = convertTagChartType(sTagSearch.selectedTags);

        pOnChangeTagSet(concatTagSet(pTagSet, tagSet));
        pCloseModal();
    };

    const selectedCountText = (
        <div
            style={{
                marginTop: '8px',
                textAlign: 'right',
                fontSize: '12px',
                color: sTagSearch.selectedTags.length === 12 - pTagSet.length ? '#ef6e6e' : 'inherit',
            }}
        >
            Select: {sTagSearch.selectedTags.length} / {12 - pTagSet.length}
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
                    tagList={sTagSearch.tagList}
                    onAvailableTagSelect={handleSelectTag}
                    selectedTags={sTagSearch.selectedTags}
                    onSelectedTagRemove={sTagSearch.removeSelectedTag}
                    renderSelectedTagLabel={(aItem) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aItem.tagName}</span>
                            <div style={{ width: '80px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                <Dropdown.Root options={aggregationModeOptions} value={aItem.calculationMode || 'avg'} onChange={(value) => sTagSearch.setTagMode(value, aItem)}>
                                    <Dropdown.Trigger className="dropdown-trigger-sm" style={{ width: '100%', height: '25px', fontSize: '12px' }} />
                                    <Dropdown.Menu>
                                        <Dropdown.List />
                                    </Dropdown.Menu>
                                </Dropdown.Root>
                            </div>
                        </div>
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
