import { expect, test } from '@playwright/test';
import {
    ANNOTATION_EDITOR_TEST_ID,
    addAnnotation,
    createMarkupPanel,
    expectRenderedColor,
    expectRenderedColorRemoved,
    openAnnotationEditor,
    openRenderedMarkupEditor,
    selectAnnotationSeries,
} from '../support';

const ANNOTATION_TEXT_COLOR = '#00ff00';

test.describe('Tag Analyzer basic annotation', () => {
    test.describe.configure({ timeout: 120_000 });

    test('adds an annotation', async ({ page }) => {
        const panel = await createMarkupPanel(page);

        await addAnnotation(page, panel, {
            text: 'Added annotation',
            fillColor: '#234567',
            textColor: ANNOTATION_TEXT_COLOR,
        });
    });

    test('edits annotation text', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await addAnnotation(page, panel, {
            text: 'Original annotation',
            textColor: ANNOTATION_TEXT_COLOR,
        });

        const editor = await openRenderedMarkupEditor(
            page,
            panel,
            ANNOTATION_TEXT_COLOR,
            ANNOTATION_EDITOR_TEST_ID,
        );
        await editor.getByTestId('text-input').fill('Edited annotation');
        await editor.getByTestId('apply-button').click();
        await expect(editor).toHaveCount(0);

        const savedEditor = await openRenderedMarkupEditor(
            page,
            panel,
            ANNOTATION_TEXT_COLOR,
            ANNOTATION_EDITOR_TEST_ID,
        );
        await expect(savedEditor.getByTestId('text-input')).toHaveValue(
            'Edited annotation',
        );
    });

    test('deletes an annotation', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        await addAnnotation(page, panel, {
            text: 'Deleted annotation',
            textColor: ANNOTATION_TEXT_COLOR,
        });
        const editor = await openRenderedMarkupEditor(
            page,
            panel,
            ANNOTATION_TEXT_COLOR,
            ANNOTATION_EDITOR_TEST_ID,
        );

        await editor.getByTestId('delete-button').click();

        await expect(editor).toHaveCount(0);
        await expectRenderedColorRemoved(
            page,
            panel,
            ANNOTATION_TEXT_COLOR,
        );
    });

    test('requires an annotation series', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openAnnotationEditor(page, panel);

        await selectAnnotationSeries(page, editor, 'annotation not selected');

        await expect(editor).toContainText('Select a series.');
        await expect(editor.getByTestId('apply-button')).toBeDisabled();
    });

    test('rejects an invalid annotation anchor', async ({ page }) => {
        const panel = await createMarkupPanel(page);
        const editor = await openAnnotationEditor(page, panel);
        await selectAnnotationSeries(page, editor);

        await editor.getByTestId('anchor-input').fill('invalid');

        await expect(editor).toContainText('Enter a valid time.');
        await expect(editor.getByTestId('apply-button')).toBeDisabled();
    });

    test('adds an annotation with Enter', async ({ page }) => {
        const keyboardTextColor = '#ff00aa';
        const panel = await createMarkupPanel(page);
        await expectRenderedColorRemoved(page, panel, keyboardTextColor);
        const editor = await openAnnotationEditor(page, panel);
        await selectAnnotationSeries(page, editor);
        const textInput = editor.getByTestId('text-input');
        await textInput.fill('Keyboard annotation');
        await editor
            .getByTestId('text-color-input')
            .fill(keyboardTextColor);
        await expect(editor.getByTestId('apply-button')).toBeEnabled();

        await textInput.press('Enter');

        await expect(editor).toHaveCount(0);
        await expectRenderedColor(page, panel, keyboardTextColor);
    });
});
