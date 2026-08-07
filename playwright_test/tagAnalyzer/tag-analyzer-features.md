# 1. TagAnalyzer

## 1.1 Meta

- [ ] 1.1.1 Use `MACHROLL` with the `pneumatic` tag for every data-backed test.
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
- [ ] 1.2.2.5 Reject an invalid board range with the correct toast.
- [ ] 1.2.2.6 Button set - Switch between datetime and numeric board ranges.

### 1.2.3 Save and Persistence

- [ ] 1.2.3.1 Button - Save from the toolbar.
- [ ] 1.2.3.2 Keyboard shortcut - Save the board.
- [ ] 1.2.3.3 Button - Open Save As.
- [ ] 1.2.3.4 Directory list - Navigate directories in Save As.
- [ ] 1.2.3.5 Input - Validate the Save As filename.
- [ ] 1.2.3.6 Button - Confirm overwriting from Save As.
- [ ] 1.2.3.7 Button - Save and overwrite an existing `.taz` file.
- [ ] 1.2.3.8 Save As without modifying the original file.
- [ ] 1.2.3.9 Preserve board ranges, panels, `MACHROLL` series, editor settings, and markup.
- [ ] 1.2.3.10 Preserve the visible range only when that option is enabled.
- [ ] 1.2.3.11 Reopen a saved board and reproduce its previous runtime configuration.
- [ ] 1.2.3.12 Load a supported legacy TAZ version through migration.
- [ ] 1.2.3.13 Reject a malformed file without crashing the application.
- [ ] 1.2.3.14 Show success notifications for save and file-tree refresh operations.
- [ ] 1.2.3.15 Show failure notifications for save and file-tree refresh operations.
- [ ] 1.2.3.16 Preserve unique panel identities and saved-versus-unsaved state.
- [ ] 1.2.3.17 Upgrade a migrated legacy board to the current format when it is saved.
- [ ] 1.2.3.18 Button - Cancel Save As without saving.

### 1.2.4 Overlap

- [ ] 1.2.4.1 Enable Overlap only when compatible panels are selected.
- [ ] 1.2.4.2 Explain why incompatible panel selections cannot be overlapped.
- [ ] 1.2.4.3 Button - Open the Overlap modal.
- [ ] 1.2.4.4 Button - Close the Overlap modal.
- [ ] 1.2.4.5 Render all selected `MACHROLL` series in the overlap chart.
- [ ] 1.2.4.6 Button - Refresh overlap data.
- [ ] 1.2.4.7 Button - Shift altered ranges left using each supported time unit.
- [ ] 1.2.4.8 Button - Shift altered ranges right using each supported time unit.
- [ ] 1.2.4.9 Input - Validate overlap shift values and show failures as toasts.
- [ ] 1.2.4.10 Preserve the configured Y-axis behavior and zero inclusion.
- [ ] 1.2.4.11 Handle loading, empty, cancelled, and failed overlap requests.

## 1.3 Add Panel Modal

### 1.3.1 Modal and Chart Setup

- [ ] 1.3.1.1 Button - Open the New Chart modal.
- [ ] 1.3.1.2 Button - Close the New Chart modal.
- [ ] 1.3.1.3 Input - Enter and preserve the chart name, including blank-name fallback behavior.
- [ ] 1.3.1.4 Button set - Select Line, Dot, and Zone chart types.

### 1.3.2 Data and Series

- [ ] 1.3.2.1 Dropdown - Select `MACHROLL` as the table.
- [ ] 1.3.2.2 Dropdowns - Select name, time, and value source columns.
- [ ] 1.3.2.3 Button - Search for tags.
- [ ] 1.3.2.4 Keyboard - Search for tags with Enter.
- [ ] 1.3.2.5 Pagination buttons - Navigate tag search results.
- [ ] 1.3.2.6 Button - Add a `MACHROLL` series.
- [ ] 1.3.2.7 Button - Remove a `MACHROLL` series.
- [ ] 1.3.2.8 Keyboard - Remove a `MACHROLL` series.
- [ ] 1.3.2.9 Button - Clear all selected `MACHROLL` series.
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

#### 1.4.3.3 Data Tab

- [ ] 1.4.3.3.1 Button - Add a `MACHROLL` series.
- [ ] 1.4.3.3.2 Edit a `MACHROLL` series.
- [ ] 1.4.3.3.3 Button - Remove a `MACHROLL` series.
- [ ] 1.4.3.3.4 Reorder `MACHROLL` series.
- [ ] 1.4.3.3.5 Input - Alias a `MACHROLL` series.
- [ ] 1.4.3.3.6 Color picker - Recolor a `MACHROLL` series.
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

- [ ] 1.4.4.1.1 Menu item - Enable highlight mode.
- [ ] 1.4.4.1.2 Menu item - Disable highlight mode.
- [ ] 1.4.4.1.3 Chart drag - Create a highlight.
- [ ] 1.4.4.1.4 Edit a highlight.
- [ ] 1.4.4.1.5 Button - Delete a highlight.
- [ ] 1.4.4.1.6 Input - Validate the highlight start value.
- [ ] 1.4.4.1.7 Input - Validate the highlight end value.
- [ ] 1.4.4.1.8 Input - Change the highlight label.
- [ ] 1.4.4.1.9 Color picker - Change the highlight fill color.
- [ ] 1.4.4.1.10 Color picker - Change the highlight text color.

#### 1.4.4.2 Annotations

- [ ] 1.4.4.2.1 Menu item - Enable annotation mode.
- [ ] 1.4.4.2.2 Menu item - Disable annotation mode.
- [ ] 1.4.4.2.3 Chart click - Create an annotation.
- [ ] 1.4.4.2.4 Edit an annotation.
- [ ] 1.4.4.2.5 Button - Delete an annotation.
- [ ] 1.4.4.2.6 Dropdown - Select the annotation series.
- [ ] 1.4.4.2.7 Input - Validate the annotation time or axis value.
- [ ] 1.4.4.2.8 Input - Change the annotation text.
- [ ] 1.4.4.2.9 Color picker - Change the annotation colors.
- [ ] 1.4.4.2.10 Checkbox - Configure clip-to-range.

#### 1.4.4.3 Markup Apply and Persistence

- [ ] 1.4.4.3.1 Keyboard - Apply markup with Enter.
- [ ] 1.4.4.3.2 Keyboard - Cancel markup with Escape.
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
- [ ] 1.4.4.5.3 Dropdown - Select a `MACHROLL` series for FFT.
- [ ] 1.4.4.5.4 Render the 2D FFT chart.
- [ ] 1.4.4.5.5 Render the 3D FFT chart.
- [ ] 1.4.4.5.6 Input - Validate the minimum frequency.
- [ ] 1.4.4.5.7 Input - Validate the maximum frequency.
- [ ] 1.4.4.5.8 Input - Validate the 3D interval value.
- [ ] 1.4.4.5.9 Dropdown - Validate the 3D interval unit.
- [ ] 1.4.4.5.10 Reload FFT only after Apply when series, dimension, or values change.
- [ ] 1.4.4.5.11 Cancel superseded FFT requests.
- [ ] 1.4.4.5.12 Display backend FFT error reasons.
- [ ] 1.4.4.5.13 Disable 3D FFT for numeric X-axis panels.

## 1.5 Accessibility

- [ ] 1.5.1 Locate controls through roles, labels, and accessible names.
- [ ] 1.5.2 Expose dialogs correctly.
- [ ] 1.5.3 Expose temporary toasts with status semantics.
- [ ] 1.5.4 Expose disabled states correctly.
- [ ] 1.5.5 Expose pressed states correctly.
- [ ] 1.5.6 Support keyboard navigation.
- [ ] 1.5.7 Support Enter actions.
- [ ] 1.5.8 Support Escape actions.
- [ ] 1.5.9 Support the save keyboard shortcut.
