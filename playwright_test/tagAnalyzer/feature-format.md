# Feature Checklist Format

- Group by UI ownership and use hierarchical IDs: `1.4.2.3.1`.
- Use one independently testable behavior per checkbox.
- Interaction: `- [ ] <ID> <Control> - <Action>.`
- Assertion: `- [ ] <ID> <Expected result>.`
- Use the real control type, such as `Button`, `Menu item`, `Input`, `Clickable card`, `File-tree item`, or `Chart drag`.

Example: `- [ ] 1.2.1.2 Button - Refresh all panel data.`

Test step: `// 2. [1.2.1.2] Refresh all panel data.`

## Test Quality

- Assert temporary UI while it is visible.
- Prevent duplicate requests and handle stale requests.
- Fail on uncaught browser errors, including chart replacement and modal closure.
