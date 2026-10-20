import { render, screen } from '@testing-library/react';
import { SplitPane, Pane } from './index';

const Bomb = () => {
    throw new Error('boom');
};

// #1547: one pane failing leaves the other panes of the split rendered.
describe('SplitPane error isolation', () => {
    let sConsoleError: jest.SpyInstance;

    beforeEach(() => {
        sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        sConsoleError.mockRestore();
    });

    it('keeps a failing pane to itself and names its card', () => {
        render(
            <SplitPane sizes={['50%', '50%']} onChange={() => undefined}>
                <Pane minSize={100} boundaryName="list">
                    <div>list ok</div>
                </Pane>
                <Pane boundaryName="detail">
                    <Bomb />
                </Pane>
            </SplitPane>,
        );

        expect(screen.getByText('list ok')).toBeInTheDocument();
        expect(screen.getByTestId('error-boundary-detail')).toBeInTheDocument();
    });

    it('falls back to the pane index for an unnamed pane', () => {
        render(
            <SplitPane sizes={['50%', '50%']} onChange={() => undefined}>
                <Pane>
                    <Bomb />
                </Pane>
                <Pane>
                    <div>right ok</div>
                </Pane>
            </SplitPane>,
        );

        expect(screen.getByTestId('error-boundary-pane%3A0')).toBeInTheDocument();
        expect(screen.getByText('right ok')).toBeInTheDocument();
    });
});
