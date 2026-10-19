import { render } from '@testing-library/react';
import { SplitPane, Pane } from './index';

// React prints a missing-key warning once per component, so this sits in its own file: rendered after
// another SplitPane test, the warning would already have been spent and the check would pass blind.
// Wrapping the panes turns them into an array; without a key on each, React warns on every render.
// The warning only exists in development builds, so the dev-mode regress run (DSH-RENDER-002) was
// the one place it surfaced.
describe('SplitPane keys', () => {
    it('renders its panes without a missing-key warning', () => {
        const sConsoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        try {
            render(
                <SplitPane sizes={['50%', '50%']} onChange={() => undefined}>
                    <Pane>
                        <div>left</div>
                    </Pane>
                    <Pane>
                        <div>right</div>
                    </Pane>
                </SplitPane>,
            );

            const sKeyWarnings = sConsoleError.mock.calls.filter((aCall) => String(aCall[0]).includes('unique "key" prop'));
            expect(sKeyWarnings).toEqual([]);
        } finally {
            sConsoleError.mockRestore();
        }
    });
});
