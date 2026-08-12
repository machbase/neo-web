import { expect, test } from '@playwright/test';
import {
    ANNOTATION_EDITOR_TEST_ID,
    HIGHLIGHT_EDITOR_TEST_ID,
    createMarkupPanel,
    expectRenderedColorRemoved,
    openAnnotationEditor,
    openHighlightEditor,
    openRenderedMarkupEditor,
    selectAnnotationSeries,
} from '../support';

test.describe('Tag Analyzer advanced markup lifecycle', () => {
    test.describe.configure({ timeout: 180_000 });

    test('creates, validates, edits, and deletes a highlight', async ({
        page,
    }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openHighlightEditor(page, panel);
        const startInput = editor.getByTestId('start-input');
        const endInput = editor.getByTestId('end-input');
        const applyButton = editor.getByTestId('apply-button');
        const originalStart = await startInput.inputValue();
        const originalEnd = await endInput.inputValue();

        await startInput.fill('invalid');
        await expect(editor).toContainText('Enter a valid start time.');
        await expect(applyButton).toBeDisabled();

        await startInput.fill(originalStart);
        await endInput.fill(originalStart);
        await expect(editor).toContainText(
            'Start and end time must differ.',
        );
        await expect(applyButton).toBeDisabled();

        await endInput.fill(originalEnd);
        await editor.getByTestId('label-input').fill('Playwright highlight');
        await editor.getByTestId('fill-color-input').fill('#123456');
        await editor.getByTestId('text-color-input').fill('#ff00ff');
        await applyButton.click();
        await expect(editor).toHaveCount(0);

        const editEditor = await openRenderedMarkupEditor(
            page,
            panel,
            '#ff00ff',
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await expect(editEditor.getByTestId('delete-button')).toBeVisible();
        await expect(editEditor.getByTestId('label-input')).toHaveValue(
            'Playwright highlight',
        );
        await expect(editEditor.getByTestId('fill-color-input')).toHaveValue(
            '#123456',
        );
        await expect(editEditor.getByTestId('text-color-input')).toHaveValue(
            '#ff00ff',
        );
        await editEditor.getByTestId('label-input').fill('Edited highlight');
        await editEditor.getByTestId('text-color-input').fill('#00ffff');
        await editEditor.getByTestId('apply-button').click();
        await expect(editEditor).toHaveCount(0);

        const deleteEditor = await openRenderedMarkupEditor(
            page,
            panel,
            '#00ffff',
            HIGHLIGHT_EDITOR_TEST_ID,
        );
        await expect(deleteEditor.getByTestId('label-input')).toHaveValue(
            'Edited highlight',
        );
        await deleteEditor.getByTestId('delete-button').click();
        await expect(deleteEditor).toHaveCount(0);
        await expectRenderedColorRemoved(page, panel, '#00ffff');
    });

    test('creates, validates, edits, and deletes an annotation', async ({
        page,
    }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openAnnotationEditor(page, panel);
        const anchorInput = editor.getByTestId('anchor-input');
        const applyButton = editor.getByTestId('apply-button');
        const originalAnchor = await anchorInput.inputValue();

        await anchorInput.fill('invalid');
        await expect(editor).toContainText('Enter a valid time.');
        await expect(applyButton).toBeDisabled();

        await anchorInput.fill(originalAnchor);
        await selectAnnotationSeries(page, editor);
        await editor.getByTestId('text-input').fill('Playwright annotation');
        await editor.getByTestId('fill-color-input').fill('#234567');
        await editor.getByTestId('text-color-input').fill('#00ff00');
        await editor.getByTestId('clip-checkbox').uncheck();
        await expect(applyButton).toBeEnabled();

        await editor.getByTestId('text-input').press('Enter');
        await expect(editor).toHaveCount(0);

        const editEditor = await openRenderedMarkupEditor(
            page,
            panel,
            '#00ff00',
            ANNOTATION_EDITOR_TEST_ID,
        );
        await expect(editEditor.getByTestId('delete-button')).toBeVisible();
        await expect(editEditor.getByTestId('text-input')).toHaveValue(
            'Playwright annotation',
        );
        await expect(editEditor.getByTestId('fill-color-input')).toHaveValue(
            '#234567',
        );
        await expect(editEditor.getByTestId('text-color-input')).toHaveValue(
            '#00ff00',
        );
        await expect(editEditor.getByTestId('clip-checkbox')).not.toBeChecked();
        await editEditor.getByTestId('text-input').fill('Edited annotation');
        await editEditor.getByTestId('text-color-input').fill('#ff5500');
        await editEditor.getByTestId('apply-button').click();
        await expect(editEditor).toHaveCount(0);

        const deleteEditor = await openRenderedMarkupEditor(
            page,
            panel,
            '#ff5500',
            ANNOTATION_EDITOR_TEST_ID,
        );
        await expect(deleteEditor.getByTestId('text-input')).toHaveValue(
            'Edited annotation',
        );
        await deleteEditor.getByTestId('delete-button').click();
        await expect(deleteEditor).toHaveCount(0);
        await expectRenderedColorRemoved(page, panel, '#ff5500');
    });
});
