import { render, cleanup } from '@testing-library/react';
import GridLayout from 'react-grid-layout';
import { GRID_LAYOUT_COLS, GRID_LAYOUT_ROW_HEIGHT } from '@/utils/constants';
import { insertPanelAfterSource } from '@/utils/dashboardPanelLayout';
import { DefaultChartOption } from '@/utils/eChartHelper';

type Pos = { id: string; x: number; y: number };

// Where a panel ends up is decided by react-grid-layout's vertical compaction, not by the x/y the
// board stores - so these read the settled layout out of a real <GridLayout> mounted the way
// src/components/dashboard/index.tsx mounts it, rather than asserting on the panel array. The
// board's `data-grid` also carries `minW`/`minH`; those only clamp resizing, and leaving them out
// here does not move a single panel (checked against resolvePanelMinSize on these same boards).
const resolve = (aPanels: any[]): Pos[] => {
    let sResolved: any[] = [];
    render(
        <GridLayout
            className="layout"
            useCSSTransforms={false}
            layout={aPanels as any}
            cols={GRID_LAYOUT_COLS}
            autoSize={true}
            rowHeight={GRID_LAYOUT_ROW_HEIGHT}
            width={1440}
            onLayoutChange={(aLayout: any) => (sResolved = aLayout)}
            draggableHandle=".board-panel-header, .draggable-panel-header"
        >
            {aPanels.map((aItem: any) => (
                <div key={aItem.id} data-grid={{ x: aItem.x, y: aItem.y, w: aItem.w, h: aItem.h }} />
            ))}
        </GridLayout>
    );
    const sOut = aPanels.map((aPanel: any) => {
        const sItem = sResolved.find((aLayoutItem: any) => aLayoutItem.i === aPanel.id);
        return { id: aPanel.id, x: sItem.x, y: sItem.y };
    });
    cleanup();
    return sOut;
};

const at = (aPositions: Pos[], aId: string) => aPositions.find((aPos) => aPos.id === aId)!;

// What handleCopyPanel does: same geometry as the source, inserted straight after it.
const duplicate = (aPanels: any[], aSourceId: string) => {
    const sSource = aPanels.find((aPanel: any) => aPanel.id === aSourceId);
    const sCopy = { ...JSON.parse(JSON.stringify(sSource)), id: `${aSourceId}_copy` };
    return insertPanelAfterSource(aPanels, aSourceId, sCopy);
};

const P = (id: string, x: number, y: number, w = 17, h = 7) => ({ id, x, y, w, h });

// "Directly below" means the copy keeps the source's column and starts exactly where it ends,
// and the source itself does not move out from under the cursor that duplicated it.
const expectDirectlyBelow = (aPanels: any[], aSourceId: string) => {
    const sBefore = resolve(aPanels);
    const sAfter = resolve(duplicate(aPanels, aSourceId));
    const sSource = aPanels.find((aPanel: any) => aPanel.id === aSourceId);
    const sSourcePos = at(sAfter, aSourceId);
    const sCopyPos = at(sAfter, `${aSourceId}_copy`);
    expect({ x: sCopyPos.x, y: sCopyPos.y }).toEqual({ x: sSourcePos.x, y: sSourcePos.y + sSource.h });
    expect(sSourcePos).toEqual(at(sBefore, aSourceId));
    return { before: sBefore, after: sAfter };
};

describe('a duplicated panel lands directly below its source', () => {
    it('puts the copy under the bottom-right panel without disturbing the rest', () => {
        const sBoard = [P('A', 0, 0), P('B', 17, 0), P('C', 0, 7), P('D', 17, 7)];
        const { before, after } = expectDirectlyBelow(sBoard, 'D');
        expect(at(after, 'D_copy')).toEqual({ id: 'D_copy', x: 17, y: 14 });
        // the copy went into empty space, so nothing else shifts
        expect(after.filter((aPos) => aPos.id !== 'D_copy')).toEqual(before);
    });

    it('slides only the panel underneath down when the top-left one is duplicated', () => {
        const sBoard = [P('A', 0, 0), P('B', 17, 0), P('C', 0, 7), P('D', 17, 7)];
        const { after } = expectDirectlyBelow(sBoard, 'A');
        expect(at(after, 'A_copy')).toEqual({ id: 'A_copy', x: 0, y: 7 });
        expect(at(after, 'C')).toEqual({ id: 'C', x: 0, y: 14 });
        // the other column is untouched
        expect(at(after, 'B')).toEqual({ id: 'B', x: 17, y: 0 });
        expect(at(after, 'D')).toEqual({ id: 'D', x: 17, y: 7 });
    });

    it('works on a board nobody has dragged, where every panel still reads as (0, 0)', () => {
        // Nothing writes the compacted layout back, and a new panel starts at DefaultChartOption's
        // origin - so this is the state a freshly built board is actually saved in.
        expect({ x: DefaultChartOption.x, y: DefaultChartOption.y }).toEqual({ x: 0, y: 0 });
        const sBoard = [P('A', 0, 0), P('B', 0, 0), P('C', 0, 0)];
        const { after } = expectDirectlyBelow(sBoard, 'B');
        expect(after.map((aPos) => aPos.id)).toEqual(['A', 'B', 'B_copy', 'C']);
        expect(after.map((aPos) => aPos.y)).toEqual([0, 7, 14, 21]);
    });

    it('duplicates a short panel sitting beside a tall one', () => {
        const sBoard = [P('TALL', 0, 0, 17, 14), P('R1', 17, 0, 19, 7), P('R2', 17, 7, 19, 7)];
        const { after } = expectDirectlyBelow(sBoard, 'R1');
        expect(at(after, 'R1_copy')).toEqual({ id: 'R1_copy', x: 17, y: 7 });
        expect(at(after, 'R2')).toEqual({ id: 'R2', x: 17, y: 14 });
        expect(at(after, 'TALL')).toEqual({ id: 'TALL', x: 0, y: 0 });
    });

    it('duplicates the tall panel itself', () => {
        const sBoard = [P('TALL', 0, 0, 17, 14), P('R1', 17, 0, 19, 7), P('R2', 17, 7, 19, 7)];
        expectDirectlyBelow(sBoard, 'TALL');
    });

    it('duplicates a full-width panel in a stack', () => {
        const sBoard = [P('P1', 0, 0, 36, 7), P('P2', 0, 7, 36, 7), P('P3', 0, 14, 36, 7)];
        const { after } = expectDirectlyBelow(sBoard, 'P2');
        expect(after.map((aPos) => aPos.y)).toEqual([0, 7, 14, 21]);
    });

    it('duplicates the only panel on a board', () => {
        expectDirectlyBelow([P('ONLY', 0, 0)], 'ONLY');
    });

    it('keeps each new copy under the source when the same panel is duplicated twice', () => {
        const sBoard = [P('A', 0, 0), P('B', 17, 0)];
        const sOnce = duplicate(sBoard, 'A');
        const sTwice = insertPanelAfterSource(sOnce, 'A', { ...JSON.parse(JSON.stringify(sBoard[0])), id: 'A_copy2' });
        expect(resolve(sTwice).map((aPos) => `${aPos.id}@${aPos.x},${aPos.y}`)).toEqual(['A@0,0', 'A_copy2@0,7', 'A_copy@0,14', 'B@17,0']);
    });
});

describe('insertPanelAfterSource', () => {
    it('appends when the source is not in the list', () => {
        const sBoard = [P('A', 0, 0)];
        const sCopy = P('X', 0, 0);
        expect(insertPanelAfterSource(sBoard, 'missing', sCopy)).toEqual([...sBoard, sCopy]);
    });

    it('does not mutate the array it is given', () => {
        const sBoard = [P('A', 0, 0), P('B', 17, 0)];
        const sSnapshot = JSON.stringify(sBoard);
        insertPanelAfterSource(sBoard, 'A', P('A_copy', 0, 0));
        expect(JSON.stringify(sBoard)).toBe(sSnapshot);
    });
});
