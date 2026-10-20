// The dedup key. Without it, a double-clicked Save or a retried delete stacks two identical toasts,
// because react-hot-toast generates a fresh id per call. Passing a stable `id` makes it replace the
// visible toast instead. This asserts the option actually reaches react-hot-toast — the wrapper
// building its own options object is exactly where it would get dropped.

import toast from 'react-hot-toast';
import { Toast } from './index';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: jest.fn() }));

const optionsOf = (aCallIndex = 0) => (toast as unknown as jest.Mock).mock.calls[aCallIndex][1];

describe('Toast dedup id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('forwards the id so repeat calls replace rather than stack', () => {
        Toast.error('boom', { id: 'timer-delete' });
        expect(optionsOf().id).toBe('timer-delete');
    });

    it('shares one id across the success and error of the same action', () => {
        Toast.error('boom', { id: 'timer-delete' });
        Toast.success('gone', { id: 'timer-delete' });
        expect(optionsOf(0).id).toBe(optionsOf(1).id);
    });

    it('leaves id undefined when the caller sets none, keeping one-toast-per-call', () => {
        Toast.info('hello');
        expect(optionsOf().id).toBeUndefined();
    });

    it('still applies the design-system defaults alongside an id', () => {
        Toast.warning('careful', { id: 'shell-create' });
        expect(optionsOf()).toEqual(expect.objectContaining({ id: 'shell-create', duration: 3000, position: 'top-right' }));
    });

    it('drops blank messages before they ever reach react-hot-toast', () => {
        Toast.success('   ', { id: 'noop' });
        expect(toast).not.toHaveBeenCalled();
    });
});
