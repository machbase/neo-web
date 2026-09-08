// react-grid-layout compacts the board vertically, and it breaks ties in (y, x) by the order the
// panels appear in the array. So a copy that carries the source's own coordinates and sits right
// after it in the list lands in the slot directly below the source, with everything under it
// sliding down - which is what duplicating a panel is supposed to look like.
//
// Coordinates alone cannot do it: nothing writes the compacted layout back into `dashboard.panels`
// (the board passes no onLayoutChange), and a freshly created panel keeps DefaultChartOption's
// (0, 0), so on a board nobody has dragged yet every panel still reads as (0, 0) and a copy placed
// at `source.y + source.h` drops to the bottom of the stack instead of under its source.
export const insertPanelAfterSource = (aPanels: any[], aSourceId: string, aNewPanel: any): any[] => {
    const sSourceIndex = aPanels.findIndex((aPanel: any) => aPanel.id === aSourceId);
    if (sSourceIndex < 0) return [...aPanels, aNewPanel];
    return [...aPanels.slice(0, sSourceIndex + 1), aNewPanel, ...aPanels.slice(sSourceIndex + 1)];
};
