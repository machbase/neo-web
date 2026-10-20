import { fireEvent, render, screen } from '@testing-library/react';
import { PanelSeriesCalculationMode } from '../../../seriesModel';
import { createNewPanelInfo, type PanelInfo } from '../../panelModel';
import PanelEditor from '../PanelEditor';

export function createTestPanel(): PanelInfo {
    return createNewPanelInfo([{
        key: 'test-series',
        table: 'TAG',
        sourceTagName: 'TAG_A',
        alias: 'Tag A',
        calculationMode: PanelSeriesCalculationMode.Average,
        useSecondaryAxis: false,
        id: undefined,
        useRollupTable: false,
        sourceColumns: {
            name: 'NAME',
            time: 'TIME',
            value: 'VALUE',
            timeBaseTime: false,
        },
    }], 'Panel', 'Line');
}

export function renderPanelEditor(
    tab: 'general' | 'axes' | 'display' | 'data-setting',
    panelInfo = createTestPanel(),
) {
    const onApply = jest.fn();
    const view = render(
        <PanelEditor
            pOnApplyEditorConfig={onApply}
            pOnClose={jest.fn()}
            pPanelInfo={panelInfo}
            pHasUnsavedBoardChanges={false}
            pMainRange={{ start: 0, end: 10 }}
            pDataRange={{ start: 0, end: 100 }}
            pRollupTableList={{}}
        />,
    );
    fireEvent.click(screen.getByTestId(`editor-tab-${tab}`));
    return { ...view, onApply, panelInfo };
}
