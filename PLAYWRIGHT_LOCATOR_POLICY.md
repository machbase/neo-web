# Playwright Locator Policy

## Default locator

Use `data-testid` as the default contract for locating elements in Playwright tests. Components involved in an end-to-end workflow should expose a stable test ID, and tests should normally interact with them through `getByTestId`.

```tsx
<Button
    data-testid="navigator-next"
    aria-label="Next range"
    onClick={goToNextRange}
/>
```

```ts
await page.getByTestId('navigator-next').click();
```

Test IDs must describe stable product intent rather than presentation. Do not derive them from displayed copy, translated strings, CSS classes, DOM position, or array indexes.

For repeated runtime entities, append a stable entity key such as a database ID or full file path. Encode the key reversibly; do not use a lossy normalization that can give two entities the same test ID. A domain key is different from user-facing display copy.

```tsx
// Good: stable product intent
data-testid="navigator-next"

// Avoid: tied to copy or implementation details
data-testid="Next range"
data-testid="blue-icon-button"
data-testid="navigator-button-2"
```

## Scoped ownership

Treat stable DOM roots as locator namespace boundaries. Keep a feature-qualified
ID on the top-level or page-scoped root, then give its DOM descendants short,
local IDs and chain `getByTestId` calls through their owners. A local ID only
needs to be unique within the selected owner.

```ts
const board = page.getByTestId('tag-analyzer-board');
const panel = board.getByTestId(
    `panel-${encodeURIComponent(panelKey)}`,
);
const footer = panel.getByTestId('footer');

await footer.getByTestId('navigator-shift-backward').click();
```

Do not repeat the feature and owner names in every DOM-descendant ID. Elements
rendered by generic menu primitives are not a reason to thread test-only props
through those primitives. `Menu` and `ContextMenu` must not accept props whose
only purpose is adding a `data-testid` to their content or items.

```ts
await panel.getByTestId('more-actions-trigger').click();
await page.getByRole('button', { name: 'Reload data' }).click();
```

## Role, label, and text queries

Do not use `getByRole`, `getByLabel`, or `getByText` as the default way to drive a workflow. Menu and context-menu actions are the exception: select the action with `getByRole('button', { name: ... })`, using its accessible name. This keeps the test aligned with the menu's public user-facing contract without adding test-only props to shared components.

For other controls, use role, label, or text queries only in a focused test whose purpose is to verify the corresponding user-facing contract, such as:

- an element has the correct semantic role;
- a control has the correct accessible name or label;
- specific copy is displayed;
- content is exposed correctly to the user.

Prefer locating the element by test ID and then making the relevant semantic assertion.

```ts
test('the next-range control exposes accessible button semantics', async ({ page }) => {
    const nextButton = page.getByTestId('navigator-next');

    await expect(nextButton).toHaveRole('button');
    await expect(nextButton).toHaveAccessibleName('Next range');
});
```

For copy-specific tests, assert the text on a stable test-ID locator:

```ts
test('the empty state explains that no results were found', async ({ page }) => {
    await expect(page.getByTestId('results-empty-state')).toHaveText(
        'No results found',
    );
});
```

## Visibility

Test visibility explicitly only when visibility is part of the requirement being verified.

```ts
test('shows the next-range control when navigation is available', async ({ page }) => {
    await expect(page.getByTestId('navigator-next')).toBeVisible();
});
```

A workflow test does not need a separate visibility assertion before clicking. Playwright already waits for the target to be visible, stable, enabled, and able to receive events.

```ts
test('moves to the next range', async ({ page }) => {
    await page.getByTestId('navigator-next').click();

    await expect(page.getByTestId('current-range')).toHaveText(
        'September 2026',
    );
});
```

## Summary

1. Use `getByTestId` for normal element targeting and workflow interaction.
2. Use stable, intent-based test IDs that do not change with copy or styling.
3. Scope local descendant IDs through stable owner roots.
4. Locate menu and context-menu actions by `button` role and accessible name;
   do not add test-only props to generic menu components.
5. Verify role, accessible name, label, text, or visibility only when that property is part of the test's purpose.
6. Keep accessibility attributes in the product even when Playwright locates the element by test ID.
