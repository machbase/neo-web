import { fireEvent, render, screen } from '@testing-library/react';
import PanelPopover from './PanelPopover';

const renderPopover = (onClose: () => void) =>
    render(
        <PanelPopover title="Highlight" position={{ x: 10, y: 10 }} size="compact" onClose={onClose}>
            <input aria-label="End time" defaultValue="2024-03-01 16:53:20.560" />
        </PanelPopover>,
    );

describe('PanelPopover scroll close', () => {
    it('stays open when something inside it scrolls', () => {
        const onClose = jest.fn();
        renderPopover(onClose);

        // A text input scrolls its caret into view while a long value is typed into it.
        fireEvent.scroll(screen.getByLabelText('End time'));

        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when the page scrolls', () => {
        const onClose = jest.fn();
        renderPopover(onClose);

        fireEvent.scroll(document);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
