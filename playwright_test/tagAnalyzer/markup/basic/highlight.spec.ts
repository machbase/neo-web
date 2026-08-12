import { expect, test } from '@playwright/test';
import {
    HIGHLIGHT_EDITOR_TEST_ID,
    addHighlight,
    createMarkupPanel,
    expectRenderedColorRemoved,
    openHighlightEditor,
    openRenderedMarkupEditor,
} from '../support';

const HIGHLIGHT_TEXT_COLOR = '#ff00ff';

test.describe('Tag Analyzer basic highlight', () => {
    test.describe.configure({ timeout: 120_000 });

    test('adds a highlight', async ({ page }) => {
        const panel = await createMarkupPanel(page);

        await addHighlight(page, panel, {
            label: 'Added highlight',
            fillColor: '#123456',
            textColor: HIGHLIGHT_TEXT_COLOR,
        });
    });

    test('edits a highlight label', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await addHighlight(page, panel, {
            label: 'Original highlight',
            textColor: HIGHLIGHT_TEXT_COLOR,
        });

        const editor = await openRenderedMarkupEditor(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await editor.getByTestId('label-input').fill('Edited highlight');
        await editor.getByTestId('apply-button').click();
        await expect(editor).toHaveCount(0);

        const savedEditor = await openRenderedMarkupEditor(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await expect(savedEditor.getByTestId('label-input')).toHaveValue(
            'Edited highlight',
        );
    });

    test('deletes a highlight', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await addHighlight(page, panel, {
            label: 'Deleted highlight',
            textColor: HIGHLIGHT_TEXT_COLOR,
        });
        const editor = await openRenderedMarkupEditor(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
            HIGHLIGHT_EDITOR_TEST_ID,
        );

        await editor.getByTestId('delete-button').click();

        await expect(editor).toHaveCount(0);
        await expectRenderedColorRemoved(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
        );
    });

    test('rejects an invalid highlight start', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openHighlightEditor(page, panel);

        await editor.getByTestId('start-input').fill('invalid');

        await expect(editor).toContainText('Enter a valid start time.');
        await expect(editor.getByTestId('apply-button')).toBeDisabled();
    });

    test('rejects equal highlight endpoints', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openHighlightEditor(page, panel);
        const start = await editor.getByTestId('start-input').inputValue();

        await editor.getByTestId('end-input').fill(start);

        await expect(editor).toContainText(
            'Start and end time must differ.',
        );
        await expect(editor.getByTestId('apply-button')).toBeDisabled();
    });

    test('discards a highlight edit with Cancel', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await addHighlight(page, panel, {
            label: 'Original highlight',
            textColor: HIGHLIGHT_TEXT_COLOR,
        });
        const editor = await openRenderedMarkupEditor(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await editor.getByTestId('label-input').fill('Discarded edit');

        await editor.getByTestId('cancel-button').click();

        await expect(editor).toHaveCount(0);
        const unchangedEditor = await openRenderedMarkupEditor(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await expect(unchangedEditor.getByTestId('label-input')).toHaveValue(
            'Original highlight',
        );
    });

    test('dismisses highlight creation with Escape', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await expectRenderedColorRemoved(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
        );
        const editor = await openHighlightEditor(page, panel);
        const labelInput = editor.getByTestId('label-input');
        await labelInput.fill('Discarded highlight');
        await editor
            .getByTestId('text-color-input')
            .fill(HIGHLIGHT_TEXT_COLOR);

        await labelInput.press('Escape');

        await expect(editor).toHaveCount(0);
        await expectRenderedColorRemoved(
            page,
            panel,
            HIGHLIGHT_TEXT_COLOR,
        );
    });
});
