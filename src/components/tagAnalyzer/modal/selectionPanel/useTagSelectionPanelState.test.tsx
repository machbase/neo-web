import { act, renderHook } from '@testing-library/react';
import useDebounce from '@/hooks/useDebounce';
import { createTagSelectionStateOptionsFixture } from '../../TestData/TagSelectionTestData';
import { useTagSelectionPanelState } from './useTagSelectionPanelState';

jest.mock('@/hooks/useDebounce', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const useDebounceMock = jest.mocked(useDebounce);

describe('useTagSelectionPanelState', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useDebounceMock.mockImplementation(() => undefined);
    });

    it('exposes the shared panel view-model and routes limit hits through the caller callback', async () => {
        const sOnSelectionLimitReached = jest.fn();
        const sStateOptions = createTagSelectionStateOptionsFixture();
        const { result } = renderHook(() =>
            useTagSelectionPanelState({
                tables: sStateOptions.tables,
                initialTable: sStateOptions.initialTable,
                maxSelectedCount: 0,
                isSameSelectedTag: sStateOptions.isSameSelectedTag,
                modeTriggerStyle: { height: '25px', fontSize: '12px' },
                onSelectionLimitReached: sOnSelectionLimitReached,
            }),
        );

        expect(result.current.viewModel.searchControls.selectedTable).toBe('TABLE_A');
        expect(
            result.current.viewModel.selectedSeriesList.maxSelectedCount,
        ).toBe(0);

        await act(async () => {
            await result.current.viewModel.availableTagList.onAvailableTagSelect('Tag A');
        });

        expect(sOnSelectionLimitReached).toHaveBeenCalledTimes(1);
    });
});
