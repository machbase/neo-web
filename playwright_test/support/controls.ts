import { expect, type Locator } from '@playwright/test';

export async function setCheckbox(
    checkbox: Locator,
    checked: boolean,
): Promise<void> {
    if ((await checkbox.isChecked()) !== checked) {
        await checkbox.press('Space');
    }
    await expect(checkbox).toBeChecked({ checked });
}
