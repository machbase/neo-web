# Feature Checklist Format

- Group by UI ownership and use hierarchical IDs: `1.4.2.3.1`.
- Use one independently testable behavior per checkbox.
- Interaction: `- [ ] <ID> <Control> - <Action>.`
- Assertion: `- [ ] <ID> <Expected result>.`
- Use the real control type, such as `Button`, `Menu item`, `Input`, `Clickable card`, `File-tree item`, or `Chart drag`.
- Record every implemented locator in the owning feature document's
  `data-testid` contract table.
- Use `none` when a feature has no test ID or intentionally uses a documented
  semantic locator. Do not invent a selector in the Playwright test without
  first updating the contract.

Example: `- [ ] 1.2.1.2 Button - Refresh all panel data.`

Test step: `// 2. [1.2.1.2] Refresh all panel data.`

## `data-testid` Contract

Use this table near the feature group that owns the element:

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.2.1.1` | Active board | `tag-analyzer-board` | Present only on the active board |
| `1.2.1.1` | Board header | `board-header` | Scope under the active board |
| `1.2.1.1`, `1.2.1.9` | Panel root | `panel-{panelKey}` | Scope under the active board |
| `1.4.1.3` | Panel title button | `title-button` | Scope under the selected panel root |

Rules:

- Write exact IDs for single elements and `{placeholder}` templates for
  repeated runtime entities.
- Define every placeholder beside the table. Runtime keys must be encoded
  reversibly with `encodeURIComponent`.
- Keep feature-qualified IDs on top-level roots and page-scoped feature
  elements. Use local IDs for DOM descendants of a stable owner.
- Scope repeated static child IDs through their keyed owner. For panels, start
  at the board, select `panel-{panelKey}`, and then locate local descendants.
- Scope through an optional subcomponent root when it makes the ownership
  clearer, such as board -> panel -> `footer` ->
  `navigator-shift-backward`.
- Generic `Menu` and `ContextMenu` components must not accept props whose only
  purpose is adding a `data-testid`.
- Menu and context-menu actions are the semantic-role exception to the default
  locator policy. Locate them with `getByRole('button', { name: ... })`, using
  the action's accessible name. Record their `data-testid` as `none`.
- Update the feature contract, component, and Playwright test together when an
  ID changes.

## Test Quality

- Assert temporary UI while it is visible.
- Prevent duplicate requests and handle stale requests.
- Fail on uncaught browser errors, including chart replacement and modal closure.
