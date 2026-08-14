import { expect, test, type Locator } from '@playwright/test';
import { login } from '../../support/login';
import {
    createLoadedTagAnalyzerPanel,
    createTagAnalyzerBoard,
} from '../../support/tagAnalyzer';

test.describe('Tag Analyzer panel editor General tab', () => {
    test.describe.configure({ timeout: 120_000 });

    let panel: Locator;
    let editor: Locator;

    test.beforeEach(async ({ page }) => {
        await login(page);
        const board = await createTagAnalyzerBoard(page);
        panel = await createLoadedTagAnalyzerPanel(page, board);
        editor = await openEditor(panel);
    });

    test('keeps a title edit in the draft until Apply is clicked', async () => {
        const originalTitle = await panel.getByTestId('title-button').innerText();

        await editor
            .getByTestId('editor-title-input')
            .fill('Unapplied title');

        await expect(panel.getByTestId('title-button')).toHaveText(
            originalTitle,
        );
    });

    test('applies a valid panel title', async () => {
        await editor.getByTestId('editor-title-input').fill('Applied title');
        await editor.getByTestId('editor-apply').click();

        await expect(panel.getByTestId('title-button')).toHaveText(
            'Applied title',
        );
    });

    test('blocks Apply when the panel title is blank', async () => {
        await editor.getByTestId('editor-title-input').fill('   ');

        await expect(editor.getByTestId('editor-apply')).toBeDisabled();
        await expect(
            editor.getByRole('button', {
                name: 'General, invalid settings',
                exact: true,
            }),
        ).toHaveAttribute('title', 'General: Enter a panel title.');
    });

    test('configures drag zoom after Apply', async () => {
        const checkbox = editor.getByTestId('editor-use-zoom-checkbox');
        const nextValue = !(await checkbox.isChecked());

        await setCheckbox(checkbox, nextValue);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenEditor(panel, editor);

        await expect(
            editor.getByTestId('editor-use-zoom-checkbox'),
        ).toBeChecked({ checked: nextValue });
    });

    test('forces raw ordering on and disables it in calculated mode', async () => {
        const checkbox = editor.getByTestId('editor-order-raw-checkbox');

        await expect(checkbox).toBeChecked();
        await expect(checkbox).toBeDisabled();
    });

    test('configures raw data ordering while the panel is in raw mode', async () => {
        await editor.getByTestId('editor-close').click();
        await panel.getByTestId('action-toggle-raw').click();
        editor = await openEditor(panel);
        const checkbox = editor.getByTestId('editor-order-raw-checkbox');

        await expect(checkbox).toBeEnabled();
        await setCheckbox(checkbox, true);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenEditor(panel, editor);

        await expect(
            editor.getByTestId('editor-order-raw-checkbox'),
        ).toBeChecked();
    });

    test('configures value normalization after Apply', async () => {
        const checkbox = editor.getByTestId('editor-normalize-checkbox');
        const nextValue = !(await checkbox.isChecked());

        await setCheckbox(checkbox, nextValue);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenEditor(panel, editor);

        await expect(
            editor.getByTestId('editor-normalize-checkbox'),
        ).toBeChecked({ checked: nextValue });
    });

    test('shows the configured-range note when visible-range saving is disabled', async () => {
        const checkbox = editor.getByTestId(
            'editor-save-visible-range-checkbox',
        );

        await setCheckbox(checkbox, false);

        await expect(editor).toContainText(
            'Save and Save As will use the configured panel range.',
        );
    });

    test('shows the visible-range note when visible-range saving is enabled', async () => {
        const checkbox = editor.getByTestId(
            'editor-save-visible-range-checkbox',
        );

        await setCheckbox(checkbox, true);

        await expect(editor).toContainText(
            'Save and Save As will include the current visible range.',
        );
    });

    test('configures visible-range saving after Apply', async () => {
        const checkbox = editor.getByTestId(
            'editor-save-visible-range-checkbox',
        );
        const nextValue = !(await checkbox.isChecked());

        await setCheckbox(checkbox, nextValue);
        await editor.getByTestId('editor-apply').click();
        await closeAndReopenEditor(panel, editor);

        await expect(
            editor.getByTestId('editor-save-visible-range-checkbox'),
        ).toBeChecked({ checked: nextValue });
    });
});

async function openEditor(panel: Locator): Promise<Locator> {
    await panel.getByTestId('action-toggle-edit').click();
    const editor = panel.getByTestId('editor');
    await expect(editor).toBeVisible();
    return editor;
}

async function closeAndReopenEditor(
    panel: Locator,
    editor: Locator,
): Promise<void> {
    await editor.getByTestId('editor-close').click();
    await expect(editor).toBeHidden();
    await panel.getByTestId('action-toggle-edit').click();
    await expect(editor).toBeVisible();
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
