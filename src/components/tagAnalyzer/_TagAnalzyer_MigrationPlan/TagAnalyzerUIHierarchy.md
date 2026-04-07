# TagAnalyzer UI Structure

Current scope: `src/components/tagAnalyzer`

This is the rendered UI hierarchy for TagAnalyzer, based only on the components under this folder.
The shared board time-range modal is triggered from here, but its implementation lives outside this folder, so it is listed as an external dependency only.

```text
TagAnalyzer
|-- State A: Board View
|   |-- Page Header
|   |   \-- Board Toolbar
|   |       |-- Time range button
|   |       |-- Refresh data
|   |       |-- Refresh time
|   |       |-- Save
|   |       |-- Save as
|   |       \-- Overlap chart button
|   |-- Page Body
|   |   |-- TagAnalyzerBoard
|   |   |   \-- Repeating PanelBoardChart (one per panel)
|   |   |       |-- Panel Header
|   |   |       |   |-- Title / overlap toggle
|   |   |       |   |   \-- Anchor flag appears on the first selected overlap panel
|   |   |       |   |-- Current visible time range
|   |   |       |   |-- Interval text
|   |   |       |   \-- Action buttons
|   |   |       |       |-- Raw mode toggle
|   |   |       |       |-- Drag-select toggle
|   |   |       |       |-- FFT button
|   |   |       |       |-- Set global time
|   |   |       |       |-- Refresh data
|   |   |       |       |-- Refresh time
|   |   |       |       |-- Edit
|   |   |       |       |-- Save to local
|   |   |       |       \-- Delete
|   |   |       |-- Panel Body
|   |   |       |   |-- Left range-shift button
|   |   |       |   |-- Main chart area
|   |   |       |   |   |-- Main chart
|   |   |       |   |   \-- Navigator / overview chart
|   |   |       |   \-- Right range-shift button
|   |   |       |-- Drag-selection popover
|   |   |       |   |-- Close button
|   |   |       |   |-- Selected start/end timestamps
|   |   |       |   |-- Duration
|   |   |       |   \-- Stats table
|   |   |       |       |-- name
|   |   |       |       |-- min
|   |   |       |       |-- max
|   |   |       |       \-- avg
|   |   |       |-- FFT modal
|   |   |       \-- Panel Footer
|   |   |           |-- Navigator start time + shift left
|   |   |           |-- Zoom / focus controls
|   |   |           |   |-- Zoom in x4
|   |   |           |   |-- Zoom in x2
|   |   |           |   |-- Focus
|   |   |           |   |-- Zoom out x2
|   |   |           |   \-- Zoom out x4
|   |   |           \-- Navigator end time + shift right
|   |   \-- Add Panel Block
|   |       \-- Full-width "New Chart" button
|   |-- Modal: New Chart
|   |   |-- Table dropdown
|   |   |-- Chart type picker
|   |   |   |-- Zone
|   |   |   |-- Dot
|   |   |   \-- Line
|   |   |-- Tag search input
|   |   |-- Available tags list
|   |   |-- Pagination
|   |   |-- Selected tags list
|   |   |   |-- Tag label
|   |   |   \-- Calculation mode dropdown
|   |   \-- Footer actions
|   |       |-- Apply
|   |       \-- Cancel
|   |-- Modal: Overlap Chart
|   |   |-- Refresh button
|   |   |-- Shared overlap chart
|   |   \-- Per-series offset rows
|   |       |-- Color swatch
|   |       |-- Series label
|   |       |-- Current compared time window
|   |       \-- Shift controls
|   |           |-- Shift left
|   |           |-- Amount input
|   |           |-- Unit selector
|   |           \-- Shift right
|   \-- External shared modal opened from this view
|       \-- Board time-range modal
\-- State B: Panel Editor View
    |-- Editor Header
    |   |-- Back
    |   |-- Discard
    |   |-- Apply
    |   \-- Save
    |-- Live Preview Pane
    |   \-- Preview Panel Card
    |       |-- Preview Header
    |       |   |-- Title
    |       |   |-- Current visible time range
    |       |   |-- Interval text
    |       |   \-- Action buttons
    |       |       |-- Raw mode toggle
    |       |       |-- Refresh data
    |       |       \-- Refresh time
    |       |-- Preview Body
    |       |   |-- Left range-shift button
    |       |   |-- Preview chart + navigator
    |       |   \-- Right range-shift button
    |       \-- Preview Footer
    |           |-- Navigator start/end time
    |           \-- Zoom / focus controls
    |-- Divider
    \-- Settings Pane
        |-- Tab strip
        |   |-- General
        |   |-- Data
        |   |-- Axes
        |   |-- Display
        |   \-- Time
        \-- Active tab content
            |-- General
            |   |-- Chart title
            |   |-- Use zoom when dragging
            |   \-- Keep navigator position
            |-- Data
            |   |-- Repeating tag cards
            |   |   |-- Calculation mode
            |   |   |-- Tag name
            |   |   |-- Alias
            |   |   |-- Color picker
            |   |   \-- Remove tag
            |   |-- Add tag button
            |   \-- Modal: Add Tag
            |       |-- Table dropdown
            |       |-- Tag search input
            |       |-- Available tags list
            |       |-- Pagination
            |       |-- Selected tags list
            |       \-- Footer actions
            |           |-- OK
            |           \-- Cancel
            |-- Axes
            |   |-- X-Axis section
            |   |   |-- Show X tick line
            |   |   |-- Pixels per tick: Raw
            |   |   |-- Pixels per tick: Calculation
            |   |   \-- Sampling toggle + value
            |   |-- Y-Axis section
            |   |   |-- Zero-base toggle
            |   |   |-- Show Y tick line
            |   |   |-- Custom scale
            |   |   |-- Raw custom scale
            |   |   \-- UCL / LCL controls
            |   \-- Additional Y-Axis section
            |       |-- Enable Y2
            |       |-- Zero-base / tick-line controls
            |       |-- Custom scale
            |       |-- Raw custom scale
            |       |-- UCL / LCL controls
            |       \-- Tag assignment list for Y2
            |-- Display
            |   |-- Chart type thumbnails
            |   |   |-- Zone
            |   |   |-- Dot
            |   |   \-- Line
            |   |-- Show points
            |   |-- Show legend
            |   |-- Point radius
            |   |-- Fill opacity
            |   \-- Line thickness
            \-- Time
                |-- From date/time picker
                |-- To date/time picker
                |-- Quick ranges
                \-- Clear custom time
```

## UI Notes

- Selecting a panel for overlap highlights its border, and the first selected panel becomes the overlap anchor.
- Overlap selection is only available for single-tag panels.
- Opening the editor replaces the normal board view with a full-screen editing workspace.
