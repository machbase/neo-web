# TagAnalyzer Zoom Feature

## What this feature does

TagAnalyzer zoom lets a user narrow the visible time range of a chart so they can inspect a smaller part of the data in more detail.

The feature supports two zoom inputs:

- Drag across the main chart to zoom into a selected time window.
- Use the bottom slider to move or resize the visible time window.

Both inputs lead to the same result: the panel updates its visible range and reloads data for that range when needed.

## When drag zoom is active

Drag zoom is available only when the user has enabled **Use Zoom when dragging**.

Drag zoom is turned off while drag-select mode is active. This is intentional because the same left-drag gesture cannot safely mean both:

- "zoom into this time range"
- "select this time range for another action"

So the feature uses a simple rule:

- Normal drag mode means zoom.
- Drag-select mode means selection.

## How drag zoom works

When drag zoom is active, the user interaction works like this:

1. The user presses and drags horizontally on the main chart.
2. The chart shows a temporary highlighted range as a preview.
3. The chart does not commit the zoom while the mouse is still moving.
4. When the user releases the mouse, the selected range becomes the new visible time window.
5. The temporary highlight is cleared.
6. The panel updates itself to that new time range and loads any data needed for the zoomed view.

This release-to-commit behavior is important. It keeps the interaction predictable and avoids repeated partial updates while the user is still dragging.

## How slider zoom works

The bottom slider is a second zoom control. It acts as an overview navigator for the full time range.

The user can:

- move the window to pan through time
- resize the window to zoom in or out

Even though the slider feels different from dragging directly on the chart, it still produces the same kind of output: a new visible time range.

## Shared internal model

The core implementation idea is simple:

- every zoom interaction is converted into a time range
- that time range becomes the panel's next visible range
- the chart and data reload logic stay synchronized to that range

So there are two input methods, but only one final zoom result.

You can think of it like this:

1. The user describes a time window.
2. The system converts that input into a concrete start time and end time.
3. The panel adopts that range as the new viewport.
4. The chart redraws and the data layer refreshes if the new range requires it.

## Why drag zoom and slider zoom stay consistent

The main chart drag and the bottom slider enter through different interaction paths, but they are normalized into the same range update flow.

That gives the feature a few useful properties:

- zoom behavior stays consistent no matter how the user changes the range
- data loading logic only needs one mental model
- the chart view and panel state stay aligned after each zoom

## Right-click behavior

Right-click on the chart should open the panel context menu, not start a zoom gesture.

To support that behavior, the chart blocks right-button drag-start on the chart surface while still allowing the normal context menu event to continue.

In practice, that means:

- left-drag can start zoom
- right-click still opens the menu
- nearby non-chart controls are not affected

## Mental model for readers

If someone is new to this feature, the easiest way to understand it is:

- Zoom is just "choose a smaller visible time window."
- The user can choose that window by dragging on the chart or by adjusting the slider.
- The system waits until the interaction is finished, then applies the new range.
- Once the new range is applied, the chart view and backing data are refreshed to match it.
