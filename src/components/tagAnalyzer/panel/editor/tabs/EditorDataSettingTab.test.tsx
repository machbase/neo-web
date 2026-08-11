import { fireEvent, render, screen } from '@testing-library/react';
import type { PanelDataLoadMetrics } from '../../internal/panelData';
import { createNewPanelInfo } from '../../panelModel';
import EditorDataSettingTab from './EditorDataSettingTab';

const EMPTY_METRICS: PanelDataLoadMetrics = {
    main: {
        queriedEntries: undefined,
        pointCount: undefined,
        pixelWidth: undefined,
    },
    navigator: {
        queriedEntries: undefined,
        pointCount: undefined,
        pixelWidth: undefined,
    },
};

describe('EditorDataSettingTab', () => {
    it('distinguishes automatic density from a partial invalid ratio', () => {
        const panel = createNewPanelInfo([], 'Panel', 'Line');
        panel.display.pixelsPerTick = {
            calculated: undefined,
            calculatedNavigator: undefined,
        };
        const onDisplayChange = jest.fn();

        render(
            <EditorDataSettingTab
                pDisplayConfig={panel.display}
                pDataMetrics={EMPTY_METRICS}
                pIsRawMode={false}
                pAxisKind="time"
                pOnChangeDisplayConfig={onDisplayChange}
            />,
        );

        expect(screen.getAllByText('Automatic density')).toHaveLength(2);

        fireEvent.change(screen.getAllByRole('spinbutton')[0], {
            target: { value: '1' },
        });

        expect(onDisplayChange).toHaveBeenCalledWith({
            ...panel.display,
            pixelsPerTick: {
                ...panel.display.pixelsPerTick,
                calculated: 0,
            },
        });
    });
});
