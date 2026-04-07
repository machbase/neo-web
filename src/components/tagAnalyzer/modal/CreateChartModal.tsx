import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gBoardList, gSelectedTab, gTables } from '@/recoil/recoil';
import { fetchOnMinMaxTable } from '@/api/repository/machiot';
import { DEFAULT_CHART } from '@/utils/constants';
import { convertChartDefault } from '@/utils/utils';
import { getUserName } from '@/utils';
import { BiSolidChart } from '@/assets/icons/Icon';
import { Modal } from '@/design-system/components/Modal';
import { Button, Dropdown, Toast } from '@/design-system/components';
import InnerLine from '@/assets/image/img_chart_01.png';
import Scatter from '@/assets/image/img_chart_02.png';
import Line from '@/assets/image/img_chart_03.png';
import { concatTagSet } from '@/utils/helpers/tags';
import { TAG_ANALYZER_AGGREGATION_MODES } from '../TagAnalyzerConstants';
import TagSearchModalBody from '../common/TagSearchModalBody';
import { useTagSearchModalState } from '../common/useTagSearchModalState';

const buildDefaultRange = (aMinMillis: number, aMaxMillis: number) => {
    if (aMinMillis === aMaxMillis) {
        const sMinMaxDifference = 10;

        return {
            min: aMinMillis,
            max: aMaxMillis - aMinMillis < sMinMaxDifference ? aMaxMillis + sMinMaxDifference : 0,
        };
    }

    return {
        min: aMinMillis,
        max: aMaxMillis,
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
    const [sSelectedTab] = useRecoilState(gSelectedTab);
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

    const aggregationModeOptions = TAG_ANALYZER_AGGREGATION_MODES.map((mode) => ({ value: mode.value, label: mode.key }));

    const handleSelectTag = async (aValue: string) => {
        if (sTagSearch.isAtSelectionLimit) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }

        await sTagSearch.addTag(aValue);
    };

    const setPanels = async () => {
        if (sTagSearch.selectedTags.length === 0) {
            Toast.error('please select tag.');
            return;
        }
        if (sTagSearch.selectedTags.length > 12) {
            Toast.error('The maximum number of tags in a chart is 12.');
            return;
        }

        const sCurrentUserName = getUserName()?.toUpperCase();
        const sRes: any = await fetchOnMinMaxTable(sTagSearch.selectedTags, sCurrentUserName);
        const sMinMax = sRes.data;

        if (!sMinMax.rows[0][0] || !sMinMax.rows[0][1]) {
            Toast.error('Please insert Data.');
            return;
        }
        const minMillis = Math.floor(sMinMax.rows[0][0] / 1000000);
        const maxMillis = Math.floor(sMinMax.rows[0][1] / 1000000);
        if (sMinMax) {
            const sNewData = {
                chartType: sSelectedChartType,
                tagSet: concatTagSet([], sTagSearch.selectedTags),
                defaultRange: buildDefaultRange(minMillis, maxMillis),
            };

            const chartFormat = convertChartDefault(DEFAULT_CHART, sNewData);
            setBoardList(
                sBoardList.map((aItem) => {
                    return aItem.id === sSelectedTab ? { ...aItem, panels: aItem.panels.concat(chartFormat) } : aItem;
                }),
            );
        }
        onClose();
    };

    const selectedCountText = (
        <div
            style={{
                marginTop: '8px',
                textAlign: 'right',
                fontSize: '12px',
                color: sTagSearch.selectedTags.length === 12 ? '#ef6e6e' : 'inherit',
            }}
        >
            Select: {sTagSearch.selectedTags.length} / 12
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aItem.tagName}</span>
                            <div style={{ width: '80px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                                <Dropdown.Root options={aggregationModeOptions} value={aItem.calculationMode || 'avg'} onChange={(value) => sTagSearch.setTagMode(value, aItem)}>
                                    <Dropdown.Trigger className="dropdown-trigger-sm" />
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
                <Modal.Confirm onClick={setPanels}>Apply</Modal.Confirm>
                <Modal.Cancel>Cancel</Modal.Cancel>
            </Modal.Footer>
        </Modal.Root>
    );
};

export default CreateChartModal;
