import { fireEvent, render, screen } from '@testing-library/react';
import { PanelContextMenu } from './PanelContextMenu';
import { PanelActionKey } from './panelActions';

describe('PanelContextMenu', () => {
    it('renders portal actions and closes before dispatching', () => {
        const onClose = jest.fn();
        const onAction = jest.fn();
        render(
            <PanelContextMenu
                actionState={{ active: [], disabled: [] }}
                position={{ x: 10, y: 20 }}
                onClose={onClose}
                onAction={onAction}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Enable raw data mode' }),
        );

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenCalledWith(PanelActionKey.TOGGLE_RAW);
        expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
            onAction.mock.invocationCallOrder[0],
        );
    });
});
