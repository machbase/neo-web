# TagAnalyzer Function Review

Scope: every file under `src/components/tagAnalyzer`.
Method: every implemented function-like node was counted, including named helpers, property callbacks, and anonymous inline callbacks. The verdict is a first-pass heuristic for review, not an automatic refactor order.

Legend:
- `Yes`: likely needlessly abstracted.
- `Maybe`: borderline; small enough that the abstraction may or may not be paying off.
- `No`: short, but still doing enough to justify a named boundary.
- `N/A`: inline callback or config function, so the extraction question does not really apply.

Summary:
- Files scanned: 100
- Code files scanned: 97
- Function implementations found: 1163
- Named or otherwise non-inline functions: 376
- Inline callbacks labeled `N/A`: 787
- Potential review candidates (`Yes` + `Maybe`): 25
- Verdict breakdown: Yes 12, Maybe 13, No 351, N/A 787

## Quick Shortlist
- `src/components/tagAnalyzer/editor/PanelEditorPreviewChart.tsx` -> `updatePanelState` (lines `67-69`, span `3`): Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `src/components/tagAnalyzer/editor/sections/AxesSection.tsx` -> `updateAxesConfig` (lines `94-96`, span `3`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/AxesSection.tsx` -> `setSamplingEnabled` (lines `123-125`, span `3`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/AxesSection.tsx` -> `setAxisNumber` (lines `134-138`, span `5`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/DataSection.tsx` -> `openModal` (lines `38-40`, span `3`): Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `src/components/tagAnalyzer/editor/sections/DataSection.tsx` -> `closeModal` (lines `46-48`, span `3`): Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `src/components/tagAnalyzer/editor/sections/DataSection.tsx` -> `removeTag` (lines `56-60`, span `5`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/DisplaySection.tsx` -> `updateDisplayConfig` (lines `50-52`, span `3`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/DisplaySection.tsx` -> `setDisplayFlag` (lines `95-99`, span `5`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/DisplaySection.tsx` -> `setDisplayNumber` (lines `108-112`, span `5`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/editor/sections/GeneralSection.tsx` -> `updateGeneralConfig` (lines `31-33`, span `3`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `src/components/tagAnalyzer/modal/OverlapModal.tsx` -> `handleShiftTimeControl` (lines `199-201`, span `3`): Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.

## `src/components/tagAnalyzer/common/tagSelection/index.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/common/tagSelection/TagSelectionModeRow.tsx`
File summary: 2 function implementations. Yes 0, Maybe 0, No 1, N/A 1.

- `TagSelectionModeRow` (`variable arrow`, lines `34-82`, span `49`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `54-54`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/common/tagSelection/TagSelectionPanel.test.tsx`
File summary: 16 function implementations. Yes 0, Maybe 0, No 0, N/A 16.

- `anonymous callback for describe` (`call callback`, lines `17-63`, span `47`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `18-23`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `25-32`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `34-46`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `48-62`, span `15`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `65-101`, span `37`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `66-100`, span `35`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onSelectedTableChange` (`jsx prop callback`, lines `71-71`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onTagInputChange` (`jsx prop callback`, lines `74-74`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onSearch` (`jsx prop callback`, lines `75-75`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onAvailableTagSelect` (`jsx prop callback`, lines `77-77`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onSelectedSeriesDraftRemove` (`jsx prop callback`, lines `79-79`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop renderSelectedSeriesDraftLabel` (`jsx prop callback`, lines `80-87`, span `8`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onModeChange` (`jsx prop callback`, lines `84-84`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `onPageChange` (`property callback`, lines `92-92`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onPageInputChange` (`property callback`, lines `94-94`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.

## `src/components/tagAnalyzer/common/tagSelection/TagSelectionPanel.tsx`
File summary: 14 function implementations. Yes 0, Maybe 0, No 5, N/A 9.

- `mapTagSearchItemsToListItems` (`function declaration`, lines `47-55`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `50-54`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `findTagById` (`function declaration`, lines `64-69`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for find` (`call callback`, lines `68-68`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `mapSelectedSeriesDraftListItems` (`function declaration`, lines `77-85`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `80-84`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `TagSelectionPanel` (`variable arrow`, lines `93-291`, span `199`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `handleSelectedSeriesDraftKeyDown` (`variable arrow`, lines `135-147`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `175-175`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onKeyDown` (`jsx prop callback`, lines `176-176`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onItemClick` (`jsx prop callback`, lines `214-219`, span `6`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for map` (`call callback`, lines `243-265`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `251-251`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onKeyDown` (`jsx prop callback`, lines `252-256`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/common/tagSelection/tagSelectionPresentation.test.ts`
File summary: 3 function implementations. Yes 0, Maybe 0, No 0, N/A 3.

- `anonymous callback for describe` (`call callback`, lines `7-24`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `8-17`, span `10`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `19-23`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/common/tagSelection/tagSelectionPresentation.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 4, N/A 0.

- `buildTagSelectionLimitError` (`function declaration`, lines `10-12`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `getTagSelectionErrorMessage` (`function declaration`, lines `21-34`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getTagSelectionCountColor` (`function declaration`, lines `43-48`, span `6`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildTagSelectionCountLabel` (`function declaration`, lines `57-62`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/common/tagSelection/tagSelectionTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/common/tagSelection/useTagSelectionState.test.ts`
File summary: 37 function implementations. Yes 0, Maybe 0, No 0, N/A 37.

- `anonymous callback for mock` (`call callback`, lines `18-22`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `24-28`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `30-33`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `35-37`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `46-352`, span `307`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `47-51`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for mockImplementation` (`call callback`, lines `49-49`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `53-99`, span `47`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for map` (`call callback`, lines `71-71`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for renderHook` (`call callback`, lines `75-76`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `79-81`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `83-85`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `87-91`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `101-153`, span `53`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `122-123`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `126-129`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `131-142`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `155-211`, span `57`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `176-177`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `180-182`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `184-186`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `188-191`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `206-208`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `213-266`, span `54`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `234-235`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `238-243`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `245-252`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `254-256`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `268-292`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `274-275`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `278-280`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `294-327`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `315-316`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `319-321`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `329-351`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `330-331`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `341-343`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/common/tagSelection/useTagSelectionState.ts`
File summary: 22 function implementations. Yes 0, Maybe 0, No 1, N/A 21.

- `useTagSelectionState` (`variable arrow`, lines `25-313`, span `289`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useMemo` (`call callback`, lines `46-54`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `48-52`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `61-66`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `74-78`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setTagTotal` (`call callback`, lines `75-76`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `87-95`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setReloadKey` (`call callback`, lines `94-94`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `105-108`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `117-138`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useCallback` (`call callback`, lines `147-184`, span `38`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useCallback` (`call callback`, lines `191-199`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `208-228`, span `21`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for setSelectedSeriesDrafts` (`call callback`, lines `215-226`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `238-242`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setSelectedSeriesDrafts` (`call callback`, lines `239-240`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `240-240`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `252-260`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setSelectedSeriesDrafts` (`call callback`, lines `253-258`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `254-258`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `271-277`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `282-284`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/editor/AddTagsModal.tsx`
File summary: 8 function implementations. Yes 0, Maybe 0, No 3, N/A 5.

- `AddTagsModal` (`variable arrow`, lines `24-153`, span `130`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `isSameSelectedTag` (`property callback`, lines `39-40`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `handleSelectTag` (`variable arrow`, lines `49-55`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `setPanels` (`variable arrow`, lines `62-74`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for prop renderSelectedSeriesDraftLabel` (`jsx prop callback`, lines `111-118`, span `8`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onModeChange` (`jsx prop callback`, lines `115-115`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `onPageChange` (`property callback`, lines `123-123`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onPageInputChange` (`property callback`, lines `125-125`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.

## `src/components/tagAnalyzer/editor/OverlapTimeShiftControls.tsx`
File summary: 7 function implementations. Yes 0, Maybe 0, No 3, N/A 4.

- `OverlapTimeShiftControls` (`variable arrow`, lines `28-198`, span `171`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `getShiftAmount` (`variable arrow`, lines `51-53`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `setUtcTime` (`variable arrow`, lines `61-63`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `108-108`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `127-127`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `142-146`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `178-178`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/PanelEditor.tsx`
File summary: 7 function implementations. Yes 0, Maybe 0, No 4, N/A 3.

- `PanelEditor` (`variable arrow`, lines `31-236`, span `206`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `applyEditorChanges` (`variable arrow`, lines `56-65`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `saveEditorChanges` (`variable arrow`, lines `72-76`, span `5`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `confirmSaveIfNeeded` (`variable arrow`, lines `83-90`, span `8`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for useEffect` (`call callback`, lines `92-111`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 94` (`anonymous callback`, lines `94-107`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 108` (`anonymous callback`, lines `108-110`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/editor/PanelEditorConfigConverter.test.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 1, N/A 5.

- `createEditorTimeConfig` (`function declaration`, lines `15-22`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for describe` (`call callback`, lines `24-155`, span `132`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `25-76`, span `52`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `26-75`, span `50`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `78-154`, span `77`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `79-153`, span `75`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/editor/PanelEditorConfigConverter.ts`
File summary: 5 function implementations. Yes 0, Maybe 0, No 5, N/A 0.

- `convertPanelInfoToEditorConfig` (`function declaration`, lines `18-67`, span `50`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `mergeEditorConfigIntoPanelInfo` (`function declaration`, lines `76-105`, span `30`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `mergeAxesDraftIntoPanelAxes` (`function declaration`, lines `113-150`, span `38`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `mergeDisplayDraftIntoPanelDisplay` (`function declaration`, lines `158-167`, span `10`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `normalizeDraftNumber` (`function declaration`, lines `175-177`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.

## `src/components/tagAnalyzer/editor/PanelEditorPreviewChart.tsx`
File summary: 12 function implementations. Yes 1, Maybe 0, No 4, N/A 7.

- `PanelEditorPreviewChart` (`function declaration`, lines `40-272`, span `233`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `updatePanelState` (`variable function`, lines `67-69`, span `3`): `Yes`. Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `anonymous callback for setPanelState` (`call callback`, lines `68-68`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getPreviewNavigatorRange` (`function declaration`, lines `93-98`, span `6`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `loadPreviewRanges` (`variable function`, lines `105-108`, span `4`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `toggleRawMode` (`variable function`, lines `115-119`, span `5`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for useEffect` (`call callback`, lines `147-149`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `202-207`, span `6`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `227-227`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `onSelection` (`property callback`, lines `254-254`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for prop pSetIsFFTModal` (`jsx prop callback`, lines `258-258`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnDragSelectStateChange` (`jsx prop callback`, lines `259-259`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/PanelEditorTypes.ts`
File summary: 1 function implementations. Yes 0, Maybe 0, No 1, N/A 0.

- `parseEditorNumber` (`variable arrow`, lines `28-30`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.

## `src/components/tagAnalyzer/editor/PanelEditorUtils.test.ts`
File summary: 15 function implementations. Yes 0, Maybe 0, No 1, N/A 14.

- `anonymous callback for mock` (`call callback`, lines `5-8`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createEditorTimeConfig` (`function declaration`, lines `27-34`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for describe` (`call callback`, lines `36-174`, span `139`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `37-39`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for beforeAll` (`call callback`, lines `41-44`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for afterAll` (`call callback`, lines `46-48`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `50-173`, span `124`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `59-79`, span `21`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `81-93`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `95-105`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `107-117`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `119-129`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `131-141`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `143-153`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `155-172`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/editor/PanelEditorUtils.ts`
File summary: 9 function implementations. Yes 0, Maybe 0, No 9, N/A 0.

- `resolveEditorTimeBounds` (`function declaration`, lines `34-51`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getEditorTimeRangeMode` (`function declaration`, lines `59-69`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `hasAbsoluteEditorTimeBounds` (`function declaration`, lines `77-79`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `resolveLastRelativeEditorTimeBounds` (`function declaration`, lines `89-105`, span `17`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createLegacyEditorTimeRangeInput` (`function declaration`, lines `113-120`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `resolveLastRelativeBoundaryRanges` (`function declaration`, lines `129-134`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createLastRelativeEditorTimeBounds` (`function declaration`, lines `143-152`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveNowRelativeEditorTimeBounds` (`function declaration`, lines `160-169`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveAbsoluteEditorTimeBounds` (`function declaration`, lines `177-182`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/editor/sections/AxesSection.tsx`
File summary: 34 function implementations. Yes 3, Maybe 0, No 6, N/A 25.

- `AxesSection` (`variable arrow`, lines `77-634`, span `558`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `updateAxesConfig` (`variable arrow`, lines `94-96`, span `3`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `setAxisFlag` (`variable arrow`, lines `105-115`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `108-110`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `setSamplingEnabled` (`variable arrow`, lines `123-125`, span `3`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `setAxisNumber` (`variable arrow`, lines `134-138`, span `5`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `setY2TagList` (`variable arrow`, lines `146-153`, span `8`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `149-151`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `setRemoveY2TagList` (`variable arrow`, lines `160-166`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `162-164`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `168-168`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `169-169`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `170-174`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `renderAxisRangeRow` (`variable arrow`, lines `247-313`, span `67`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `279-280`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `298-299`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `renderThresholdRows` (`variable arrow`, lines `321-361`, span `41`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `323-359`, span `37`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `331-332`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `344-345`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `379-380`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `396-397`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `415-416`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `445-446`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `458-459`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `489-490`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `501-502`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for map` (`call callback`, lines `511-513`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `532-533`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `544-545`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `557-558`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for map` (`call callback`, lines `568-570`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `608-627`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `611-611`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/DataSection.tsx`
File summary: 15 function implementations. Yes 3, Maybe 0, No 3, N/A 9.

- `DataSection` (`variable arrow`, lines `24-277`, span `254`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `openModal` (`variable arrow`, lines `38-40`, span `3`): `Yes`. Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `closeModal` (`variable arrow`, lines `46-48`, span `3`): `Yes`. Tiny local wrapper around a single setter or callback; the extra name likely adds more indirection than value.
- `removeTag` (`variable arrow`, lines `56-60`, span `5`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `anonymous callback for filter` (`call callback`, lines `58-58`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `updateTagField` (`variable arrow`, lines `70-76`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `72-74`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `updateSourceTagName` (`variable arrow`, lines `85-93`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `87-91`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `98-245`, span `148`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `130-131`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `179-180`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `195-196`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `209-210`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `225-225`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/DisplaySection.tsx`
File summary: 12 function implementations. Yes 3, Maybe 0, No 2, N/A 7.

- `DisplaySection` (`variable arrow`, lines `37-236`, span `200`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `updateDisplayConfig` (`variable arrow`, lines `50-52`, span `3`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `changeChartType` (`variable arrow`, lines `60-86`, span `27`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `setDisplayFlag` (`variable arrow`, lines `95-99`, span `5`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `setDisplayNumber` (`variable arrow`, lines `108-112`, span `5`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `anonymous callback for map` (`call callback`, lines `125-146`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `130-130`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `150-151`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `161-162`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `186-187`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `203-204`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `220-221`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/EditorTabContent.tsx`
File summary: 13 function implementations. Yes 0, Maybe 0, No 1, N/A 12.

- `EditorTabContent` (`variable arrow`, lines `20-90`, span `71`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for prop pOnChangeGeneralConfig` (`jsx prop callback`, lines `36-37`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeGeneralConfig` (`jsx prop callback`, lines `37-37`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTagSet` (`jsx prop callback`, lines `45-49`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTagSet` (`jsx prop callback`, lines `46-49`, span `4`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeAxesConfig` (`jsx prop callback`, lines `58-59`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeAxesConfig` (`jsx prop callback`, lines `59-59`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTagSet` (`jsx prop callback`, lines `61-65`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTagSet` (`jsx prop callback`, lines `62-65`, span `4`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeDisplayConfig` (`jsx prop callback`, lines `73-74`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeDisplayConfig` (`jsx prop callback`, lines `74-74`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTimeConfig` (`jsx prop callback`, lines `82-83`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnChangeTimeConfig` (`jsx prop callback`, lines `83-83`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/GeneralSection.tsx`
File summary: 6 function implementations. Yes 1, Maybe 0, No 2, N/A 3.

- `GeneralSection` (`variable arrow`, lines `18-114`, span `97`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `updateGeneralConfig` (`variable arrow`, lines `31-33`, span `3`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `setGeneralFlag` (`variable arrow`, lines `42-54`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `66-67`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `91-92`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `102-103`, span `2`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/PanelEditorSettings.tsx`
File summary: 3 function implementations. Yes 0, Maybe 0, No 1, N/A 2.

- `PanelEditorSettings` (`variable arrow`, lines `16-83`, span `68`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for map` (`call callback`, lines `43-54`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `47-47`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/sections/TimeRangeSection.tsx`
File summary: 15 function implementations. Yes 0, Maybe 1, No 9, N/A 5.

- `TimeRangeSection` (`variable arrow`, lines `30-281`, span `252`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useEffect` (`call callback`, lines `40-43`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `updateTimeConfig` (`variable arrow`, lines `52-65`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `updateInputValue` (`variable arrow`, lines `74-81`, span `8`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getStoredBoundaryValue` (`variable arrow`, lines `89-90`, span `2`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `updateSingleBoundary` (`variable arrow`, lines `99-110`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleTimeChange` (`variable arrow`, lines `119-123`, span `5`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleTimeApply` (`variable arrow`, lines `132-135`, span `4`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `handleQuickTime` (`variable arrow`, lines `143-151`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleClear` (`variable arrow`, lines `158-162`, span `5`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `parseQuickTimeBoundaryValue` (`variable arrow`, lines `170-177`, span `8`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `206-206`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pSetApply` (`jsx prop callback`, lines `207-207`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChange` (`jsx prop callback`, lines `225-225`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pSetApply` (`jsx prop callback`, lines `226-226`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/editor/useSavePanelToGlobalRecoilState.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 1, N/A 3.

- `useSavePanelToGlobalRecoilState` (`function declaration`, lines `11-28`, span `18`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useRecoilCallback` (`call callback`, lines `13-25`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 14` (`anonymous callback`, lines `14-25`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for set` (`call callback`, lines `17-23`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/modal/CreateChartModal.tsx`
File summary: 14 function implementations. Yes 0, Maybe 0, No 4, N/A 10.

- `getMinMaxBounds` (`variable arrow`, lines `32-45`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `CreateChartModal` (`variable arrow`, lines `54-291`, span `238`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `isSameSelectedTag` (`property callback`, lines `65-65`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for useEffect` (`call callback`, lines `69-74`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `handleSelectTag` (`variable arrow`, lines `82-92`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `setPanels` (`variable arrow`, lines `99-138`, span `40`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `131-135`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `168-168`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `192-192`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `216-216`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop renderSelectedSeriesDraftLabel` (`jsx prop callback`, lines `251-258`, span `8`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onModeChange` (`jsx prop callback`, lines `255-255`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `onPageChange` (`property callback`, lines `263-263`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onPageInputChange` (`property callback`, lines `265-265`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.

## `src/components/tagAnalyzer/modal/OverlapModal.tsx`
File summary: 12 function implementations. Yes 1, Maybe 0, No 2, N/A 9.

- `OverlapModal` (`function declaration`, lines `46-308`, span `263`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useCallback` (`call callback`, lines `63-139`, span `77`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useCallback` (`call callback`, lines `150-161`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `155-155`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `173-180`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setPanelsInfo` (`call callback`, lines `179-179`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `renderOverlapTimeShiftControl` (`function declaration`, lines `189-213`, span `25`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleShiftTimeControl` (`function declaration`, lines `199-201`, span `3`): `Yes`. Very small local pass-through handler that mostly forwards work elsewhere; likely a good inlining candidate.
- `anonymous callback for useEffect` (`call callback`, lines `215-217`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `219-221`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onClose` (`jsx prop callback`, lines `230-230`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `255-259`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/modal/OverlapModalUtils.test.ts`
File summary: 13 function implementations. Yes 0, Maybe 0, No 0, N/A 13.

- `anonymous callback for describe` (`call callback`, lines `11-142`, span `132`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `12-30`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `13-20`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `22-29`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `32-41`, span `10`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `33-40`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `43-62`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `44-57`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `59-61`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `64-92`, span `29`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `65-91`, span `27`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `94-141`, span `48`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `95-140`, span `46`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/modal/OverlapModalUtils.ts`
File summary: 14 function implementations. Yes 0, Maybe 0, No 6, N/A 8.

- `shiftOverlapPanels` (`function declaration`, lines `29-43`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `35-41`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildOverlapLoadState` (`function declaration`, lines `51-71`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for forEach` (`call callback`, lines `58-65`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `resolveOverlapTimeRange` (`function declaration`, lines `80-88`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `alignOverlapTime` (`function declaration`, lines `97-105`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `mapOverlapRows` (`function declaration`, lines `114-119`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `118-118`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getNextOverlapPanels` (`function declaration`, lines `128-167`, span `40`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for filter` (`call callback`, lines `137-137`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for find` (`call callback`, lines `142-142`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `155-158`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for some` (`call callback`, lines `162-162`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `163-163`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/panel/chartOptions/OverlapChartOption.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 2, N/A 4.

- `buildOverlapChartOption` (`function declaration`, lines `38-109`, span `72`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatter` (`property callback`, lines `69-69`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for map` (`call callback`, lines `88-103`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `buildOverlapTooltipOption` (`function declaration`, lines `118-147`, span `30`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatter` (`property callback`, lines `124-145`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for map` (`call callback`, lines `128-143`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartAxisUtils.ts`
File summary: 14 function implementations. Yes 0, Maybe 0, No 10, N/A 4.

- `buildPanelXAxisOption` (`function declaration`, lines `77-121`, span `45`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatter` (`property callback`, lines `92-92`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildPanelYAxisOption` (`function declaration`, lines `144-205`, span `62`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for some` (`call callback`, lines `186-186`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `resolveOverlapYAxisRange` (`function declaration`, lines `222-236`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getSeriesValueRange` (`function declaration`, lines `244-253`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for reduce` (`call callback`, lines `246-250`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getRoundedAxisStep` (`function declaration`, lines `263-280`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `roundAxisMaximum` (`function declaration`, lines `290-300`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `updateAxisBounds` (`function declaration`, lines `313-323`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `roundAxisBounds` (`function declaration`, lines `333-338`, span `6`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getYAxisValues` (`function declaration`, lines `350-370`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for forEach` (`call callback`, lines `359-364`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `resolveAxisRange` (`function declaration`, lines `383-393`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartInteractionUtils.ts`
File summary: 5 function implementations. Yes 0, Maybe 0, No 5, N/A 0.

- `extractDataZoomRange` (`function declaration`, lines `18-38`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getPrimaryDataZoomItem` (`function declaration`, lines `46-50`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `getExplicitDataZoomRange` (`function declaration`, lines `58-72`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getZoomBoundaryValue` (`function declaration`, lines `80-84`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `extractBrushRange` (`function declaration`, lines `92-104`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartOptionBuilder.test.ts`
File summary: 37 function implementations. Yes 0, Maybe 0, No 0, N/A 37.

- `anonymous callback for describe` (`call callback`, lines `16-472`, span `457`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `17-335`, span `319`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `18-27`, span `10`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `29-38`, span `10`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `40-49`, span `10`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `51-57`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `59-82`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for some` (`call callback`, lines `74-75`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `84-111`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `113-131`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for filter` (`call callback`, lines `128-128`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for every` (`call callback`, lines `129-129`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `133-143`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for every` (`call callback`, lines `142-142`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `145-156`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for filter` (`call callback`, lines `152-152`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for every` (`call callback`, lines `155-155`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `158-223`, span `66`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for find` (`call callback`, lines `205-205`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for find` (`call callback`, lines `206-206`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for find` (`call callback`, lines `208-208`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for find` (`call callback`, lines `211-211`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `225-255`, span `31`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for find` (`call callback`, lines `251-251`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `257-282`, span `26`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `284-307`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `309-334`, span `26`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `337-356`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `338-355`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `358-420`, span `63`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `359-378`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `380-399`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `401-419`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `422-471`, span `50`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `423-441`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `443-465`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `467-470`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartOptionBuilder.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 3, N/A 3.

- `buildPanelChartOption` (`function declaration`, lines `40-169`, span `130`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildPanelTooltipOption` (`function declaration`, lines `176-214`, span `39`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatter` (`property callback`, lines `186-212`, span `27`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for filter` (`call callback`, lines `190-191`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `206-207`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `formatTooltipTime` (`function declaration`, lines `222-233`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartOptionConstants.ts`
File summary: 1 function implementations. Yes 0, Maybe 0, No 1, N/A 0.

- `getPanelChartLayoutMetrics` (`function declaration`, lines `67-81`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartOptionTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/panel/chartOptions/PanelChartSeriesUtils.ts`
File summary: 12 function implementations. Yes 0, Maybe 0, No 7, N/A 5.

- `buildPanelLegendSelectedMap` (`function declaration`, lines `29-37`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for reduce` (`call callback`, lines `33-36`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildDefaultVisibleSeriesMap` (`function declaration`, lines `45-54`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for reduce` (`call callback`, lines `48-53`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildVisibleSeriesList` (`function declaration`, lines `63-71`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `67-70`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildPanelChartSeriesOption` (`function declaration`, lines `83-95`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildThresholdLine` (`function declaration`, lines `105-126`, span `22`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildMainSeries` (`function declaration`, lines `137-218`, span `82`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `148-217`, span `70`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `buildNavigatorSeries` (`function declaration`, lines `227-270`, span `44`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `231-269`, span `39`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/panel/Panel.scss`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/panel/PanelBody.tsx`
File summary: 5 function implementations. Yes 0, Maybe 1, No 2, N/A 2.

- `PanelBody` (`variable arrow`, lines `45-232`, span `188`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useEffect` (`call callback`, lines `68-72`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `handleSelection` (`variable arrow`, lines `80-108`, span `29`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleCloseDragSelect` (`variable arrow`, lines `115-118`, span `4`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `anonymous callback for map` (`call callback`, lines `206-227`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/panel/PanelChart.test.tsx`
File summary: 41 function implementations. Yes 0, Maybe 3, No 0, N/A 38.

- `anonymous callback for mock` (`call callback`, lines `15-36`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for forwardRef` (`call callback`, lines `18-35`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useImperativeHandle` (`call callback`, lines `24-26`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getEchartsInstance` (`property callback`, lines `25-25`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for useEffect` (`call callback`, lines `30-32`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `38-42`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `39-41`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `44-52`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `46-48`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `50-50`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `51-51`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `54-65`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `55-63`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `64-64`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getBuildPanelChartOptionMock` (`variable arrow`, lines `72-76`, span `5`): `Maybe`. Small named helper with some semantic value, but it may be more indirection than benefit unless reused a lot.
- `getBuildPanelChartSeriesOptionMock` (`variable arrow`, lines `83-87`, span `5`): `Maybe`. Small named helper with some semantic value, but it may be more indirection than benefit unless reused a lot.
- `getExtractDataZoomRangeMock` (`variable arrow`, lines `94-98`, span `5`): `Maybe`. Small named helper with some semantic value, but it may be more indirection than benefit unless reused a lot.
- `anonymous callback for describe` (`call callback`, lines `100-345`, span `246`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `101-104`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `106-135`, span `30`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `110-117`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `120-120`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `128-134`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `130-130`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `137-165`, span `29`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `167-216`, span `50`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `174-176`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `180-180`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `202-208`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for filter` (`call callback`, lines `204-204`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `218-251`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `224-226`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `253-306`, span `54`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `259-261`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `265-269`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `275-280`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `282-284`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `291-296`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `298-300`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `308-344`, span `37`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for mockImplementation` (`call callback`, lines `313-321`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/panel/PanelChart.tsx`
File summary: 27 function implementations. Yes 0, Maybe 0, No 4, N/A 23.

- `isLegendHoverPayload` (`variable arrow`, lines `90-94`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `getPrimaryDataZoomState` (`variable arrow`, lines `102-110`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `hasExplicitDataZoomRange` (`variable arrow`, lines `118-130`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `PanelChart` (`variable arrow`, lines `138-557`, span `420`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useCallback` (`call callback`, lines `187-189`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `198-210`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useEffect` (`call callback`, lines `214-222`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `224-226`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `235-266`, span `32`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useCallback` (`call callback`, lines `279-315`, span `37`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useEffect` (`call callback`, lines `319-330`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `setPanelRange` (`property callback`, lines `322-324`, span `3`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `getVisibleSeries` (`property callback`, lines `325-326`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for useMemo` (`call callback`, lines `333-343`, span `11`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `365-397`, span `33`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for map` (`call callback`, lines `368-368`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `407-414`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `416-418`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `421-510`, span `90`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `datazoom` (`property callback`, lines `423-451`, span `29`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `brushEnd` (`property callback`, lines `453-488`, span `36`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `legendselectchanged` (`property callback`, lines `490-493`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `highlight` (`property callback`, lines `495-501`, span `7`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `downplay` (`property callback`, lines `503-509`, span `7`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for useCallback` (`call callback`, lines `529-537`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop ref` (`jsx prop callback`, lines `543-545`, span `3`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onChartReady` (`jsx prop callback`, lines `548-550`, span `3`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/panel/PanelContainer.test.tsx`
File summary: 24 function implementations. Yes 0, Maybe 1, No 5, N/A 18.

- `anonymous callback for mock` (`call callback`, lines `53-59`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `61-63`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `65-72`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `74-95`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `MockPanelHeader` (`variable arrow`, lines `81-92`, span `12`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for mock` (`call callback`, lines `97-141`, span `45`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `MockPanelBody` (`variable arrow`, lines `107-138`, span `32`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for fn` (`call callback`, lines `115-115`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `126-131`, span `6`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for mock` (`call callback`, lines `143-154`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `MockPanelFooter` (`variable arrow`, lines `149-151`, span `3`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `createBoardPanelActions` (`variable arrow`, lines `166-172`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createBoardPanelState` (`variable arrow`, lines `179-183`, span `5`): `Maybe`. Small named helper with some semantic value, but it may be more indirection than benefit unless reused a lot.
- `createProps` (`variable arrow`, lines `191-220`, span `30`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous function at line 192` (`anonymous callback`, lines `192-203`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `222-298`, span `77`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `223-247`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for mockImplementation` (`call callback`, lines `226-234`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `249-278`, span `30`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `254-256`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `260-262`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `280-297`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `288-290`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `294-296`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/panel/PanelContainer.tsx`
File summary: 30 function implementations. Yes 0, Maybe 1, No 9, N/A 20.

- `hasLoadedPanelChartData` (`function declaration`, lines `57-59`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `PanelContainer` (`function declaration`, lines `69-433`, span `365`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useState` (`call callback`, lines `98-103`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `makeResetParams` (`function declaration`, lines `119-127`, span `9`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `handlePanelRangeApplied` (`function declaration`, lines `136-153`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `initialize` (`variable function`, lines `181-197`, span `17`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `reset` (`variable function`, lines `204-208`, span `5`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `toggleDragSelect` (`variable function`, lines `217-227`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for setPanelState` (`call callback`, lines `219-223`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `handleDragSelectStateChange` (`variable function`, lines `236-244`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for setPanelState` (`call callback`, lines `241-241`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `toggleRaw` (`variable function`, lines `251-266`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for setPanelState` (`call callback`, lines `253-253`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onToggleOverlap` (`property callback`, lines `271-279`, span `9`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onOpenFft` (`property callback`, lines `282-282`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for setPanelState` (`call callback`, lines `282-282`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onSetGlobalTime` (`property callback`, lines `283-293`, span `11`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onOpenEdit` (`property callback`, lines `294-299`, span `6`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onDelete` (`property callback`, lines `300-305`, span `6`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for useEffect` (`call callback`, lines `337-344`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `346-353`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `355-360`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `362-364`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `366-374`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onRefreshData` (`property callback`, lines `388-393`, span `6`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onRefreshTime` (`property callback`, lines `394-394`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onSelection` (`property callback`, lines `410-410`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for prop pSetIsFFTModal` (`jsx prop callback`, lines `414-418`, span `5`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pSetIsFFTModal` (`jsx prop callback`, lines `415-418`, span `4`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `arePanelContainerPropsEqual` (`function declaration`, lines `442-463`, span `22`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/panel/PanelFooter.scss`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/panel/PanelFooter.test.tsx`
File summary: 10 function implementations. Yes 0, Maybe 0, No 1, N/A 9.

- `anonymous callback for mock` (`call callback`, lines `5-7`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `6-6`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `9-23`, span `15`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `Button` (`variable arrow`, lines `16-20`, span `5`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous function at line 21` (`anonymous callback`, lines `21-21`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `25-31`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for fn` (`call callback`, lines `27-30`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `33-56`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `34-42`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `44-55`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/panel/PanelFooter.tsx`
File summary: 5 function implementations. Yes 0, Maybe 0, No 1, N/A 4.

- `PanelFooter` (`variable arrow`, lines `26-110`, span `85`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `61-61`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `69-69`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `85-85`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `93-93`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/panel/PanelHeader.scss`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/panel/PanelHeader.tsx`
File summary: 3 function implementations. Yes 0, Maybe 1, No 1, N/A 1.

- `PanelHeader` (`variable arrow`, lines `33-211`, span `179`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `handleDelete` (`variable arrow`, lines `54-57`, span `4`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `177-177`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/panel/PanelTimeSummary.tsx`
File summary: 1 function implementations. Yes 0, Maybe 0, No 1, N/A 0.

- `PanelTimeSummary` (`variable arrow`, lines `9-25`, span `17`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.

## `src/components/tagAnalyzer/panel/usePanelController.test.ts`
File summary: 20 function implementations. Yes 0, Maybe 0, No 0, N/A 20.

- `anonymous callback for mock` (`call callback`, lines `10-12`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `17-222`, span `206`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `18-20`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `22-75`, span `54`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for fn` (`call callback`, lines `28-28`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for renderHook` (`call callback`, lines `32-41`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `44-49`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `51-57`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `77-127`, span `51`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `87-96`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `100-105`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `108-114`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `129-185`, span `57`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `137-146`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `150-155`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `160-166`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `171-177`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `187-221`, span `35`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for renderHook` (`call callback`, lines `198-207`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `210-212`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/panel/usePanelController.ts`
File summary: 12 function implementations. Yes 0, Maybe 4, No 7, N/A 1.

- `createInitialPanelNavigateState` (`function declaration`, lines `44-53`, span `10`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `buildNavigateStatePatchFromPanelLoad` (`function declaration`, lines `62-75`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `usePanelChartRuntimeController` (`function declaration`, lines `89-361`, span `273`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `updateNavigateState` (`variable function`, lines `114-120`, span `7`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `anonymous callback for setNavigateState` (`call callback`, lines `115-119`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `notifyPanelRangeApplied` (`variable function`, lines `129-134`, span `6`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `refreshPanelData` (`variable function`, lines `145-184`, span `40`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `applyPanelAndNavigatorRanges` (`variable function`, lines `196-259`, span `64`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `handleNavigatorRangeChange` (`variable function`, lines `268-273`, span `6`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `handlePanelRangeChange` (`variable function`, lines `282-301`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `setExtremes` (`variable function`, lines `311-320`, span `10`): `Maybe`. Still fairly small and linear, so this is a borderline abstraction rather than an obviously necessary one.
- `applyLoadedRanges` (`variable function`, lines `330-349`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/TagAnalyzer.test.tsx`
File summary: 40 function implementations. Yes 0, Maybe 1, No 2, N/A 37.

- `anonymous callback for mock` (`call callback`, lines `60-63`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `65-71`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `73-79`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `81-84`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `86-120`, span `35`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `Page` (`variable arrow`, lines `93-93`, span `1`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous function at line 94` (`anonymous callback`, lines `94-96`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous function at line 97` (`anonymous callback`, lines `97-99`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `Button` (`variable arrow`, lines `106-116`, span `11`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous function at line 117` (`anonymous callback`, lines `117-117`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `122-155`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 129` (`anonymous callback`, lines `129-154`, span `26`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for mock` (`call callback`, lines `157-189`, span `33`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 164` (`anonymous callback`, lines `164-188`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `172-175`, span `4`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `182-182`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for mock` (`call callback`, lines `191-200`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous function at line 197` (`anonymous callback`, lines `197-199`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `202-211`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous function at line 208` (`anonymous callback`, lines `208-210`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `213-238`, span `26`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 220` (`anonymous callback`, lines `220-237`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `229-229`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `232-232`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for mock` (`call callback`, lines `240-256`, span `17`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 247` (`anonymous callback`, lines `247-255`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createProps` (`variable arrow`, lines `264-268`, span `5`): `Maybe`. Small named helper with some semantic value, but it may be more indirection than benefit unless reused a lot.
- `anonymous callback for describe` (`call callback`, lines `270-468`, span `199`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `271-293`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for mockImplementation` (`call callback`, lines `276-281`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `295-352`, span `58`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `299-301`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for waitFor` (`call callback`, lines `322-328`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `354-372`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `358-360`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `374-391`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `393-467`, span `75`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for waitFor` (`call callback`, lines `397-399`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `440-442`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for act` (`call callback`, lines `445-447`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/TagAnalyzer.tsx`
File summary: 37 function implementations. Yes 0, Maybe 0, No 5, N/A 32.

- `hasPersistedTimeRangeChanged` (`function declaration`, lines `68-82`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `applyPendingTimeRangeUpdates` (`function declaration`, lines `91-130`, span `40`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `97-127`, span `31`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `TagAnalyzer` (`variable arrow`, lines `138-476`, span `339`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for useMemo` (`call callback`, lines `169-169`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `173-176`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `190-212`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for setBoardList` (`call callback`, lines `209-211`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useCallback` (`call callback`, lines `221-247`, span `27`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for find` (`call callback`, lines `224-224`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for setTimeout` (`call callback`, lines `243-246`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `251-260`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous function at line 252` (`anonymous callback`, lines `252-259`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `262-275`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 263` (`anonymous callback`, lines `263-274`, span `12`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useEffect` (`call callback`, lines `277-304`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 285` (`anonymous callback`, lines `285-300`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useCallback` (`call callback`, lines `319-332`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useMemo` (`call callback`, lines `337-345`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `356-361`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `366-374`, span `9`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for prop pSetEditPanel` (`jsx prop callback`, lines `393-393`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `430-430`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop onClose` (`jsx prop callback`, lines `447-447`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `buildToolbarActionHandlers` (`function declaration`, lines `490-509`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `onOpenTimeRangeModal` (`property callback`, lines `502-502`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onRefreshData` (`property callback`, lines `503-503`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for setRefreshCount` (`call callback`, lines `503-503`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onRefreshTime` (`property callback`, lines `504-504`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onOpenSaveModal` (`property callback`, lines `506-506`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onOpenOverlapModal` (`property callback`, lines `507-507`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildPanelBoardActions` (`function declaration`, lines `522-544`, span `23`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `onOverlapSelectionChange` (`property callback`, lines `531-532`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for setOverlapPanels` (`call callback`, lines `532-532`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onDeletePanel` (`property callback`, lines `533-534`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for setBoardList` (`call callback`, lines `534-534`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `onSetGlobalTimeRange` (`property callback`, lines `536-541`, span `6`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.

## `src/components/tagAnalyzer/TagAnalyzerBoard.tsx`
File summary: 10 function implementations. Yes 0, Maybe 0, No 0, N/A 10.

- `anonymous callback for memo` (`call callback`, lines `20-126`, span `107`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for useMemo` (`call callback`, lines `30-30`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `30-30`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `35-41`, span `7`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `45-49`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for useMemo` (`call callback`, lines `57-61`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `71-123`, span `53`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for prop pOnToggleOverlapSelection` (`jsx prop callback`, lines `90-97`, span `8`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnUpdateOverlapSelection` (`jsx prop callback`, lines `99-106`, span `8`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `anonymous callback for prop pOnDeletePanel` (`jsx prop callback`, lines `108-119`, span `12`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.

## `src/components/tagAnalyzer/TagAnalyzerBoardToolbar.test.tsx`
File summary: 19 function implementations. Yes 0, Maybe 0, No 1, N/A 18.

- `anonymous callback for mock` (`call callback`, lines `6-13`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `Calendar` (`property callback`, lines `7-7`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `Save` (`property callback`, lines `8-8`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `Refresh` (`property callback`, lines `9-9`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `SaveAs` (`property callback`, lines `10-10`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `MdOutlineStackedLineChart` (`property callback`, lines `11-11`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `LuTimerReset` (`property callback`, lines `12-12`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for mock` (`call callback`, lines `15-55`, span `41`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for assign` (`call callback`, lines `23-23`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `Header` (`property callback`, lines `25-25`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `Space` (`property callback`, lines `26-26`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for assign` (`call callback`, lines `36-48`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `Group` (`property callback`, lines `50-50`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for describe` (`call callback`, lines `57-117`, span `61`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `createActionHandlers` (`variable arrow`, lines `63-70`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for it` (`call callback`, lines `72-84`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `86-96`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `98-116`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for find` (`call callback`, lines `110-110`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/TagAnalyzerBoardToolbar.tsx`
File summary: 3 function implementations. Yes 0, Maybe 0, No 2, N/A 1.

- `TagAnalyzerBoardToolbar` (`variable arrow`, lines `29-170`, span `142`): `No`. Even if short, the name establishes a component or hook boundary that helps organize render and controller code.
- `anonymous callback for prop onClick` (`jsx prop callback`, lines `154-154`, span `1`): `N/A`. Inline JSX prop callback; short by design and not the helper-extraction problem you are chasing.
- `formatBoardRangeText` (`function declaration`, lines `180-186`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/TestData/PanelChartTestData.ts`
File summary: 3 function implementations. Yes 0, Maybe 0, No 2, N/A 1.

- `createMockChartInstance` (`variable arrow`, lines `43-54`, span `12`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for fn` (`call callback`, lines `45-52`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createPanelChartPropsFixture` (`variable arrow`, lines `62-89`, span `28`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/TestData/PanelEChartTestData.ts`
File summary: 1 function implementations. Yes 0, Maybe 0, No 1, N/A 0.

- `createPanelChartLayoutOptionFixture` (`variable arrow`, lines `15-32`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/TestData/PanelTestData.ts`
File summary: 20 function implementations. Yes 0, Maybe 0, No 19, N/A 1.

- `stripUndefinedFields` (`function declaration`, lines `32-38`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for filter` (`call callback`, lines `36-36`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createTagAnalyzerTimeRangeFixture` (`function declaration`, lines `101-109`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerSeriesColumnsFixture` (`function declaration`, lines `117-126`, span `10`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerSeriesConfigFixture` (`function declaration`, lines `134-153`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerFetchSeriesConfigFixture` (`function declaration`, lines `161-175`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerChartSeriesItemFixture` (`function declaration`, lines `183-198`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerChartSeriesListFixture` (`function declaration`, lines `205-207`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `createTagAnalyzerChartDataFixture` (`function declaration`, lines `215-222`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerPanelAxesFixture` (`function declaration`, lines `230-258`, span `29`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerPanelDisplayFixture` (`function declaration`, lines `266-279`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerTimeRangePairFixture` (`function declaration`, lines `287-295`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerPanelDataFixture` (`function declaration`, lines `303-313`, span `11`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerPanelTimeFixture` (`function declaration`, lines `321-347`, span `27`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createEmptyTagAnalyzerPanelTimeFixture` (`function declaration`, lines `355-363`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagAnalyzerPanelInfoFixture` (`function declaration`, lines `371-421`, span `51`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerBoardSourceInfoFixture` (`function declaration`, lines `429-444`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerEditRequestFixture` (`function declaration`, lines `452-465`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createPanelFooterPropsFixture` (`function declaration`, lines `473-492`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createOverlapPanelInfoFixture` (`function declaration`, lines `500-523`, span `24`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/TestData/TagSelectionTestData.ts`
File summary: 7 function implementations. Yes 0, Maybe 0, No 6, N/A 1.

- `createTagSelectionSourceColumnsFixture` (`variable arrow`, lines `18-25`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagSearchItemFixture` (`variable arrow`, lines `34-40`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `createTagSearchItemsFixture` (`variable arrow`, lines `47-50`, span `4`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `createTagSelectionDraftFixture` (`variable arrow`, lines `58-76`, span `19`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagSelectionDraftListFixture` (`variable arrow`, lines `83-85`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `createTagSelectionStateOptionsFixture` (`variable arrow`, lines `92-97`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `isSameSelectedTag` (`property callback`, lines `96-96`, span `1`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.

## `src/components/tagAnalyzer/utils/boardTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/fetch/ApiRepository.test.ts`
File summary: 10 function implementations. Yes 0, Maybe 0, No 0, N/A 10.

- `anonymous callback for mock` (`call callback`, lines `12-15`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `17-21`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `23-28`, span `6`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `30-32`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `34-149`, span `116`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `60-73`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `75-83`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `85-102`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `104-122`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `124-148`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/fetch/ApiRepository.ts`
File summary: 24 function implementations. Yes 0, Maybe 0, No 24, N/A 0.

- `resolveFetchTimeBounds` (`function declaration`, lines `40-65`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildCsvTqlQuery` (`function declaration`, lines `70-72`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `parseChartCsvResponse` (`function declaration`, lines `77-99`, span `23`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getCalculationTableName` (`function declaration`, lines `104-116`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createCalculationQueryContext` (`function declaration`, lines `121-153`, span `33`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveCalculationTimeBucketContext` (`function declaration`, lines `158-195`, span `38`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildTruncatedCalculationTimeBucket` (`function declaration`, lines `200-210`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildScaledCalculationTimeBucket` (`function declaration`, lines `215-229`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildAggregateCalculationQuery` (`function declaration`, lines `234-242`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildAverageCalculationQuery` (`function declaration`, lines `247-255`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildCountCalculationQuery` (`function declaration`, lines `260-268`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildFirstLastCalculationTimeBucket` (`function declaration`, lines `273-289`, span `17`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildFirstLastCalculationQuery` (`function declaration`, lines `294-302`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildCalculationMainQuery` (`function declaration`, lines `307-332`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildRawQuery` (`function declaration`, lines `337-370`, span `34`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchTableName` (`function declaration`, lines `372-398`, span `27`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchCalculationData` (`function declaration`, lines `400-410`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchRawData` (`variable arrow`, lines `412-423`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchVirtualStatTable` (`function declaration`, lines `425-450`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchTablesData` (`function declaration`, lines `452-466`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getRollupTableList` (`function declaration`, lines `468-521`, span `54`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getTagPagination` (`function declaration`, lines `523-553`, span `31`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getMetaTableName` (`function declaration`, lines `555-561`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getTagTotal` (`function declaration`, lines `563-582`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/fetch/ChartMapping.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 3, N/A 1.

- `mapRowsToChartData` (`function declaration`, lines `12-18`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `17-17`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildChartSeriesItem` (`function declaration`, lines `30-47`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `analyzePanelDataLimit` (`function declaration`, lines `59-83`, span `25`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/fetch/FetchHelpers.test.ts`
File summary: 8 function implementations. Yes 0, Maybe 0, No 0, N/A 8.

- `anonymous callback for describe` (`call callback`, lines `3-27`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `4-12`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `5-7`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `9-11`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `14-26`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `15-17`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `19-21`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `23-25`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/utils/fetch/FetchHelpers.ts`
File summary: 2 function implementations. Yes 0, Maybe 0, No 2, N/A 0.

- `getQualifiedTableName` (`function declaration`, lines `9-16`, span `8`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `calculateSampleCount` (`function declaration`, lines `30-52`, span `23`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/fetch/FetchPlanning.ts`
File summary: 10 function implementations. Yes 0, Maybe 0, No 9, N/A 1.

- `loadNavigatorChartState` (`function declaration`, lines `36-47`, span `12`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `loadPanelChartState` (`function declaration`, lines `56-82`, span `27`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `isFetchableTimeRange` (`function declaration`, lines `91-104`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchPanelDatasets` (`function declaration`, lines `124-204`, span `81`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `163-175`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `calculatePanelFetchCount` (`function declaration`, lines `217-232`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolvePanelFetchTimeRange` (`function declaration`, lines `243-256`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolvePanelFetchInterval` (`function declaration`, lines `270-296`, span `27`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchPanelDatasetsFromRequest` (`function declaration`, lines `308-333`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createEmptyFetchPanelDatasetsResult` (`function declaration`, lines `341-349`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/utils/fetch/FetchTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/fetch/FetchUtils.test.ts`
File summary: 43 function implementations. Yes 0, Maybe 0, No 0, N/A 43.

- `anonymous callback for mock` (`call callback`, lines `32-35`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `37-40`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `68-872`, span `805`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `69-72`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `74-93`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `75-79`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `81-92`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `95-138`, span `44`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `105-127`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `129-137`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `140-198`, span `59`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `141-151`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `153-170`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `172-189`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `191-197`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `200-240`, span `41`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `207-222`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `224-239`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `242-259`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `243-258`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `261-273`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `262-268`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `270-272`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `275-565`, span `291`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `276-375`, span `100`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `377-457`, span `81`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous function at line 385` (`anonymous callback`, lines `385-387`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous function at line 388` (`anonymous callback`, lines `388-390`, span `3`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mockImplementationOnce` (`call callback`, lines `393-393`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mockImplementationOnce` (`call callback`, lines `394-394`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for it` (`call callback`, lines `459-529`, span `71`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `531-564`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `567-680`, span `114`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `568-605`, span `38`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `607-644`, span `38`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `646-679`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `682-757`, span `76`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `683-701`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `703-756`, span `54`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `759-871`, span `113`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `760-779`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `781-841`, span `61`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `843-870`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/fetch/Repository.ts`
File summary: 8 function implementations. Yes 0, Maybe 0, No 8, N/A 0.

- `fetchParsedTables` (`function declaration`, lines `29-43`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchTopLevelTimeBoundaryRanges` (`function declaration`, lines `53-62`, span `10`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `fetchSeriesRows` (`function declaration`, lines `78-110`, span `33`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `isConcreteFetchRange` (`function declaration`, lines `119-132`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createEmptyFetchResponse` (`function declaration`, lines `140-147`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `hasSeriesFetchColumns` (`function declaration`, lines `149-157`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `fetchCalculatedSeriesRows` (`function declaration`, lines `170-201`, span `32`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchRawSeriesRows` (`function declaration`, lines `215-243`, span `29`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/fetch/TagSearchRepository.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 5, N/A 1.

- `buildTableColumns` (`function declaration`, lines `53-59`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `getTagTotalFromResponse` (`function declaration`, lines `68-70`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `normalizeTagSearchItems` (`function declaration`, lines `79-86`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `82-85`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `fetchTagSearchColumns` (`function declaration`, lines `95-118`, span `24`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fetchTagSearchPage` (`function declaration`, lines `130-170`, span `41`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/legacy/LegacySeriesAdapter.test.ts`
File summary: 12 function implementations. Yes 0, Maybe 0, No 0, N/A 12.

- `anonymous callback for describe` (`call callback`, lines `11-131`, span `121`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `12-30`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `13-29`, span `17`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `32-61`, span `30`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `33-60`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `63-82`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `64-81`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `84-98`, span `15`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `85-97`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `100-130`, span `31`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `101-115`, span `15`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `117-129`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/legacy/LegacySeriesAdapter.ts`
File summary: 21 function implementations. Yes 0, Maybe 0, No 14, N/A 7.

- `getSourceTagName` (`function declaration`, lines `18-28`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `withNormalizedSourceTagName` (`function declaration`, lines `36-49`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeSourceTagNames` (`function declaration`, lines `57-61`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `anonymous callback for map` (`call callback`, lines `60-60`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `normalizeLegacySeriesConfigs` (`function declaration`, lines `69-73`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `anonymous callback for map` (`call callback`, lines `72-72`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `normalizeLegacyChartSeries` (`function declaration`, lines `81-87`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `toLegacyTagNameItem` (`function declaration`, lines `95-104`, span `10`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `toLegacyTagNameList` (`function declaration`, lines `112-116`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `anonymous callback for map` (`call callback`, lines `115-115`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `toLegacySeriesConfigs` (`function declaration`, lines `124-135`, span `12`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for map` (`call callback`, lines `127-134`, span `8`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `legacySeriesToChartPoints` (`function declaration`, lines `143-154`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `147-147`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `150-153`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `normalizeLegacySeriesConfig` (`function declaration`, lines `162-191`, span `30`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fromLegacyBoolean` (`function declaration`, lines `199-201`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `toLegacyBoolean` (`function declaration`, lines `209-211`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `legacyChartSeriesHasArrays` (`function declaration`, lines `219-226`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `legacyChartSeriesToRows` (`function declaration`, lines `234-236`, span `3`): `No`. Short helper, but giving this logic a stable name still looks reasonable at file scope.
- `anonymous callback for map` (`call callback`, lines `235-235`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/utils/legacy/LegacyStorageAdapter.test.ts`
File summary: 14 function implementations. Yes 0, Maybe 0, No 1, N/A 13.

- `normalizeLegacyPanelInfoForTest` (`function declaration`, lines `16-24`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for describe` (`call callback`, lines `26-754`, span `729`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `27-379`, span `353`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `28-88`, span `61`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `90-167`, span `78`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `169-219`, span `51`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `221-271`, span `51`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `273-378`, span `106`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `381-673`, span `293`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `382-486`, span `105`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `488-567`, span `80`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `569-672`, span `104`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `675-753`, span `79`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `676-752`, span `77`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/legacy/LegacyStorageAdapter.ts`
File summary: 24 function implementations. Yes 0, Maybe 0, No 18, N/A 6.

- `normalizeBoardInfo` (`function declaration`, lines `21-33`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `29-29`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `toLegacyFlatPanelInfo` (`function declaration`, lines `41-91`, span `51`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getNextBoardListWithSavedPanels` (`function declaration`, lines `101-107`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `getNextBoardListWithSavedPanel` (`function declaration`, lines `118-130`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getNextBoardListWithoutPanel` (`function declaration`, lines `140-151`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeLegacyPanelInfo` (`function declaration`, lines `159-161`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `normalizeLegacyFlatPanelInfo` (`function declaration`, lines `169-220`, span `52`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createNormalizedPanelInfo` (`function declaration`, lines `228-297`, span `70`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolvePanelTimeRangeConfig` (`function declaration`, lines `305-311`, span `7`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `updateBoardPanels` (`function declaration`, lines `321-329`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `326-327`, span `2`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `findBoardPanels` (`function declaration`, lines `338-343`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for find` (`call callback`, lines `342-342`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createLegacyPanelList` (`function declaration`, lines `351-353`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `anonymous callback for map` (`call callback`, lines `352-352`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `replaceLegacyPanel` (`function declaration`, lines `363-371`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `370-370`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `removeLegacyPanel` (`function declaration`, lines `380-385`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for filter` (`call callback`, lines `384-384`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `fromLegacyBoolean` (`function declaration`, lines `393-395`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `toLegacyBoolean` (`function declaration`, lines `403-405`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `normalizeNumericValue` (`function declaration`, lines `413-419`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeLegacyTimeKeeper` (`function declaration`, lines `427-431`, span `5`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.

## `src/components/tagAnalyzer/utils/legacy/LegacyStorageAdapterBoardSave.test.ts`
File summary: 7 function implementations. Yes 0, Maybe 0, No 0, N/A 7.

- `anonymous callback for describe` (`call callback`, lines `8-152`, span `145`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `9-87`, span `79`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `10-86`, span `77`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `89-122`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `90-121`, span `32`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `124-151`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `125-150`, span `26`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/legacy/LegacyTimeAdapter.test.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 0, N/A 6.

- `anonymous callback for describe` (`call callback`, lines `7-44`, span `38`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `8-43`, span `36`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `9-14`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `16-28`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `30-35`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `37-42`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/utils/legacy/LegacyTimeAdapter.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 6, N/A 0.

- `normalizeLegacyTimeBoundaryRanges` (`function declaration`, lines `24-41`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeLegacyTimeRangeBoundary` (`function declaration`, lines `50-58`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `toLegacyTimeRangeInput` (`function declaration`, lines `66-79`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `toLegacyTimeValue` (`function declaration`, lines `87-98`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `legacyMinMaxPairToRange` (`function declaration`, lines `107-119`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeLegacyTimeBoundary` (`function declaration`, lines `127-148`, span `22`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/legacy/LegacyTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/panelModelTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/panelRuntimeTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/series/seriesTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.

## `src/components/tagAnalyzer/utils/series/TagAnalyzerSeriesDataUtils.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 3, N/A 1.

- `seriesDataToPoints` (`function declaration`, lines `16-33`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for map` (`call callback`, lines `23-32`, span `10`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `chartRowsToPoints` (`function declaration`, lines `42-46`, span `5`): `No`. Short helper, but giving this logic a stable name still looks reasonable at file scope.
- `chartSeriesToPoints` (`function declaration`, lines `55-59`, span `5`): `No`. Short helper, but giving this logic a stable name still looks reasonable at file scope.

## `src/components/tagAnalyzer/utils/series/TagAnalyzerSeriesLabelUtils.test.ts`
File summary: 10 function implementations. Yes 0, Maybe 0, No 0, N/A 10.

- `anonymous callback for describe` (`call callback`, lines `9-48`, span `40`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `17-27`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `18-22`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `24-26`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `29-33`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `30-32`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `35-47`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `36-38`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `40-42`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `44-46`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/utils/series/TagAnalyzerSeriesLabelUtils.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 4, N/A 0.

- `formatSeriesLabel` (`function declaration`, lines `19-39`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getSeriesShortName` (`function declaration`, lines `48-50`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `getSeriesEditorName` (`function declaration`, lines `59-61`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `getSeriesName` (`function declaration`, lines `71-79`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/utils/series/TagAnalyzerSeriesUtils.test.ts`
File summary: 3 function implementations. Yes 0, Maybe 0, No 0, N/A 3.

- `anonymous callback for describe` (`call callback`, lines `3-39`, span `37`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `4-38`, span `35`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `5-37`, span `33`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/series/TagAnalyzerSeriesUtils.ts`
File summary: 6 function implementations. Yes 0, Maybe 0, No 1, N/A 5.

- `anonymous callback for map` (`call callback`, lines `17-21`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildSeriesSummaryRows` (`function declaration`, lines `34-67`, span `34`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for forEach` (`call callback`, lines `42-64`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for filter` (`call callback`, lines `44-44`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `45-45`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for reduce` (`call callback`, lines `52-52`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.

## `src/components/tagAnalyzer/utils/series/TagSelectionSeriesUtils.test.ts`
File summary: 5 function implementations. Yes 0, Maybe 0, No 0, N/A 5.

- `anonymous callback for describe` (`call callback`, lines `11-60`, span `50`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `12-14`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `16-18`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `20-33`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `35-59`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/series/TagSelectionSeriesUtils.ts`
File summary: 3 function implementations. Yes 0, Maybe 0, No 3, N/A 0.

- `buildDefaultRange` (`function declaration`, lines `17-32`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `buildCreateChartSeed` (`function declaration`, lines `44-61`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `mergeSelectedTagsIntoTagSet` (`function declaration`, lines `71-78`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/utils/time/IntervalUtils.test.ts`
File summary: 13 function implementations. Yes 0, Maybe 0, No 0, N/A 13.

- `anonymous callback for describe` (`call callback`, lines `8-75`, span `68`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `9-20`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `10-15`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `17-19`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `22-33`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `23-28`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `30-32`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `35-68`, span `34`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `36-51`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `53-58`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `60-67`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `70-74`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `71-73`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/utils/time/IntervalUtils.ts`
File summary: 27 function implementations. Yes 0, Maybe 0, No 8, N/A 19.

- `buildIntervalSpec` (`property callback`, lines `32-35`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `39-42`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `46-49`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `53-56`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `60-63`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `67-70`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `74-77`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `81-84`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `88-91`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `95-98`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `102-105`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `109-112`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `116-119`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `123-126`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `130-133`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `137-140`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `buildIntervalSpec` (`property callback`, lines `144-147`, span `4`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `anonymous callback for map` (`call callback`, lines `157-161`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `normalizeTimeUnit` (`function declaration`, lines `169-190`, span `22`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `convertIntervalUnit` (`function declaration`, lines `198-200`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `getTimeUnitMilliseconds` (`function declaration`, lines `209-229`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getIntervalMs` (`function declaration`, lines `238-250`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `calculateInterval` (`function declaration`, lines `264-283`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveInterval` (`function declaration`, lines `291-301`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for find` (`call callback`, lines `292-292`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `formatDurationLabel` (`function declaration`, lines `310-318`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatDurationPart` (`function declaration`, lines `327-329`, span `3`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.

## `src/components/tagAnalyzer/utils/time/PanelRangeResolver.test.ts`
File summary: 23 function implementations. Yes 0, Maybe 0, No 0, N/A 23.

- `anonymous callback for describe` (`call callback`, lines `11-245`, span `235`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeAll` (`call callback`, lines `12-15`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for afterAll` (`call callback`, lines `17-19`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `21-26`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `28-112`, span `85`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `29-51`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `53-72`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `74-90`, span `17`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `92-111`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `114-156`, span `43`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `115-122`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `124-134`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `136-146`, span `11`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `148-155`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `158-196`, span `39`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `159-174`, span `16`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `176-195`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `198-224`, span `27`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `199-217`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `219-223`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `226-244`, span `19`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `227-234`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `236-243`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.

## `src/components/tagAnalyzer/utils/time/PanelRangeResolver.ts`
File summary: 40 function implementations. Yes 0, Maybe 0, No 31, N/A 9.

- `resolvePanelTimeRange` (`function declaration`, lines `73-100`, span `28`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `fallbackRange` (`property callback`, lines `97-98`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `resolveResetTimeRange` (`function declaration`, lines `108-115`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `resolveInitialPanelRange` (`function declaration`, lines `123-130`, span `8`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `fetchTagAnalyzerMinMaxTable` (`function declaration`, lines `139-159`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveTagAnalyzerTimeBoundaryRanges` (`function declaration`, lines `169-181`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeTimeBoundsInput` (`function declaration`, lines `190-205`, span `16`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeTimeRangeConfig` (`function declaration`, lines `213-221`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `isSameTimeRange` (`function declaration`, lines `230-232`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `toConcreteTimeRange` (`function declaration`, lines `240-248`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeResolvedTimeBounds` (`function declaration`, lines `256-276`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeBoardTimeRangeInput` (`function declaration`, lines `284-292`, span `9`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizePanelTimeRangeSource` (`function declaration`, lines `300-319`, span `20`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `setTimeRange` (`function declaration`, lines `328-338`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `restoreTimeRangePair` (`function declaration`, lines `346-367`, span `22`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveGlobalTimeTargetRange` (`function declaration`, lines `376-385`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveEditModeRange` (`function declaration`, lines `396-413`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveTopLevelRange` (`function declaration`, lines `424-437`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveFallbackRange` (`function declaration`, lines `448-462`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `shouldIncludeAbsolutePanelRange` (`function declaration`, lines `471-476`, span `6`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeBoardLastRange` (`function declaration`, lines `485-498`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeEditBoardLastRange` (`function declaration`, lines `506-517`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getDefaultBoardRange` (`function declaration`, lines `526-540`, span `15`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeEditPreviewTimeRange` (`function declaration`, lines `548-559`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeAbsolutePanelRange` (`function declaration`, lines `567-576`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `normalizeNowPanelRange` (`function declaration`, lines `585-597`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getRelativePanelLastRange` (`function declaration`, lines `607-638`, span `32`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolvePanelRangeFromRules` (`function declaration`, lines `646-676`, span `31`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createTagAnalyzerTableTagMap` (`function declaration`, lines `684-715`, span `32`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for forEach` (`call callback`, lines `695-708`, span `14`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for map` (`call callback`, lines `710-714`, span `5`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `getTagAnalyzerBgnEndTimeRange` (`function declaration`, lines `725-775`, span `51`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `anonymous callback for filter` (`call callback`, lines `750-750`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `753-753`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `763-763`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for sort` (`call callback`, lines `764-764`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for map` (`call callback`, lines `766-766`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for sort` (`call callback`, lines `767-767`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `buildConcreteTimeRange` (`function declaration`, lines `784-800`, span `17`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `isCompleteTimeRange` (`function declaration`, lines `808-810`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.

## `src/components/tagAnalyzer/utils/time/PanelRangeUtils.ts`
File summary: 20 function implementations. Yes 0, Maybe 0, No 13, N/A 7.

- `getNavigatorRangeFromEvent` (`function declaration`, lines `23-28`, span `6`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getZoomInPanelRange` (`function declaration`, lines `37-43`, span `7`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getZoomOutRange` (`function declaration`, lines `53-78`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getFocusedPanelRange` (`function declaration`, lines `87-111`, span `25`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `createPanelRangeControlHandlers` (`function declaration`, lines `121-161`, span `41`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `onShiftPanelRangeLeft` (`property callback`, lines `128-132`, span `5`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onShiftPanelRangeRight` (`property callback`, lines `133-137`, span `5`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onShiftNavigatorRangeLeft` (`property callback`, lines `138-142`, span `5`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onShiftNavigatorRangeRight` (`property callback`, lines `143-147`, span `5`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onZoomIn` (`property callback`, lines `150-151`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onZoomOut` (`property callback`, lines `152-156`, span `5`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `onFocus` (`property callback`, lines `157-158`, span `2`): `N/A`. Inline object or config callback scoped to one call site, so abstraction overhead is not really the issue here.
- `getMovedPanelRange` (`function declaration`, lines `171-196`, span `26`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getMovedNavigatorRange` (`function declaration`, lines `206-217`, span `12`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `getClampedNavigatorFocusRange` (`function declaration`, lines `227-250`, span `24`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `getRangeWidth` (`function declaration`, lines `258-260`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `shiftTimeRange` (`function declaration`, lines `269-274`, span `6`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `getDirectionOffset` (`function declaration`, lines `283-286`, span `4`): `No`. Short helper, but it captures a reusable domain transform or formatting step behind a clear name.
- `isRangeOutsideBounds` (`function declaration`, lines `295-297`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `applyRangeUpdate` (`function declaration`, lines `306-315`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/time/RelativeTimeUtils.ts`
File summary: 4 function implementations. Yes 0, Maybe 0, No 4, N/A 0.

- `subtractTimeOffset` (`function declaration`, lines `16-18`, span `3`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `getRelativeTimeOffsetMilliseconds` (`function declaration`, lines `27-44`, span `18`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `resolveLastRelativeBoundaryTime` (`function declaration`, lines `53-61`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `resolveLastRelativeTimeRange` (`function declaration`, lines `70-78`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.

## `src/components/tagAnalyzer/utils/time/TimeRangeFlow.test.ts`
File summary: 42 function implementations. Yes 0, Maybe 0, No 1, N/A 41.

- `anonymous callback for mock` (`call callback`, lines `26-29`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for mock` (`call callback`, lines `31-34`, span `4`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `createBoardRangeParams` (`function declaration`, lines `49-57`, span `9`): `No`. Linear helper with a clear role; short, but not obviously over-abstracted.
- `anonymous callback for describe` (`call callback`, lines `59-594`, span `536`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for beforeEach` (`call callback`, lines `60-63`, span `4`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for mockImplementation` (`call callback`, lines `62-62`, span `1`): `N/A`. Inline callback passed at the call site; shortness alone does not make it an over-extracted helper.
- `anonymous callback for describe` (`call callback`, lines `65-81`, span `17`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `66-72`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `74-80`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `83-174`, span `92`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `84-90`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `92-98`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `100-108`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `110-121`, span `12`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `123-131`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `133-173`, span `41`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `176-232`, span `57`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `177-189`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `191-203`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `205-217`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `219-231`, span `13`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `234-262`, span `29`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `235-254`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `256-261`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `264-284`, span `21`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `265-273`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `275-283`, span `9`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `286-450`, span `165`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `287-308`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `310-333`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `335-359`, span `25`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `361-388`, span `28`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `390-407`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `409-428`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `430-449`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `452-593`, span `142`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `453-474`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `476-499`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `501-524`, span `24`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `526-548`, span `23`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `550-571`, span `22`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `573-592`, span `20`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/time/TimeRangeParsing.test.ts`
File summary: 15 function implementations. Yes 0, Maybe 0, No 0, N/A 15.

- `anonymous callback for describe` (`call callback`, lines `16-139`, span `124`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for describe` (`call callback`, lines `17-55`, span `39`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `20-27`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `29-36`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `38-45`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `47-54`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `57-74`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `58-64`, span `7`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `66-73`, span `8`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `76-93`, span `18`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `77-82`, span `6`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `84-88`, span `5`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for it` (`call callback`, lines `90-92`, span `3`): `N/A`. Test-body callback passed directly to the test runner; this is not an extracted abstraction.
- `anonymous callback for describe` (`call callback`, lines `95-138`, span `44`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.
- `anonymous callback for it` (`call callback`, lines `96-137`, span `42`): `N/A`. Inline callback rather than an extracted helper, but it is large enough that a named local might read better.

## `src/components/tagAnalyzer/utils/time/TimeRangeParsing.ts`
File summary: 17 function implementations. Yes 0, Maybe 0, No 17, N/A 0.

- `createRelativeTimeBoundary` (`function declaration`, lines `57-70`, span `14`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `parseTimeRangeInputValue` (`function declaration`, lines `78-96`, span `19`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatTimeRangeInputValue` (`function declaration`, lines `104-115`, span `12`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatAxisTime` (`function declaration`, lines `124-140`, span `17`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `isEmptyTimeBoundary` (`function declaration`, lines `148-152`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isAbsoluteTimeBoundary` (`function declaration`, lines `160-164`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isRelativeTimeBoundary` (`function declaration`, lines `172-176`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isLastRelativeTimeBoundary` (`function declaration`, lines `184-188`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isNowRelativeTimeBoundary` (`function declaration`, lines `196-200`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isRelativeTimeRangeConfig` (`function declaration`, lines `208-212`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isLastRelativeTimeRangeConfig` (`function declaration`, lines `220-224`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isNowRelativeTimeRangeConfig` (`function declaration`, lines `232-236`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `isAbsoluteTimeRangeConfig` (`function declaration`, lines `244-248`, span `5`): `No`. Compact check, but the name gives the surrounding code a clear domain or type-guard vocabulary.
- `resolveTimeBoundaryValue` (`function declaration`, lines `256-276`, span `21`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `hasTimeRangeConfigBoundaries` (`function declaration`, lines `285-294`, span `10`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `parseRelativeTimeBoundary` (`function declaration`, lines `302-314`, span `13`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.
- `formatRelativeTimeBoundaryExpression` (`function declaration`, lines `324-334`, span `11`): `No`. There is enough logic, state shaping, or branching here that keeping a named boundary looks justified.

## `src/components/tagAnalyzer/utils/time/timeTypes.ts`
File summary: 0 function implementations. Yes 0, Maybe 0, No 0, N/A 0.

No implemented functions detected in this file.
