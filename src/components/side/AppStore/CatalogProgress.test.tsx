import { render, screen } from '@testing-library/react';
import { CatalogProgress } from './CatalogProgress';

describe('CatalogProgress', () => {
    test('renders a busy indicator while a catalog build is in flight', () => {
        render(<CatalogProgress pLoading />);

        expect(screen.getByRole('progressbar')).toHaveAccessibleName('Loading catalog');
    });

    test('renders NOTHING when idle — not a hidden or empty-width bar', () => {
        const { container } = render(<CatalogProgress pLoading={false} />);

        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // INDETERMINATE ON PURPOSE. `buildCatalog` fans out to the hub, the server-side
    // archive scan and the `/public/` listing, each able to degrade on its own;
    // there is no fraction to report, and a made-up one would be a number the user
    // could catch being wrong.
    test('claims no percentage', () => {
        render(<CatalogProgress pLoading />);

        const bar = screen.getByRole('progressbar');
        expect(bar).not.toHaveAttribute('aria-valuenow');
        expect(bar).not.toHaveAttribute('aria-valuetext');
    });

    // The bar sits on the seam between the search band and the first card. If it
    // ever took part in the layout, every keystroke in the search box would nudge
    // the whole card list — the panel has already had two height-jump bugs.
    test('carries the class the absolute positioning hangs off', () => {
        const { container } = render(<CatalogProgress pLoading />);

        const bar = container.querySelector('.app-store-catalog-progress');
        expect(bar).toBeInTheDocument();
        // No children to lay out, and nothing that could be tabbed into.
        expect(bar).toBeEmptyDOMElement();
    });
});
