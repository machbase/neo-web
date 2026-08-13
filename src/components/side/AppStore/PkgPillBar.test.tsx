import { fireEvent, render, screen } from '@testing-library/react';
import { PkgPillBar } from './PkgPillBar';
import { pillLabel } from './pkgViews';

const setup = (over: Partial<React.ComponentProps<typeof PkgPillBar>> = {}) => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    render(<PkgPillBar pOpen={[]} pActive={null} onSelect={onSelect} onClose={onClose} {...over} />);
    return { onSelect, onClose };
};

describe('pillLabel', () => {
    test('drops the prefix every hub package shares, since it distinguishes nothing', () => {
        expect(pillLabel('neo-pkg-opcua-client')).toBe('opcua-client');
    });

    test('leaves a name that does not carry the prefix untouched', () => {
        expect(pillLabel('my-local-pkg')).toBe('my-local-pkg');
    });

    test('never returns an empty label, even for a name that is only the prefix', () => {
        expect(pillLabel('neo-pkg-')).toBe('neo-pkg-');
    });
});

describe('PkgPillBar', () => {
    test('the catalog chip is always present and carries no close button', () => {
        setup({ pOpen: ['neo-pkg-a'] });

        expect(screen.getByTitle('Catalog')).toBeInTheDocument();
        // Exactly one close button — the package pill's, not the catalog's.
        expect(screen.getAllByRole('button', { name: /^Close / })).toHaveLength(1);
    });

    // The way back to the catalog must not be something the user has to scroll the
    // bar to find — with several packages open it was the first thing to slide out
    // of view, which is exactly when it is most needed.
    test('the catalog chip sits OUTSIDE the pill scroller, so it never scrolls away', () => {
        const { container } = render(
            <PkgPillBar pOpen={['neo-pkg-a', 'neo-pkg-b']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />
        );

        const scroller = container.querySelector('.pkg-pill-bar-scroll') as HTMLElement;
        expect(scroller.querySelectorAll('.pkg-pill')).toHaveLength(2);
        expect(scroller.querySelector('.pkg-pill-bar-catalog')).toBeNull();
        expect(container.querySelector('.pkg-pill-bar-catalog')).toBeInTheDocument();
    });

    // Without it the bar reads as one row of chips that happens to be cut off at
    // the left, rather than a fixed control beside a scrolling region.
    test('a divider marks where the pinned region ends and the scrolling one begins', () => {
        const { container } = render(<PkgPillBar pOpen={['neo-pkg-a']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />);

        const kids = [...(container.querySelector('.pkg-pill-bar') as HTMLElement).children].map((el) => el.className);
        expect(kids).toEqual(['pkg-pill-bar-catalog pkg-pill-bar-catalog--active', 'pkg-pill-bar-divider', 'pkg-pill-bar-scroll']);
    });

    test('the divider is there even with no packages open, so the bar does not reflow on the first one', () => {
        const { container } = render(<PkgPillBar pOpen={[]} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />);

        expect(container.querySelector('.pkg-pill-bar-divider')).toBeInTheDocument();
    });

    test('pills render in the order they were opened', () => {
        setup({ pOpen: ['neo-pkg-b', 'neo-pkg-a'] });

        const labels = screen.getAllByRole('tab').slice(1).map((el) => el.textContent);
        expect(labels).toEqual(['b', 'a']);
    });

    test('clicking a pill selects that package', () => {
        const { onSelect } = setup({ pOpen: ['neo-pkg-a'] });

        fireEvent.click(screen.getByTitle('neo-pkg-a'));

        expect(onSelect).toHaveBeenCalledWith('neo-pkg-a');
    });

    test('clicking the catalog chip returns to the catalog, which is `null` and not a name', () => {
        const { onSelect } = setup({ pOpen: ['neo-pkg-a'], pActive: 'neo-pkg-a' });

        fireEvent.click(screen.getByTitle('Catalog'));

        expect(onSelect).toHaveBeenCalledWith(null);
    });

    test('the close button closes and does NOT also select — the two must not fire together', () => {
        const { onSelect, onClose } = setup({ pOpen: ['neo-pkg-a'], pActive: null });

        fireEvent.click(screen.getByRole('button', { name: 'Close neo-pkg-a' }));

        expect(onClose).toHaveBeenCalledWith('neo-pkg-a');
        expect(onSelect).not.toHaveBeenCalled();
    });

    test('exactly one tab is selected at a time, and it is the active one', () => {
        setup({ pOpen: ['neo-pkg-a', 'neo-pkg-b'], pActive: 'neo-pkg-b' });

        const selected = screen.getAllByRole('tab').filter((el) => el.getAttribute('aria-selected') === 'true');
        expect(selected).toHaveLength(1);
        expect(selected[0]).toHaveAttribute('title', 'neo-pkg-b');
    });

    test('the catalog chip is the selected tab when no package is active', () => {
        setup({ pOpen: ['neo-pkg-a'], pActive: null });

        expect(screen.getByTitle('Catalog')).toHaveAttribute('aria-selected', 'true');
    });

    // A pill carries a name and a close button and nothing else. It used to show a
    // running/stopped dot; the package's own UI below already reports the state of
    // every item it manages, so the dot was a second, coarser answer to a question
    // that was already on screen.
    test('a pill carries no status indicator', () => {
        const { container } = render(<PkgPillBar pOpen={['neo-pkg-a']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />);

        expect(container.querySelector('.pkg-pill-dot')).toBeNull();
    });

    test('scrolls the active pill into view when the selection moves', () => {
        const scrollIntoView = jest.fn();
        (window.HTMLElement.prototype as any).scrollIntoView = scrollIntoView;

        const { rerender } = render(
            <PkgPillBar pOpen={['neo-pkg-a', 'neo-pkg-b']} pActive="neo-pkg-a" onSelect={jest.fn()} onClose={jest.fn()} />
        );
        scrollIntoView.mockClear();
        rerender(<PkgPillBar pOpen={['neo-pkg-a', 'neo-pkg-b']} pActive="neo-pkg-b" onSelect={jest.fn()} onClose={jest.fn()} />);

        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });

        delete (window.HTMLElement.prototype as any).scrollIntoView;
    });

    // A WHEEL OVER A HORIZONTAL-ONLY SCROLLER DOES NOTHING BY DEFAULT: browsers map
    // deltaY to vertical scrolling, this element has no vertical overflow, and the
    // gesture falls through to the page — so the bar refused to move at all.
    describe('mouse wheel scrolls the bar sideways', () => {
        const overflowing = () => {
            const { container } = render(
                <PkgPillBar pOpen={['neo-pkg-a', 'neo-pkg-b', 'neo-pkg-c']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />
            );
            const el = container.querySelector('.pkg-pill-bar-scroll') as HTMLElement;
            // jsdom lays nothing out, so the overflow has to be declared.
            Object.defineProperty(el, 'scrollWidth', { value: 400, configurable: true });
            Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });
            return { container, el };
        };

        test('a vertical wheel becomes horizontal scroll', () => {
            const { el } = overflowing();

            fireEvent.wheel(el, { deltaY: 120 });

            expect(el.scrollLeft).toBe(120);
        });

        test('a horizontal wheel (trackpad) is honoured too', () => {
            const { el } = overflowing();

            fireEvent.wheel(el, { deltaY: 0, deltaX: 60 });

            expect(el.scrollLeft).toBe(60);
        });

        test('a bar that does not overflow is left alone, so the wheel still reaches the page', () => {
            const { container } = render(<PkgPillBar pOpen={['neo-pkg-a']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />);
            const el = container.querySelector('.pkg-pill-bar-scroll') as HTMLElement;
            Object.defineProperty(el, 'scrollWidth', { value: 100, configurable: true });
            Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });

            fireEvent.wheel(el, { deltaY: 120 });

            expect(el.scrollLeft).toBe(0);
        });
    });

    // The scrollbar is hidden (no room in a 22px strip), so the fade gradients are
    // the ONLY thing telling the user there are more pills off-screen.
    describe('the overflow fades', () => {
        const measured = (scrollWidth: number, scrollLeft: number) => {
            const { container } = render(
                <PkgPillBar pOpen={['neo-pkg-a', 'neo-pkg-b', 'neo-pkg-c']} pActive={null} onSelect={jest.fn()} onClose={jest.fn()} />
            );
            const el = container.querySelector('.pkg-pill-bar-scroll') as HTMLElement;
            Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
            Object.defineProperty(el, 'clientWidth', { value: 200, configurable: true });
            el.scrollLeft = scrollLeft;
            fireEvent.scroll(el);
            return container.querySelector('.pkg-pill-bar') as HTMLElement;
        };

        test('more pills to the right → right fade only', () => {
            const bar = measured(400, 0);

            expect(bar.className).toContain('pkg-pill-bar--fade-right');
            expect(bar.className).not.toContain('pkg-pill-bar--fade-left');
        });

        test('scrolled to the far right → left fade only, so the bar does not claim more content', () => {
            const bar = measured(400, 200);

            expect(bar.className).toContain('pkg-pill-bar--fade-left');
            expect(bar.className).not.toContain('pkg-pill-bar--fade-right');
        });

        test('scrolled to the middle → both', () => {
            const bar = measured(400, 100);

            expect(bar.className).toContain('pkg-pill-bar--fade-left');
            expect(bar.className).toContain('pkg-pill-bar--fade-right');
        });

        test('a bar that fits shows neither fade', () => {
            const bar = measured(150, 0);

            expect(bar.className).not.toContain('fade-left');
            expect(bar.className).not.toContain('fade-right');
        });
    });

    test('renders without a scrollIntoView implementation at all', () => {
        // jsdom does not implement it. The optional call is what keeps this from
        // taking the whole panel down in a browser that lags behind too.
        expect(() => setup({ pOpen: ['neo-pkg-a'], pActive: 'neo-pkg-a' })).not.toThrow();
    });
});
