import { fireEvent, screen } from '@testing-library/react';
import { createTestPanel, renderPanelEditor } from './editorTestUtils';

describe('PanelEditor General tab', () => {
    test('[TAZ-EDITOR-GENERAL-001] retains the title draft until Apply', () => {
        const { panelInfo, onApply } = renderPanelEditor('general');
        const originalTitle = panelInfo.title;
        const title = screen.getByTestId('editor-title-input');

        fireEvent.change(title, { target: { value: 'Unapplied title' } });

        expect(title).toHaveValue('Unapplied title');
        expect(panelInfo.title).toBe(originalTitle);
        expect(onApply).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('editor-apply'));
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
            title: 'Unapplied title',
        }));
    });

    test('[TAZ-EDITOR-GENERAL-003] blocks Apply for a blank panel title', () => {
        const { onApply } = renderPanelEditor('general');
        fireEvent.change(screen.getByTestId('editor-title-input'), {
            target: { value: '   ' },
        });

        const apply = screen.getByTestId('editor-apply');
        const generalTab = screen.getByTestId('editor-tab-general');
        expect(apply).toBeDisabled();
        expect(generalTab).toHaveAttribute('aria-invalid', 'true');
        expect(generalTab).toHaveAccessibleName('General, invalid settings');
        expect(generalTab).toHaveAttribute('title', 'General: Enter a panel title.');
        fireEvent.click(apply);
        expect(onApply).not.toHaveBeenCalled();
    });

    test('[TAZ-EDITOR-GENERAL-005] forces and disables raw ordering in calculated mode', () => {
        const panelInfo = createTestPanel();
        panelInfo.mode.isRaw = false;
        panelInfo.mode.isOrderBy = false;
        renderPanelEditor('general', panelInfo);

        const checkbox = screen.getByTestId('editor-order-raw-checkbox');
        expect(checkbox).toBeChecked();
        expect(checkbox).toBeDisabled();
    });

    test('[TAZ-EDITOR-GENERAL-008] explains configured-range saving when visible-range saving is off', () => {
        const panelInfo = createTestPanel();
        panelInfo.time.useLastViewedRange = true;
        renderPanelEditor('general', panelInfo);

        fireEvent.click(screen.getByTestId('editor-save-visible-range-checkbox'));

        expect(screen.getByTestId('editor-save-visible-range-checkbox'))
            .not.toBeChecked();
        expect(screen.getByTestId('editor')).toHaveTextContent(
            'Save and Save As will use the configured panel range.',
        );
    });

    test('[TAZ-EDITOR-GENERAL-009] explains visible-range saving when enabled', () => {
        renderPanelEditor('general');

        fireEvent.click(screen.getByTestId('editor-save-visible-range-checkbox'));

        expect(screen.getByTestId('editor-save-visible-range-checkbox'))
            .toBeChecked();
        expect(screen.getByTestId('editor')).toHaveTextContent(
            'Save and Save As will include the current visible range.',
        );
    });
});
