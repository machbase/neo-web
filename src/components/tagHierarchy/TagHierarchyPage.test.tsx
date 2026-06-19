import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TagHierarchyPage } from './TagHierarchyPage';
import * as tagHierarchy from '@/api/repository/tagHierarchy';

// TagHierarchyPage loads its data on mount (refreshHierarchy → getHierarchyTemplate and
// the per-node tag-link fetches). Only those async/network functions are stubbed; the
// pure tree-mutation helpers (insertHierarchyValueChild/Sibling, indent/outdent, …) stay
// real via requireActual so the structural edits under test actually run.
jest.mock('@/api/repository/tagHierarchy', () => {
    const actual = jest.requireActual('@/api/repository/tagHierarchy');
    return {
        ...actual,
        getHierarchyTemplate: jest.fn(),
        getHierarchyTags: jest.fn(),
        getDirectHierarchyTags: jest.fn(),
        getUnassignedTagsByDocument: jest.fn(),
        getUnassignedTagCountByDocument: jest.fn(),
        updateHierarchyTemplate: jest.fn(),
        createHierarchyTemplate: jest.fn(),
        moveTagsToHierarchyPath: jest.fn(),
        detachTagsFromHierarchy: jest.fn(),
        createJsonMetadataColumn: jest.fn(),
        createJsonPathIndex: jest.fn(),
        dropJsonPathIndex: jest.fn(),
    };
});

// split-pane-react (used by the design-system SplitPane) relies on ResizeObserver,
// which jsdom does not implement.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
beforeAll(() => {
    (global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;
});

const mocked = tagHierarchy as jest.Mocked<typeof tagHierarchy>;

// A three-level schema with a single root containing one child; gives us a depth-2 row
// (the child) to add siblings to and a depth-1 root to add children under.
const SCHEMA = ['country', 'city', 'factory'];
const DOCUMENT: tagHierarchy.HierarchyDocument = {
    schema: SCHEMA,
    tree: [
        {
            key: 'country',
            value: 'Korea',
            children: [{ key: 'city', value: 'Seoul', children: [] }],
        },
    ],
    column: 'ASSET',
};

const jsonColumns = [{ name: 'ASSET', type: 'json' }];

const renderPage = () =>
    render(
        <TagHierarchyPage
            active
            tableName="MACHBASEDB.SYS.SENSOR_TAG"
            nameColumn="NAME"
            jsonColumns={jsonColumns}
            hasAssetColumn
            specColumn="SPEC"
            canEdit
        />
    );

// Enter edit mode by clicking "Edit Tree" and wait for the editing toolbar to appear.
const enterEdit = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Tree' }));
    await screen.findByRole('button', { name: 'Save Tree' });
};

// All value-tree input rows in the editor. The design-system Input puts the passed
// className (styles.treeInput) on its outer container <div>; the real <input> inside
// always carries class "input". So we find each .treeInput container then its <input>.
const treeInputs = (): HTMLInputElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.treeInput'))
        .map((container) => container.querySelector<HTMLInputElement>('input'))
        .filter((el): el is HTMLInputElement => el !== null);

beforeEach(() => {
    mocked.getHierarchyTemplate.mockResolvedValue({
        success: true,
        column: 'ASSET',
        template: DOCUMENT,
        document: DOCUMENT,
        tree: DOCUMENT.tree,
        paths: [DOCUMENT.schema],
        keys: DOCUMENT.schema,
        issues: [],
        mode: 'document',
        hasRow: true,
    } as any);
    mocked.getHierarchyTags.mockResolvedValue({ success: true, rows: [] } as any);
    mocked.getDirectHierarchyTags.mockResolvedValue({ success: true, rows: [] } as any);
    mocked.getUnassignedTagsByDocument.mockResolvedValue({ success: true, rows: [] } as any);
    mocked.getUnassignedTagCountByDocument.mockResolvedValue(0 as any);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('TagHierarchyPage template editing toolbar', () => {
    it('loads the hierarchy and exposes the Edit Tree entry button', async () => {
        renderPage();
        await waitFor(() => expect(mocked.getHierarchyTemplate).toHaveBeenCalled());
        expect(await screen.findByRole('button', { name: 'Edit Tree' })).toBeInTheDocument();
    });

    it('Discard reverts the draft while staying in edit mode (toolbar persists)', async () => {
        renderPage();
        await enterEdit();

        // Editing toolbar is present.
        expect(screen.getByRole('button', { name: 'Save Tree' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();

        // Mutate the draft: edit the root value and add a node.
        const rootInput = treeInputs()[0];
        expect(rootInput).toHaveValue('Korea');
        fireEvent.change(rootInput, { target: { value: 'Korea-EDITED' } });
        expect(treeInputs()[0]).toHaveValue('Korea-EDITED');

        const beforeCount = treeInputs().length;
        fireEvent.click(screen.getAllByRole('button', { name: 'Add child' })[0]);
        await waitFor(() => expect(treeInputs().length).toBe(beforeCount + 1));

        // Reset: draft returns to the original, edit mode stays on.
        fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

        await waitFor(() => expect(treeInputs().length).toBe(beforeCount));
        expect(treeInputs()[0]).toHaveValue('Korea');
        // Edit toolbar still visible (edit mode preserved).
        expect(screen.getByRole('button', { name: 'Save Tree' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
        // The entry button is NOT shown while editing.
        expect(screen.queryByRole('button', { name: 'Edit Tree' })).not.toBeInTheDocument();
    });

    it('Back leaves edit mode and restores the Edit Tree entry button', async () => {
        renderPage();
        await enterEdit();

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));

        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Edit Tree' })).toBeInTheDocument()
        );
        // Editing toolbar is gone.
        expect(screen.queryByRole('button', { name: 'Save Tree' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    });
});

describe('TagHierarchyPage row actions', () => {
    it('Add sibling on a depth-2 row adds one tree input row', async () => {
        renderPage();
        await enterEdit();

        // Rows: [0] root "Korea" (depth 1), [1] child "Seoul" (depth 2).
        const before = treeInputs();
        expect(before).toHaveLength(2);
        expect(before[1]).toHaveValue('Seoul');

        // Sibling buttons: index 0 = root (disabled), index 1 = "Seoul" (enabled).
        const siblingButtons = screen.getAllByRole('button', { name: 'Add sibling (Enter)' });
        const seoulSibling = siblingButtons[1];
        expect(seoulSibling).not.toBeDisabled();
        fireEvent.click(seoulSibling);

        await waitFor(() => expect(treeInputs()).toHaveLength(3));
    });

    it('Add child adds a child row under the targeted node', async () => {
        renderPage();
        await enterEdit();

        const before = treeInputs();
        expect(before).toHaveLength(2);

        // Add a child under the root (depth 1, schema has room for depth 2).
        const childButtons = screen.getAllByRole('button', { name: 'Add child' });
        fireEvent.click(childButtons[0]);

        await waitFor(() => expect(treeInputs()).toHaveLength(3));
    });

    it('disables Add sibling at the root and Add child at the schema max depth', async () => {
        renderPage();
        await enterEdit();

        // Root row: sibling disabled, child enabled (schema depth 3 has room).
        const siblingButtons = screen.getAllByRole('button', { name: 'Add sibling (Enter)' });
        const childButtons = screen.getAllByRole('button', { name: 'Add child' });
        expect(siblingButtons[0]).toBeDisabled(); // root cannot take a sibling
        expect(childButtons[0]).not.toBeDisabled(); // root can take a child

        // Grow the tree to the schema's deepest depth (3) and verify Add child is then disabled.
        // Add child under root -> depth-2 row, then add child under that -> depth-3 (max).
        fireEvent.click(childButtons[0]);
        await waitFor(() => expect(treeInputs()).toHaveLength(3));

        // The newly added depth-2 row is the first child of root (prepended at index 1).
        let allChildButtons = screen.getAllByRole('button', { name: 'Add child' });
        // index 1 corresponds to the depth-2 row; it still has room (depth 3 exists).
        expect(allChildButtons[1]).not.toBeDisabled();
        fireEvent.click(allChildButtons[1]);
        await waitFor(() => expect(treeInputs()).toHaveLength(4));

        // Now the depth-3 row (deepest) must have Add child disabled (path.length + 1 > schema length).
        allChildButtons = screen.getAllByRole('button', { name: 'Add child' });
        const depth3Child = allChildButtons[2];
        expect(depth3Child).toBeDisabled();
    });
});
