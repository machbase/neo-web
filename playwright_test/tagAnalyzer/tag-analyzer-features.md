# 1. TagAnalyzer

## Test fixture policy

`TAG ANALYZER.taz` is reserved for tests whose subject is opening, loading,
migration, or compatibility. All other tests must create a fresh board and any
required panels through the UI instead of using the shared file as setup.

Never save, overwrite, rename, or delete the shared fixture. Persistence tests
must use a uniquely named, test-owned `.taz` file and delete it in `finally`.

## `data-testid` Contract

This registry is the locator contract for the feature checklist below. A
feature not listed in the registry currently has `data-testid: none`. Add its
stable ID here before using it in a Playwright test unless the registry
documents an intentional semantic-locator exception.

Template values:

- `{panelKey}` = `encodeURIComponent(panelInfo.key)`.
- `{pathAndFileName}` = `encodeURIComponent(directoryPath + fileName)`.
- `{tag}` = `encodeURIComponent(tag)`.
- `{actionKey}` = the action key in lowercase with `_` replaced by `-`.
- `{variant}` = `extra` or `more`.

Scoping rules:

- Start at the active `tag-analyzer-board`.
- Resolve board DOM descendants with local IDs under that board root.
- Select a repeated panel with `panel-{panelKey}` under the board.
- Resolve panel DOM descendants with local IDs under that selected panel root,
  optionally scoping through a local subcomponent such as `footer`.
- Header-menu and context-menu actions are the semantic-role exception to the
  default test-ID policy. After opening a menu from its owning panel, resolve
  the action from the page with `getByRole('button', { name: ... })`, using
  its accessible name. Generic `Menu` and `ContextMenu` components do not
  accept test-only props.

```ts
const board = page.getByTestId('tag-analyzer-board');
const panel = board.getByTestId(/^panel-/).nth(2);

await panel
    .getByTestId('footer')
    .getByTestId('navigator-shift-forward')
    .click();
```

Prefer `panel-${encodeURIComponent(panelKey)}` over `nth()` when the panel key
is known. Use panel order only when that order is part of the tested behavior.

### Meta and board

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.1.3` | New TagAnalyzer card | `new-board-taz` | Application-level locator |
| `1.1.4` | Saved TAZ file | `file-tree-item-{pathAndFileName}` | Stable full-path identity |
| `1.1.5`, `1.2.1.1` | Active board root | `tag-analyzer-board` | Contains the header and panels |
| `1.2.1.1` | Board header | `board-header` | Scope under the active board |
| `1.2.1.1`, `1.2.1.9` | Panel root | `panel-{panelKey}` | Scope under the active board; stable repeated-panel identity |
| `1.2.1.6` | Open Help | `help-button` | Scope under the active board |
| `1.2.1.6`, `1.2.1.7` | Help dialog | `tag-analyzer-help-dialog` | Page-scoped dialog |
| `1.2.1.7` | Close Help | `tag-analyzer-help-close-button` | Scope under Help dialog |
| `1.2.1.6` | Help section heading | `tag-analyzer-help-{section}-heading` | `{section}` is a stable Help section ID |
| `1.2.1.8`, `1.3.1.1` | Open New Chart | `create-panel-button` | Scope under the active board |

### Board range

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.2.2.1` | Open Board Range | `range-button` | Scope under the active board |
| `1.2.2.1`-`1.2.2.6`, `1.4.3.7.1` | Range dialog | `tag-analyzer-range-dialog` | Shared board/panel range dialog |
| `1.2.2.1` | Range title | `tag-analyzer-range-title` | Scope under Range dialog |
| `1.2.2.6` | Time kind | `tag-analyzer-range-kind-time-button` | Scope under Range dialog |
| `1.2.2.6` | Numeric kind | `tag-analyzer-range-kind-numeric-button` | Scope under Range dialog |
| `1.2.2.3`, `1.2.2.4`, `1.4.3.7.1` | From input | `tag-analyzer-range-from-input` | Scope under Range dialog |
| `1.2.2.3`, `1.2.2.4`, `1.4.3.7.1` | To input | `tag-analyzer-range-to-input` | Scope under Range dialog |
| `1.2.2.3`, `1.2.2.4`, `1.4.3.7.1` | Apply range | `tag-analyzer-range-apply-button` | Scope under Range dialog |
| `1.2.2.2` | Cancel range | `tag-analyzer-range-cancel-button` | Scope under Range dialog |
| `1.2.2.5` | Validation message | `tag-analyzer-range-validation-message` | Inline alert, not a toast |

### Save and overlap

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.2.3.3` | Open Save As | `save-as-button` | Scope under the active board |
| `1.2.3.3`-`1.2.3.8`, `1.2.3.18` | Save As dialog | `tag-analyzer-save-as-dialog` | Page-scoped dialog |
| `1.2.3.3` | Save As title | `tag-analyzer-save-as-title` | Scope under Save As dialog |
| `1.2.3.5`, `1.2.3.8` | File name | `tag-analyzer-save-as-file-name-input` | Scope under Save As dialog |
| `1.2.3.7`, `1.2.3.8` | Submit Save As | `tag-analyzer-save-as-submit-button` | Scope under Save As dialog |
| `1.2.3.18` | Cancel Save As | `tag-analyzer-save-as-cancel-button` | Scope under Save As dialog |
| `1.2.3.14` | Save success | `tag-analyzer-save-success-toast` | Page-scoped temporary status |
| `1.2.3.19` | Saved file to switch/open | `file-tree-item-{pathAndFileName}` | Stable full-path identity in the file tree |
| `1.2.3.20` | File delete dialog | `file-delete-dialog` | Page-scoped confirmation opened from the selected file-tree item |
| `1.2.3.20` | Confirm file deletion | `file-delete-confirm` | Scope under the file delete dialog |
| `1.2.4.1`, `1.4.1.17`, `1.4.1.18` | Panel overlap toggle | `overlap-toggle` | Scope under the selected panel |
| `1.2.4.3` | Open Overlap | `overlap-button` | Scope under the active board |
| `1.2.4.3`-`1.2.4.6` | Overlap dialog | `tag-analyzer-overlap-dialog` | Page-scoped dialog |
| `1.2.4.4` | Close Overlap | `tag-analyzer-overlap-close` | Scope under Overlap dialog |
| `1.2.4.5`, `1.2.4.12`-`1.2.4.19` | Overlap chart | `tag-analyzer-overlap-chart` | Scope under Overlap dialog |
| `1.2.4.16`-`1.2.4.19` | Overlap gesture surface | `viewport-surface` | Scope under Overlap chart |
| `1.2.4.6` | Refresh Overlap | `tag-analyzer-overlap-refresh` | Scope under Overlap dialog |
| `1.2.4.5`, `1.2.4.7`-`1.2.4.15` | Selected overlap panel | `tag-analyzer-overlap-panel-{panelKey}` | Stable page-scoped identity inside Overlap dialog |
| `1.2.4.7`, `1.2.4.8` | Original/altered ranges | `original-range`, `altered-range` | Scope under the selected overlap panel |
| `1.2.4.7` | Shift left | `shift-left` | Scope under the selected overlap panel |
| `1.2.4.8` | Shift right | `shift-right` | Scope under the selected overlap panel |
| `1.2.4.7`-`1.2.4.9` | Shift amount | `shift-amount` | Scope under the selected overlap panel |

### Add Panel modal

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.3.1.1`-`1.3.3.4` | New Chart dialog | `tag-analyzer-create-panel-dialog` | Page-scoped dialog |
| `1.3.1.3` | Chart name | `tag-analyzer-create-panel-name-input` | Scope under New Chart dialog |
| `1.3.2.1` | Source table | `none` | Use `getByLabel('Table')`; the visible label is part of the form contract |
| `1.3.2.3`, `1.3.2.4` | Series search input | `tag-analyzer-series-search-input` | Scope under New Chart dialog |
| `1.3.2.3` | Search series | `tag-analyzer-series-search-button` | Scope under New Chart dialog |
| `1.3.2.6` | Series result | `tag-analyzer-series-option-{tag}` | Stable repeated-tag identity |
| `1.3.2.6`, `1.3.2.11` | Selected count | `tag-analyzer-selected-series-count` | Scope under New Chart dialog |
| `1.3.3.3` | Apply New Chart | `tag-analyzer-create-panel-apply-button` | Scope under New Chart dialog |

### Panel header and actions

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.4.1.1`-`1.4.1.18` | Panel header | `header` | Scope under the selected panel |
| `1.4.1.1` | Main range | `main-range-button` | Scope under the selected panel |
| `1.4.1.3` | Panel title | `title-button` | Scope under the selected panel |
| `1.4.1.4`-`1.4.1.6` | Panel title input | `title-input` | Scope under the selected panel |
| `1.4.1.11` | Header action | `action-{actionKey}` | Direct button under the selected panel |
| `1.4.1.12`, `1.4.1.13` | Action group | `{variant}-actions` | Scope under the selected panel |
| `1.4.1.12`, `1.4.1.13` | Open action menu | `{variant}-actions-trigger` | Scope under the selected panel |
| `1.4.1.7`-`1.4.1.16` | Header menu | `none` | Generic menu; do not pass test-only props |
| `1.4.1.7`-`1.4.1.16` | Header menu action | `none` | Use `getByRole('button', { name: ... })` with the accessible name |
| `1.4.1.14` | Context menu | `none` | Generic context menu; do not pass test-only props |
| `1.4.1.7`-`1.4.1.16` | Context action | `none` | Use `getByRole('button', { name: ... })` with the accessible name |

Direct `{actionKey}` values currently rendered are `toggle-raw`,
`toggle-drag-select`, `refresh-range`, `toggle-edit`, and
`open-delete-confirm`.

### Panel chart, navigator, and editor

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.4.2.1.1`, `1.4.2.1.2` | Panel chart | `chart` | Scope under the selected panel |
| `1.4.2.2.3` | Main-chart drag zoom surface | `chart` | Scope under the selected panel |
| `1.4.2.2.7` | Shift main range backward | `main-shift-backward` | Scope under the selected panel |
| `1.4.2.2.8` | Shift main range forward | `main-shift-forward` | Scope under the selected panel |
| `1.4.2.1.1` | Panel footer | `footer` | Scope under the selected panel |
| `1.4.2.1.1` | Navigator loading | `navigator-loading` | Scope under the panel footer |
| `1.4.2.3.1`-`1.4.2.3.5` | Navigator zoom/focus | `navigator-{control}` | Scope under the panel footer; `{control}` is a stable control key |
| `1.4.2.4.1` | Shift navigator backward | `navigator-shift-backward` | Scope under the panel footer |
| `1.4.2.4.2` | Shift navigator forward | `navigator-shift-forward` | Scope under the panel footer |
| `1.4.2.4.5` | Navigator range start | `navigator-range-start` | Scope under the panel footer; opens shared Range dialog |
| `1.4.2.4.6` | Navigator range end | `navigator-range-end` | Scope under the panel footer; opens shared Range dialog |
| `1.4.2.4.8` | Navigator selection minimum | `main-range-button`, `navigator-range-start`, `navigator-range-end`, `chart` | Compare displayed spans against chart geometry under the selected panel |
| `1.4.3.1.1`-`1.4.3.1.5` | Panel editor | `editor` | Scope under the selected panel |
| `1.4.3.1.1` | Open editor | `action-toggle-edit` | Scope under the selected panel |
| `1.4.3.1.2` | Close editor | `editor-close` | Scope under the panel editor |
| `1.4.3.1.3` | Apply editor | `editor-apply` | Scope under the panel editor |
| `1.4.3.1.4` | Editor status | `editor-status` | Scope under the panel editor |
| `1.4.3.2.1` | Editor title | `editor-title-input` | Scope under the panel editor |
| `1.4.3.2.2` | Drag zoom | `editor-use-zoom-checkbox` | Scope under the panel editor |
| `1.4.3.2.3` | Raw ordering | `editor-order-raw-checkbox` | Scope under the panel editor |
| `1.4.3.2.5` | Normalize values | `editor-normalize-checkbox` | Scope under the panel editor |
| `1.4.3.2.4` | Save visible range | `editor-save-visible-range-checkbox` | Scope under the panel editor |

Navigator `{control}` values are `zoom-in-large`, `zoom-in-small`, `focus`,
`zoom-out-small`, and `zoom-out-large`.

### Selection and FFT

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.4.4.4.1`, `1.4.4.4.2` | Toggle range selection | `action-toggle-drag-select` | Scope under the selected panel |
| `1.4.4.4.3` | Selection surface | `chart` | Scope under the selected panel |
| `1.4.4.4.4`-`1.4.4.4.6` | Selection Summary | `tag-analyzer-selection-summary` | Page-scoped popover |
| `1.4.4.5.1` | Open FFT | `tag-analyzer-selection-open-fft` | Scope under Selection Summary |
| `1.4.4.5.1`-`1.4.4.5.17` | FFT dialog | `tag-analyzer-fft-dialog` | Page-scoped dialog |
| `1.4.4.5.2` | Close FFT | `tag-analyzer-fft-close` | Scope under FFT dialog |
| `1.4.4.5.3` | FFT series | `tag-analyzer-fft-series` | Scope under FFT dialog; options use `tag-analyzer-fft-series-option-{encodedTag}` |
| `1.4.4.5.4` | 2D mode | `tag-analyzer-fft-2d` | Scope under FFT dialog |
| `1.4.4.5.4` | FFT chart | `tag-analyzer-fft-chart` | Scope under FFT dialog |
| `1.4.4.5.5` | 3D mode | `tag-analyzer-fft-3d` | Scope under FFT dialog |
| `1.4.4.5.6` | Minimum frequency | `tag-analyzer-fft-min-hz` | Scope under FFT dialog |
| `1.4.4.5.7` | Maximum frequency | `tag-analyzer-fft-max-hz` | Scope under FFT dialog |
| `1.4.4.5.8` | 3D interval | `tag-analyzer-fft-interval` | Scope under FFT dialog |
| `1.4.4.5.9` | 3D interval unit | `tag-analyzer-fft-interval-unit` | Options use `tag-analyzer-fft-interval-unit-option-{unit}` |
| `1.4.4.5.10` | Apply FFT values | `tag-analyzer-fft-apply` | Scope under FFT dialog |
| `1.4.4.5.12` | FFT load error | `tag-analyzer-fft-load-error` | Page-scoped toast |
| `1.4.4.5.15`-`1.4.4.5.17` | FFT validation errors | `tag-analyzer-fft-{frequency,frequency-range,interval,interval-range}-error` | Page-scoped toasts |

### Markup editors

Highlight and annotation actions are selected from the panel's Extra menu by
their accessible button names. Editor controls use local IDs scoped through
their page-scoped editor root.

| Feature ID(s) | Element | `data-testid` | Scope or notes |
| --- | --- | --- | --- |
| `1.4.4.1.3`-`1.4.4.1.10`, `1.4.4.3.1`, `1.4.4.3.2` | Highlight editor | `tag-analyzer-highlight-editor` | Page-scoped popover |
| `1.4.4.1.6` | Highlight start | `start-input` | Scope under Highlight editor |
| `1.4.4.1.7` | Highlight end | `end-input` | Scope under Highlight editor |
| `1.4.4.1.8` | Highlight label | `label-input` | Scope under Highlight editor |
| `1.4.4.1.9` | Highlight fill color | `fill-color-input` | Scope under Highlight editor |
| `1.4.4.1.10` | Highlight text color | `text-color-input` | Scope under Highlight editor |
| `1.4.4.2.3`-`1.4.4.2.10`, `1.4.4.3.1`, `1.4.4.3.2` | Annotation editor | `tag-analyzer-annotation-editor` | Page-scoped popover |
| `1.4.4.2.6` | Annotation series | `series-trigger` | Scope under Annotation editor; options use their accessible names |
| `1.4.4.2.7` | Annotation anchor | `anchor-input` | Scope under Annotation editor |
| `1.4.4.2.8` | Annotation text | `text-input` | Scope under Annotation editor |
| `1.4.4.2.9` | Annotation fill/text colors | `fill-color-input`, `text-color-input` | Scope under Annotation editor |
| `1.4.4.2.10` | Clip annotation | `clip-checkbox` | Scope under Annotation editor |
| `1.4.4.1.5`, `1.4.4.2.5` | Delete markup | `delete-button` | Scope under the active editor; only rendered while editing |
| `1.4.4.3.1` | Apply markup | `apply-button` | Scope under the active editor |
| `1.4.4.3.2` | Cancel markup | `cancel-button` | Scope under the active editor |

## 1.1 Meta

- [ ] 1.1.1 Use `TAG` with the `use` tag for every time-based test.
- [ ] 1.1.2 Navigation item - Open TagAnalyzer.
- [ ] 1.1.3 Clickable card - Open a new TagAnalyzer board.
- [ ] 1.1.4 File-tree item - Open an existing `.taz` board.
- [ ] 1.1.5 Keep the correct board active when switching application tabs.
- [ ] 1.1.6 Load rollup metadata.
- [ ] 1.1.7 Continue safely when rollup metadata is unavailable.
- [ ] 1.1.8 Warn when a saved board requires migration.
- [ ] 1.1.9 Warn when a saved board contains unsupported data.

## 1.2 Board

### 1.2.1 Board Controls

- [ ] 1.2.1.1 Render the board header and existing panels.
- [ ] 1.2.1.2 Button - Refresh all panel data.
- [ ] 1.2.1.3 Button - Refresh all panel ranges.
- [ ] 1.2.1.4 Button - Expand all panels to their full data ranges.
- [ ] 1.2.1.5 Show the unsaved-change indicator after a runtime change.
- [ ] 1.2.1.6 Button - Open Help.
- [ ] 1.2.1.7 Button - Close Help.
- [ ] 1.2.1.8 Button - Add multiple panels.
- [ ] 1.2.1.9 Display multiple panels.
- [ ] 1.2.1.10 Button - Remove a panel.

### 1.2.2 Board Range

- [ ] 1.2.2.1 Button - Open the Board Range dialog.
- [ ] 1.2.2.2 Button - Close the Board Range dialog.
- [ ] 1.2.2.3 Apply a valid datetime board range.
- [ ] 1.2.2.4 Apply a valid numeric board range.
- [ ] 1.2.2.5 Reject an invalid board range with the inline validation message.
- [ ] 1.2.2.6 Button set - Switch between datetime and numeric board ranges.

### 1.2.3 Save and Persistence

- [ ] 1.2.3.1 Button - Save a test-owned board from the toolbar.
- [ ] 1.2.3.2 Keyboard shortcut - Save a test-owned board.
- [ ] 1.2.3.3 Button - Open Save As.
- [ ] 1.2.3.4 Directory list - Navigate directories in Save As.
- [ ] 1.2.3.5 Input - Validate the Save As filename.
- [ ] 1.2.3.6 Button - Confirm overwriting from Save As.
- [ ] 1.2.3.7 Button - Save and overwrite an existing test-owned `.taz` file.
- [ ] 1.2.3.8 Save As to a unique test-owned `.taz` file without modifying the source board.
- [ ] 1.2.3.9 Preserve board ranges, panels, `TAG` series, editor settings, and markup.
- [ ] 1.2.3.10 Preserve the visible range only when that option is enabled.
- [ ] 1.2.3.11 Reopen a saved board and reproduce its previous runtime configuration.
- [ ] 1.2.3.12 Load a supported legacy TAZ version through migration.
- [ ] 1.2.3.13 Reject a malformed file without crashing the application.
- [ ] 1.2.3.14 Show success notifications for save and file-tree refresh operations.
- [ ] 1.2.3.15 Show failure notifications for save and file-tree refresh operations.
- [ ] 1.2.3.16 Preserve unique panel identities and saved-versus-unsaved state.
- [ ] 1.2.3.17 Upgrade a migrated legacy board to the current format when it is saved.
- [ ] 1.2.3.18 Button - Cancel Save As without saving.
- [ ] 1.2.3.19 Keep two differently configured test-owned TAZ files isolated while repeatedly switching between them.
- [ ] 1.2.3.20 Delete both test-owned TAZ files through the file-tree confirmation flow.

### 1.2.4 Overlap

- [ ] 1.2.4.1 Enable Overlap only when compatible panels are selected.
- [ ] 1.2.4.2 Explain why incompatible panel selections cannot be overlapped.
- [ ] 1.2.4.3 Button - Open the Overlap modal.
- [ ] 1.2.4.4 Button - Close the Overlap modal.
- [ ] 1.2.4.5 Render all selected `TAG` series in the overlap chart.
- [ ] 1.2.4.6 Button - Refresh overlap data.
- [ ] 1.2.4.7 Button - Shift altered ranges left using each supported time unit.
- [ ] 1.2.4.8 Button - Shift altered ranges right using each supported time unit.
- [ ] 1.2.4.9 Input - Validate overlap shift values and show failures as toasts.
- [ ] 1.2.4.10 Preserve the configured Y-axis behavior and zero inclusion.
- [ ] 1.2.4.11 Handle loading, empty, cancelled, and failed overlap requests.
- [ ] 1.2.4.12 Open Overlap with one numeric panel.
- [ ] 1.2.4.13 Open Overlap with one time panel.
- [ ] 1.2.4.14 Open Overlap with multiple numeric panels.
- [ ] 1.2.4.15 Open Overlap with multiple time panels.
- [ ] 1.2.4.16 Chart drag - Pan a numeric overlap chart.
- [ ] 1.2.4.17 Chart drag - Pan a time overlap chart.
- [ ] 1.2.4.18 Mouse wheel - Zoom a numeric overlap chart in and out.
- [ ] 1.2.4.19 Mouse wheel - Zoom a time overlap chart in and out.
- [ ] 1.2.4.20 Reject a time panel when numeric panels are selected.
- [ ] 1.2.4.21 Reject a numeric panel when time panels are selected.
- [ ] 1.2.4.22 Reject panels without a loaded chart range.
- [ ] 1.2.4.23 Disable Overlap after the final selected panel is removed.

## 1.3 Add Panel Modal

### 1.3.1 Modal and Chart Setup

- [ ] 1.3.1.1 Button - Open the New Chart modal.
- [ ] 1.3.1.2 Button - Close the New Chart modal.
- [ ] 1.3.1.3 Input - Enter and preserve the chart name, including blank-name fallback behavior.
- [ ] 1.3.1.4 Button set - Select Line, Dot, and Zone chart types.

### 1.3.2 Data and Series

- [ ] 1.3.2.1 Dropdown - Select `TAG` as the table.
- [ ] 1.3.2.2 Dropdowns - Select name, time, and value source columns.
- [ ] 1.3.2.3 Button - Search for tags.
- [ ] 1.3.2.4 Keyboard - Search for tags with Enter.
- [ ] 1.3.2.5 Pagination buttons - Navigate tag search results.
- [ ] 1.3.2.6 Button - Add a `TAG` series.
- [ ] 1.3.2.7 Button - Remove a `TAG` series.
- [ ] 1.3.2.8 Keyboard - Remove a `TAG` series.
- [ ] 1.3.2.9 Button - Clear all selected `TAG` series.
- [ ] 1.3.2.10 Prevent duplicate series.
- [ ] 1.3.2.11 Enforce the 12-series limit.
- [ ] 1.3.2.12 Dropdown - Select a calculation mode.
- [ ] 1.3.2.13 Detect rollup availability.

### 1.3.3 Validation and Submission

- [ ] 1.3.3.1 Validate required table, column, tag, and JSON-key selections.
- [ ] 1.3.3.2 Reject incompatible mixtures of datetime and numeric X-axis series.
- [ ] 1.3.3.3 Button - Apply the modal and create the configured panel.
- [ ] 1.3.3.4 Button - Cancel without creating or changing a panel.

## 1.4 Panel

### 1.4.1 Panel Header

- [ ] 1.4.1.1 Display the visible range.
- [ ] 1.4.1.2 Display the calculated interval.
- [ ] 1.4.1.3 Button - Start renaming from the panel title.
- [ ] 1.4.1.4 Keyboard - Commit a rename with Enter.
- [ ] 1.4.1.5 Input - Commit a rename on blur.
- [ ] 1.4.1.6 Keyboard - Cancel a rename with Escape.
- [ ] 1.4.1.7 Menu item - Reload panel data.
- [ ] 1.4.1.8 Button - Refresh the panel time range.
- [ ] 1.4.1.9 Menu item - Expand the panel to its full data range.
- [ ] 1.4.1.10 Menu item - Set the panel range as the global time range.
- [ ] 1.4.1.11 Toolbar button - Open panel actions.
- [ ] 1.4.1.12 More button - Open panel actions.
- [ ] 1.4.1.13 Extra button - Open panel actions.
- [ ] 1.4.1.14 Context menu - Open panel actions.
- [ ] 1.4.1.15 Menu item - Export panel data as CSV when available.
- [ ] 1.4.1.16 Panel action - Delete a panel through its confirmation flow.
- [ ] 1.4.1.17 Toggle button - Add the panel to the current overlap selection.
- [ ] 1.4.1.18 Toggle button - Remove the panel from the current overlap selection.

### 1.4.2 Panel Chart

#### 1.4.2.1 Display and Runtime

- [ ] 1.4.2.1.1 Render loading, populated, empty-data, and error states.
- [ ] 1.4.2.1.2 Render configured series, colors, legend, axes, and chart type.
- [ ] 1.4.2.1.3 Button - Switch from calculated data to raw data.
- [ ] 1.4.2.1.4 Button - Switch from raw data to calculated data.
- [ ] 1.4.2.1.5 Preserve enabled chart interactions after a data refresh.
- [ ] 1.4.2.1.6 Show no-data, warning, and incompatible-axis notices.

#### 1.4.2.2 Main Chart Navigation

- [ ] 1.4.2.2.1 Mouse wheel - Zoom in.
- [ ] 1.4.2.2.2 Mouse wheel - Zoom out.
- [ ] 1.4.2.2.3 Chart drag - Zoom into the selected range.
- [ ] 1.4.2.2.4 Retain drag-zoom mode after chart data reloads.
- [ ] 1.4.2.2.5 Disable wheel zoom when Use Zoom is disabled.
- [ ] 1.4.2.2.6 Disable drag zoom when Use Zoom is disabled.
- [ ] 1.4.2.2.7 Button - Shift the main chart backward.
- [ ] 1.4.2.2.8 Button - Shift the main chart forward.
- [ ] 1.4.2.2.9 Handle full-range, single-point, empty, and out-of-bounds data safely.

#### 1.4.2.3 Hover Button Set

- [ ] 1.4.2.3.1 Button - Zoom in by a small step.
- [ ] 1.4.2.3.2 Button - Zoom out by a small step.
- [ ] 1.4.2.3.3 Button - Zoom in by a large step.
- [ ] 1.4.2.3.4 Button - Zoom out by a large step.
- [ ] 1.4.2.3.5 Button - Focus the navigator around the visible main-chart range.

#### 1.4.2.4 Navigator Chart

- [ ] 1.4.2.4.1 Button - Shift the navigator backward.
- [ ] 1.4.2.4.2 Button - Shift the navigator forward.
- [ ] 1.4.2.4.3 Chart drag - Move the navigator start handle and update the main-chart range.
- [ ] 1.4.2.4.4 Chart drag - Move the navigator end handle and update the main-chart range.
- [ ] 1.4.2.4.5 Range label - Enter a navigator range from the start.
- [ ] 1.4.2.4.6 Range label - Enter a navigator range from the end.
- [ ] 1.4.2.4.7 Keep main-chart, navigator, panel, board, and global ranges synchronized.
- [ ] 1.4.2.4.8 Enforce the navigator selection's minimum displayed width after button and drag zoom.

### 1.4.3 Panel Editor

#### 1.4.3.1 Editor Lifecycle

- [ ] 1.4.3.1.1 Button - Open the editor without applying changes.
- [ ] 1.4.3.1.2 Button - Close the editor without applying changes.
- [ ] 1.4.3.1.3 Button - Apply valid changes.
- [ ] 1.4.3.1.4 Block Apply when values are invalid.
- [ ] 1.4.3.1.5 Preserve applied editor changes when the board is saved and reopened.

#### 1.4.3.2 General Tab

- [ ] 1.4.3.2.1 Input - Edit the panel title.
- [ ] 1.4.3.2.2 Checkbox - Configure drag zoom.
- [ ] 1.4.3.2.3 Checkbox - Configure raw data ordering.
- [ ] 1.4.3.2.4 Checkbox - Configure whether the visible range is saved.
- [ ] 1.4.3.2.5 Checkbox - Configure value normalization.

#### 1.4.3.3 Data Tab

- [ ] 1.4.3.3.1 Button - Add a `TAG` series.
- [ ] 1.4.3.3.2 Edit a `TAG` series.
- [ ] 1.4.3.3.3 Button - Remove a `TAG` series.
- [ ] 1.4.3.3.4 Reorder `TAG` series.
- [ ] 1.4.3.3.5 Input - Alias a `TAG` series.
- [ ] 1.4.3.3.6 Color picker - Recolor a `TAG` series.
- [ ] 1.4.3.3.7 Dropdown - Change the calculation mode.
- [ ] 1.4.3.3.8 Dropdown - Change the secondary-axis assignment.

#### 1.4.3.4 Data Setting Tab

- [ ] 1.4.3.4.1 Inputs - Configure calculated chart and navigator density.
- [ ] 1.4.3.4.2 Inputs - Configure raw main-chart and navigator sampling.
- [ ] 1.4.3.4.3 Show current query, point, and pixel metrics.

#### 1.4.3.5 Axes Tab

- [ ] 1.4.3.5.1 Checkboxes - Toggle X-axis and Y-axis tick lines.
- [ ] 1.4.3.5.2 Inputs - Configure left and right Y-axis ranges and zero base.
- [ ] 1.4.3.5.3 Controls - Enable the right Y-axis and copy left-axis settings.
- [ ] 1.4.3.5.4 Inputs - Configure upper and lower control limits.

#### 1.4.3.6 Display Tab

- [ ] 1.4.3.6.1 Button set - Select Line, Dot, Zone, and Custom chart styles.
- [ ] 1.4.3.6.2 Controls - Configure points, legend, null connections, radius, fill, and stroke.

#### 1.4.3.7 Panel Range Tab

- [ ] 1.4.3.7.1 Range inputs - Apply absolute, relative, quick, and empty ranges.

### 1.4.4 Panel Tools

#### 1.4.4.1 Highlights

- [x] 1.4.4.1.1 Menu item - Enable highlight mode.
- [ ] 1.4.4.1.2 Menu item - Disable highlight mode.
- [x] 1.4.4.1.3 Chart drag - Create a highlight.
- [x] 1.4.4.1.4 Edit a highlight.
- [x] 1.4.4.1.5 Button - Delete a highlight.
- [x] 1.4.4.1.6 Input - Validate the highlight start value.
- [x] 1.4.4.1.7 Input - Validate the highlight end value.
- [x] 1.4.4.1.8 Input - Change the highlight label.
- [x] 1.4.4.1.9 Color picker - Change the highlight fill color.
- [x] 1.4.4.1.10 Color picker - Change the highlight text color.

#### 1.4.4.2 Annotations

- [x] 1.4.4.2.1 Menu item - Enable annotation mode.
- [ ] 1.4.4.2.2 Menu item - Disable annotation mode.
- [x] 1.4.4.2.3 Chart click - Create an annotation.
- [x] 1.4.4.2.4 Edit an annotation.
- [x] 1.4.4.2.5 Button - Delete an annotation.
- [x] 1.4.4.2.6 Dropdown - Select the annotation series.
- [x] 1.4.4.2.7 Input - Validate the annotation time or axis value.
- [x] 1.4.4.2.8 Input - Change the annotation text.
- [x] 1.4.4.2.9 Color picker - Change the annotation colors.
- [x] 1.4.4.2.10 Checkbox - Configure clip-to-range.

#### 1.4.4.3 Markup Apply and Persistence

- [x] 1.4.4.3.1 Keyboard - Apply markup with Enter.
- [x] 1.4.4.3.2 Keyboard - Cancel markup with Escape.
- [ ] 1.4.4.3.3 Persist highlights after saving.
- [ ] 1.4.4.3.4 Persist annotations after saving.

#### 1.4.4.4 Range Selection

- [ ] 1.4.4.4.1 Button - Enable data-range selection mode.
- [ ] 1.4.4.4.2 Button - Disable data-range selection mode.
- [ ] 1.4.4.4.3 Chart drag - Select a data range.
- [ ] 1.4.4.4.4 Open the Selection Summary.
- [ ] 1.4.4.4.5 Show the selected range and per-series minimum, maximum, and average.
- [ ] 1.4.4.4.6 Show an error when the selected area contains no data.

#### 1.4.4.5 FFT

- [ ] 1.4.4.5.1 Button - Open the FFT modal from the Selection Summary.
- [ ] 1.4.4.5.2 Button - Close the FFT modal.
- [ ] 1.4.4.5.3 Dropdown - Select a `TAG` series for FFT.
- [ ] 1.4.4.5.4 Render the 2D FFT chart.
- [ ] 1.4.4.5.5 Render the 3D FFT chart.
- [ ] 1.4.4.5.6 Input - Validate the minimum frequency.
- [ ] 1.4.4.5.7 Input - Validate the maximum frequency.
- [ ] 1.4.4.5.8 Input - Validate the 3D interval value.
- [ ] 1.4.4.5.9 Dropdown - Validate the 3D interval unit.
- [ ] 1.4.4.5.10 Reload FFT only after Apply when series, dimension, or values change.
- [ ] 1.4.4.5.11 Cancel superseded FFT requests.
- [ ] 1.4.4.5.12 Display backend FFT error reasons.
- [ ] 1.4.4.5.13 Disable FFT for numeric X-axis panels.
- [ ] 1.4.4.5.14 Disable FFT unless the panel is in raw mode.
- [ ] 1.4.4.5.15 Reject non-finite or negative frequency values.
- [ ] 1.4.4.5.16 Reject a minimum frequency greater than the maximum.
- [ ] 1.4.4.5.17 Reject a non-positive 3D interval.

## 1.5 Accessibility

- [ ] 1.5.1 Verify roles, labels, and accessible names after locating regular controls through stable test IDs and menu actions by `button` role and accessible name.
- [ ] 1.5.2 Expose dialogs correctly.
- [ ] 1.5.3 Expose temporary toasts with status semantics.
- [ ] 1.5.4 Expose disabled states correctly.
- [ ] 1.5.5 Expose pressed states correctly.
- [ ] 1.5.6 Support keyboard navigation.
- [ ] 1.5.7 Support Enter actions.
- [ ] 1.5.8 Support Escape actions.
- [ ] 1.5.9 Support the save keyboard shortcut.
