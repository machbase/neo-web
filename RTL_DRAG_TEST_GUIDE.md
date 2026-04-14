# RTL Drag Test Guide

This is the simplest way to test drag behavior with `Jest + React Testing Library` in this repo.

Use this when:

- you want to test React drag state
- you want to test that a drag callback fires
- you do not need a real browser

Do not use this for:

- exact chart pixels
- real canvas drawing behavior
- browser-specific pointer quirks

For those, use `Playwright`.

## The main idea

An RTL drag test is usually just three events in order:

1. `mouseDown`
2. `mouseMove`
3. `mouseUp`

Then you assert:

- visible text changed
- state-driven UI changed
- a callback was called with the expected value

## Simple component example

This component tracks how far the mouse moved on the x-axis and reports the final drag amount.

```tsx
import { useState } from 'react';

type DragSliderProps = {
    onDragEnd?: (deltaX: number) => void;
};

export default function DragSlider({ onDragEnd }: DragSliderProps) {
    const [startX, setStartX] = useState<number | null>(null);
    const [deltaX, setDeltaX] = useState(0);

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        setStartX(event.clientX);
        setDeltaX(0);
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (startX === null) return;
        setDeltaX(event.clientX - startX);
    };

    const handleMouseUp = () => {
        if (startX === null) return;
        onDragEnd?.(deltaX);
        setStartX(null);
    };

    return (
        <div>
            <div
                data-testid="drag-slider"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                Drag me
            </div>
            <div data-testid="drag-value">{deltaX}</div>
        </div>
    );
}
```

## Matching RTL test

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import DragSlider from './DragSlider';

describe('DragSlider', () => {
    it('updates the drag value and calls onDragEnd', () => {
        const onDragEnd = jest.fn();

        render(<DragSlider onDragEnd={onDragEnd} />);

        const slider = screen.getByTestId('drag-slider');

        fireEvent.mouseDown(slider, { clientX: 10 });
        fireEvent.mouseMove(slider, { clientX: 40 });

        expect(screen.getByTestId('drag-value')).toHaveTextContent('30');

        fireEvent.mouseUp(slider);

        expect(onDragEnd).toHaveBeenCalledWith(30);
    });
});
```

## How it works

### `mouseDown`

```tsx
fireEvent.mouseDown(slider, { clientX: 10 });
```

This simulates pressing the mouse at x = `10`.

The component stores that value in state as the drag start point.

### `mouseMove`

```tsx
fireEvent.mouseMove(slider, { clientX: 40 });
```

This simulates moving the mouse to x = `40`.

The component calculates:

```ts
40 - 10 = 30
```

That `30` becomes the new visible value.

### `mouseUp`

```tsx
fireEvent.mouseUp(slider);
```

This ends the drag and calls the callback with the final drag distance.

## Why this works in RTL

`Jest` runs in `jsdom`, not a real browser.

That means:

- there is no real layout engine
- there is no real mouse cursor
- there is no real drag physics

So in RTL, you do not "drag visually".

Instead, you manually send the event data the component needs:

- `clientX`
- `clientY`
- button state if needed

The test passes because your component logic reads those event values and updates React state.

## The key rule

Test the result of the drag, not the implementation details.

Good assertions:

- displayed drag value changed
- `onDragEnd` was called
- "Zoom active" text appeared
- selected range text changed

Avoid:

- checking internal React state directly
- checking random DOM details that users do not see

## Real-world variation: window-level drag

Many real drag components attach `mousemove` and `mouseup` to `window`, not the dragged element.

If your component does that, fire the later events on `window`:

```tsx
fireEvent.mouseDown(slider, { clientX: 10 });
fireEvent.mouseMove(window, { clientX: 40 });
fireEvent.mouseUp(window);
```

That is often closer to how production drag code works.

## How this maps to chart zoom

For a normal draggable React component, test the real mouse sequence:

- `mouseDown`
- `mouseMove`
- `mouseUp`

For an ECharts zoom in this repo, the simplest RTL test is usually different.

You usually:

1. render the chart component
2. mock `echarts-for-react`
3. trigger the chart event directly
4. assert the zoom callback

That pattern already exists in:

- [PanelChart.test.tsx](c:\_github_repos\neo-web\src\components\tagAnalyzer\panel\PanelChart.test.tsx)

Example idea:

```tsx
latestChartProps.onEvents.brushEnd?.({
    areas: [{ coordRange: [120, 180] }],
});

expect(props.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
    min: 120,
    max: 180,
    trigger: 'brushZoom',
});
```

That is still a valid RTL test. You are testing the React behavior after the drag-like chart event, not the browser's real dragging.

## How to write one yourself

Follow this order:

1. Find the event that represents the drag.
2. Decide what user-visible result should change.
3. Render the component.
4. Fire `mouseDown`, `mouseMove`, and `mouseUp`.
5. Assert the visible result or callback.

## Best first test to write

If you are new to drag testing, start with this kind of assertion:

- "after dragging from `10` to `40`, the label shows `30`"

That is much easier than starting with a real chart.

After that, move to:

- "after `brushEnd`, the zoom callback gets the expected range"

Then only later add:

- a real Playwright drag test

## Commands

Run all Jest tests:

```bash
npm test
```

Run one test file:

```bash
npm test -- src/components/tagAnalyzer/panel/PanelChart.test.tsx
```

## Short summary

- RTL drag tests are event-sequence tests.
- You fake the mouse events yourself.
- You pass `clientX` and `clientY` manually.
- You assert the visible result or callback.
- For charts, RTL usually tests the chart event handling, while Playwright tests the real drag in the browser.
