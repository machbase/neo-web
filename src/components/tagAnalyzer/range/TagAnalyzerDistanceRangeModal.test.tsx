import { act, fireEvent, render, screen } from '@testing-library/react';
import { TagAnalyzerDistanceRangeModal } from './TagAnalyzerDistanceRangeModal';

let distanceTabProps: any;

jest.mock('@/components/modal/DistanceRangeTab', () => ({
    __esModule: true,
    default: (props: any) => {
        distanceTabProps = props;
        return <div data-testid="shared-distance-range-tab" />;
    },
}));

describe('TagAnalyzerDistanceRangeModal', () => {
    const renderModal = () => {
        const onApply = jest.fn();
        const onClose = jest.fn();
        render(
            <TagAnalyzerDistanceRangeModal
                title="Distance Range"
                initialRangeInput={{ start: 'first', end: 'last' }}
                currentRange={{ start: 0, end: 1000 }}
                fullRange={{ start: 0, end: 1000 }}
                onApply={onApply}
                onClose={onClose}
            />,
        );
        return { onApply, onClose };
    };

    beforeEach(() => {
        distanceTabProps = undefined;
    });

    test('applies a first+N expression through the shared distance resolver', () => {
        const { onApply, onClose } = renderModal();
        act(() => distanceTabProps.pOnChange('first', 'first+250'));
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onApply).toHaveBeenCalledWith(
            { start: 'first', end: 'first+250' },
            { start: 0, end: 250 },
        );
        expect(onClose).toHaveBeenCalled();
    });

    test('keeps the modal open when the resolved range has zero width', () => {
        const { onApply, onClose } = renderModal();
        act(() => distanceTabProps.pOnChange(100, 100));
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        expect(onApply).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    test('reset clears the Tag Analyzer override instead of storing full bounds', () => {
        const { onApply, onClose } = renderModal();
        act(() => distanceTabProps.pOnResetToFull());

        expect(onApply).toHaveBeenCalledWith(
            { start: '', end: '' },
            { start: 0, end: 1000 },
        );
        expect(onClose).toHaveBeenCalled();
    });
});
