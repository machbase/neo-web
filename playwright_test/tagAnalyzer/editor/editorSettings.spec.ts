import { expect, test, type Locator } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer panel editor settings', () => {
    test.describe.configure({ timeout: 120_000 });

    test('applies general settings and discards a later draft', async ({
        page,
    }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const panel = await createLoadedTagAnalyzerPanel(page, board);
        const editor = await openEditor(panel);
        const normalize = editor.getByTestId('editor-normalize-checkbox');
        const useZoom = editor.getByTestId('editor-use-zoom-checkbox');
        const saveVisibleRange = editor.getByTestId(
            'editor-save-visible-range-checkbox',
        );
        const initialNormalize = await normalize.isChecked();
        const initialUseZoom = await useZoom.isChecked();
        const initialSaveVisibleRange = await saveVisibleRange.isChecked();
        const appliedTitle = 'Applied general editor settings';

        await setCheckbox(normalize, !initialNormalize);
        await setCheckbox(useZoom, !initialUseZoom);
        await setCheckbox(saveVisibleRange, !initialSaveVisibleRange);
        await editor.getByTestId('editor-title-input').fill(appliedTitle);
        await expect(editor.getByTestId('editor-status')).toContainText(
            'You have unapplied changes.',
        );
        await editor.getByTestId('editor-apply').click();
        await expect(editor.getByTestId('editor-status')).toContainText(
            'Changes applied to this session.',
        );
        await expect(panel.getByTestId('title-button')).toHaveText(
            appliedTitle,
        );

        await setCheckbox(normalize, initialNormalize);
        await expect(editor.getByTestId('editor-status')).toContainText(
            'You have unapplied changes.',
        );
        await editor.getByTestId('editor-close').click();
        await expect(editor).toHaveCount(1);
        await expect(editor).toBeHidden();
        await expect(panel.getByTestId('title-button')).toHaveText(
            appliedTitle,
        );

        const afterDiscardEditor = await openEditor(panel);
        await expect(
            afterDiscardEditor.getByTestId('editor-normalize-checkbox'),
        ).toBeChecked({ checked: !initialNormalize });
        await expect(
            afterDiscardEditor.getByTestId('editor-use-zoom-checkbox'),
        ).toBeChecked({ checked: !initialUseZoom });
        await expect(
            afterDiscardEditor.getByTestId(
                'editor-save-visible-range-checkbox',
            ),
        ).toBeChecked({ checked: !initialSaveVisibleRange });
    });

    test('blocks Apply when the panel title is blank', async ({ page }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        const panel = await createLoadedTagAnalyzerPanel(page, board);
        const editor = await openEditor(panel);
        const apply = editor.getByTestId('editor-apply');

        await editor.getByTestId('editor-title-input').fill('   ');
        await expect(apply).toBeDisabled();
        await expect(editor.getByTestId('editor-tab-general')).toHaveAttribute(
            'aria-invalid',
            'true',
        );

        await editor
            .getByTestId('editor-title-input')
            .fill('Valid editor title');
        await expect(apply).toBeEnabled();
    });
});

async function openEditor(panel: Locator): Promise<Locator> {
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    return editor;
}

async function setCheckbox(
    checkbox: Locator,
    checked: boolean,
): Promise<void> {
    if ((await checkbox.isChecked()) !== checked) {
        await checkbox.press('Space');
    }
    await expect(checkbox).toBeChecked({ checked });
}
