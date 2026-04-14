# Zoom Test Guide

This repo already uses:

- `Jest` for unit and component tests
- `React Testing Library` for React behavior in `jsdom`
- `Playwright` for browser tests in `playwright_test/`

## Quick choice

- Use `Jest` for zoom math and range helpers.
- Use `RTL + Jest` for React behavior around zoom events.
- Use `Playwright` for a real drag-to-zoom flow in the browser.

## Where to put the test

- `Jest` / `RTL`: next to the chart file, for example `src/components/tagAnalyzer/panel/PanelChart.test.tsx`
- `Playwright`: inside `playwright_test/`

## What to test for zoom

Good zoom assertions:

- the visible range changes
- the zoom callback fires with a narrower range
- a reset control appears
- loading starts and then finishes

Avoid:

- exact pixels
- every plotted value
- ECharts internal DOM details

## Simple Playwright zoom test

Use this when you want to test a real user drag in a real browser.

### Before writing the test

Make sure the page exposes stable selectors such as:

- `data-testid="panel-chart"`
- `data-testid="panel-range-label"`

If the chart is canvas-based, Playwright will drag by coordinates inside the chart box.

### Example

Create `playwright_test/panel-zoom.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('dragging on the chart zooms the range', async ({ page }) => {
    await page.goto('http://127.0.0.1:7777');

    const chart = page.getByTestId('panel-chart');
    const box = await chart.boundingBox();
    if (!box) throw new Error('Chart not visible');

    const startX = box.x + box.width * 0.2;
    const endX = box.x + box.width * 0.7;
    const y = box.y + box.height * 0.5;

    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByTestId('panel-range-label')).not.toHaveText('Original range');
});
```

### Run it

Start the app:

```bash
npm run dev
```

Run Playwright:

```bash
npm run test:playwright
```

## Simple RTL zoom test

Use this when you want to test the React side of zoom handling without a real browser.

`RTL` does not perform a real canvas drag. Instead, you render the component, mock `echarts-for-react`, trigger the chart event, and assert the React callback/result.

This repo already has a strong example here:

- `src/components/tagAnalyzer/panel/PanelChart.test.tsx`

That file already tests brush zoom and navigator zoom behavior.

### Example

This is the simplest pattern:

```tsx
import { render } from '@testing-library/react';
import PanelChart from './PanelChart';
import { createPanelChartPropsFixture } from '../TestData/PanelChartTestData';

let latestChartProps: any;

jest.mock('echarts-for-react', () => {
    const React = jest.requireActual('react') as typeof import('react');

    return React.forwardRef((props: any) => {
        latestChartProps = props;
        return <div data-testid="mock-echart" />;
    });
});

it('calls onSetExtremes when brush zoom ends', () => {
    const props = createPanelChartPropsFixture(undefined);
    render(<PanelChart {...props} />);

    latestChartProps.onEvents.brushEnd?.({
        areas: [{ coordRange: [120, 180] }],
    });

    expect(props.pChartHandlers.onSetExtremes).toHaveBeenCalledWith({
        min: 120,
        max: 180,
        trigger: 'brushZoom',
    });
});
```

### Why this is useful

Use RTL when you want to confirm:

- the chart event is wired correctly
- the component updates React state correctly
- the right callback is fired

Use Playwright when you want to confirm:

- the real drag works in the browser
- the page responds correctly after the drag

### Run it

Run all Jest tests:

```bash
npm test
```

Run one test file:

```bash
npm test -- src/components/tagAnalyzer/panel/PanelChart.test.tsx
```

## Recommended path for zoom

For this repo, the simplest order is:

1. Put zoom math in unit tests such as `PanelRangeUtils.test.ts`
2. Put chart event wiring in `PanelChart.test.tsx`
3. Add one small Playwright zoom flow for the real browser path

If you only add one new test first, add the `RTL` test before the `Playwright` test. It is faster, more stable, and easier to debug.
