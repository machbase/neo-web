import { fireEvent, render, screen } from '@testing-library/react';
import { Popover } from './index';

const renderPopover = (onClose: () => void) =>
    render(
        <Popover isOpen position={{ x: 10, y: 10 }} onClose={onClose}>
            <ul aria-label="Options" style={{ overflow: 'auto' }}>
                <li>first</li>
            </ul>
        </Popover>,
    );

describe('Popover closeOnScroll', () => {
    it('stays open when its own content scrolls', () => {
        const onClose = jest.fn();
        renderPopover(onClose);

        fireEvent.scroll(screen.getByLabelText('Options'));

        expect(onClose).not.toHaveBeenCalled();
    });

    it('closes when the page scrolls', () => {
        const onClose = jest.fn();
        renderPopover(onClose);

        fireEvent.scroll(document);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
