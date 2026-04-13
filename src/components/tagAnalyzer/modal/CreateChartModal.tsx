import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getUserName } from '@/utils';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button, Toast } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { TAG_ANALYZER_AGGREGATION_MODE_OPTIONS } from '../TagAnalyzerUtils';
import TagSearchModalBody from '../common/TagSearchModalBody';
import TagSelectionModeRow from '../common/TagSelectionModeRow';
import {
    buildCreateChartSeed,
    buildTagSelectionCountLabel,
    getTagSelectionCountColor,
    getTagSelectionErrorMessage,
} from '../common/TagSelectionHelpers';
import { useTagSearchModalState } from '../common/useTagSearchModalState';
import { callTagAnalyzerMinMaxTable } from '../TagAnalyzerUtilCaller';

// Used by CreateChartModal to type min max table response.
type MinMaxTableResponse = {
    data:
        | {
              rows: Array<[number | null, number | null]> | undefined;
          }
        | undefined;
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
const CreateChartModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
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
            Toast.error('The maximum number of tags in a chart is 12.', undefined);
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        const sSelectionError = getTagSelectionErrorMessage(
            sTagSearch.selectedSeriesDrafts.length,
            12,
        );
        if (sSelectionError) {
            Toast.error(sSelectionError, undefined);
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sMinMaxBounds = getMinMaxBounds(
            (await callTagAnalyzerMinMaxTable(
                sTagSearch.selectedSeriesDrafts,
                sCurrentUserName,
            )) as MinMaxTableResponse,
        );
        if (!sMinMaxBounds) {
            Toast.error('Please insert Data.', undefined);
            return;
        }

        const minMillis = Math.floor(sMinMaxBounds.minNanos / 1000000);
        const maxMillis = Math.floor(sMinMaxBounds.maxNanos / 1000000);
        const sNewData = buildCreateChartSeed(
            sSelectedChartType,
            sTagSearch.selectedSeriesDrafts,
            minMillis,
            maxMillis,
        );
        const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
        setBoardList(
            sBoardList.map((aItem) => {
                return aItem.id === sSelectedTab
                    ? { ...aItem, panels: aItem.panels.concat(chartFormat) }
                    : aItem;
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
                color: getTagSelectionCountColor(sTagSearch.selectedSeriesDrafts.length, 12),
            }}
        >
            {buildTagSelectionCountLabel(sTagSearch.selectedSeriesDrafts.length, 12)}
        </div>
    );

    return (
        <Modal.Root
            isOpen={isOpen}
            onClose={onClose}
            style={{ maxWidth: '600px', width: '100%' }}
            className={undefined}
            size={undefined}
            closeOnEscape={undefined}
            closeOnOutsideClick={undefined}
        >
            <Modal.Header className={undefined} style={undefined}>
                <Modal.Title className={undefined} style={undefined}>
                    <BiSolidChart />
                    New Chart
                </Modal.Title>
                <Modal.Close children={undefined} className={undefined} style={undefined} />
            </Modal.Header>
            <Modal.Body className={undefined} style={undefined}>
                <Button.Group
                    label="Chart"
                    labelPosition="left"
                    className={undefined}
                    style={undefined}
                    fullWidth={undefined}
                >
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Zone')}
                        active={sSelectedChartType === 'Zone'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={InnerLine}
                            alt="Zone Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Dot')}
                        active={sSelectedChartType === 'Dot'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={Scatter}
                            alt="Scatter Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setSelectedChartType('Line')}
                        active={sSelectedChartType === 'Line'}
                        loading={undefined}
                        icon={undefined}
                        iconPosition={undefined}
                        fullWidth={undefined}
                        isToolTip={undefined}
                        toolTipContent={undefined}
                        toolTipPlace={undefined}
                        toolTipMaxWidth={undefined}
                        forceOpacity={undefined}
                        shadow={undefined}
                        label={undefined}
                        labelPosition={undefined}
                    >
                        <img
                            src={Line}
                            alt="Line Chart"
                            style={{ width: '100%', maxHeight: '80px', objectFit: 'cover' }}
                        />
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
                    availableTagResults={sTagSearch.availableTagResults}
                    onAvailableTagSelect={handleSelectTag}
                    selectedSeriesDrafts={sTagSearch.selectedSeriesDrafts}
                    onSelectedSeriesDraftRemove={sTagSearch.removeSelectedTag}
                    renderSelectedSeriesDraftLabel={(aItem) => (
                        <TagSelectionModeRow
                            selectedSeriesDraft={aItem}
                            options={TAG_ANALYZER_AGGREGATION_MODE_OPTIONS}
                            onModeChange={(aValue) => sTagSearch.setTagMode(aValue, aItem)}
                            triggerStyle={undefined}
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
            <Modal.Footer className={undefined} style={undefined}>
                <Modal.Confirm
                    onClick={setPanels}
                    className={undefined}
                    style={undefined}
                    disabled={undefined}
                    loading={undefined}
                    autoFocus={undefined}
                >
                    Apply
                </Modal.Confirm>
                <Modal.Cancel
                    className={undefined}
                    style={undefined}
                    onClick={undefined}
                    autoFocus={undefined}
                >
                    Cancel
                </Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default CreateChartModal;
