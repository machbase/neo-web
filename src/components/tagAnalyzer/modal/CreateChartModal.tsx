import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getUserName } from '@/utils';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button, Toast } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../TagAnalyzerConstants';
import TagSearchModalBody from '../common/TagSearchModalBody';
import TagSelectionModeRow from '../common/TagSelectionModeRow';
import {
    buildCreateChartSeed,
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
    getTagSelectionErrorMessage,
} from '../common/TagSelectionHelpers';
import { useTagSearchModalState } from '../common/useTagSearchModalState';

type MinMaxTableResponse = {
    data?: {
        rows?: Array<[number | null, number | null]>;
    };
};

const getMinMaxBounds = (aResponse: MinMaxTableResponse) => {
    const sRow = aResponse.data?.rows?.[0];
    const sMinNanos = sRow?.[0];
    const sMaxNanos = sRow?.[1];

    if (typeof sMinNanos !== 'number' || typeof sMaxNanos !== 'number') {
        return undefined;
    }

    return {
        minNanos: sMinNanos,
        maxNanos: sMaxNanos,
    };
};

// Collects table, tag, and chart-type choices for creating a new panel.
// It handles searching tags, paging results, and applying the new panel to the board.
const CreateChartModal = ({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) => {
    const [sBoardList, setBoardList] = useRecoilState(gBoardList);
    const sSelectedTab = useRecoilValue(gSelectedTab);
    const sTables = useRecoilValue(gTables);
    const [sSelectedChartType, setSelectedChartType] = useState<string>('Line');

    const sTagSearch = useTagSearchModalState({
        tables: sTables,
        initialTable: sTables?.[0] || '',
        maxSelectedCount: 12,
        isSameSelectedTag: (aItem, bItem) => aItem.key === bItem.key,
    });
    const { resetState } = sTagSearch;

    useEffect(() => {
        if (isOpen) {
            resetState(sTables?.[0] || '');
            setSelectedChartType('Line');
        }
    }, [isOpen, sTables, resetState]);

    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(sTagSearch.selectedTags.length, 12);
        if (sSelectionError) {
            Toast.error(sSelectionError);
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sMinMaxBounds = getMinMaxBounds((await fetchOnMinMaxTable(sTagSearch.selectedTags, sCurrentUserName)) as MinMaxTableResponse);
        if (!sMinMaxBounds) {
            Toast.error('Please insert Data.');
            return;
        }

        const minMillis = Math.floor(sMinMaxBounds.minNanos / 1000000);
        const maxMillis = Math.floor(sMinMaxBounds.maxNanos / 1000000);
        const sNewData = buildCreateChartSeed(sSelectedChartType, sTagSearch.selectedTags, minMillis, maxMillis);
        const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab ? { ...aItem, panels: aItem.panels.concat(chartFormat) } : aItem;
            }),
        );
        onClose();
    };

    const selectedCountText = (
        <div
            style={{
                marginTop: '8px',
                textAlign: 'right',
                fontSize: '12px',
                color: getTagSelectionCountColor(sTagSearch.selectedTags.length, 12),
            }}
        >
            {buildTagSelectionCountLabel(sTagSearch.selectedTags.length, 12)}
        </div>
    );

    return (
        <Modal.Root isOpen={isOpen} onClose={onClose} style={{ maxWidth: '600px', width: '100%' }}>
            <Modal.Header>
                <Modal.Title>
                    <BiSolidChart />
                    New Chart
                </Modal.Title>
                <Modal.Close />
            </Modal.Header>
            <Modal.Body>
                <Button.Group label="Chart" labelPosition="left">
                    <Button variant="ghost" size="md" onClick={() => setSelectedChartType('Zone')} active={sSelectedChartType === 'Zone'}>
                        <img src={InnerLine} alt="Zone Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setSelectedChartType('Dot')} active={sSelectedChartType === 'Dot'}>
                        <img src={Scatter} alt="Scatter Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setSelectedChartType('Line')} active={sSelectedChartType === 'Line'}>
                        <img src={Line} alt="Line Chart" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }} />
                    </Button>
                </Button.Group>

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
                        <TagSelectionModeRow
                            item={aItem}
                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                            onModeChange={(aValue) => sTagSearch.setTagMode(aValue, aItem)}
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
                <Modal.Confirm onClick={setPanels}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default CreateChartModal;
