# Folder Audit: `tagSelection`

- Date: 2026-04-22
- Responsibility: tag-selection UI, tag-selection state, and tag-selection-specific data access.
- This folder should own the whole tag-selection flow from table search input to selected draft rows.
- It should not send general chart repositories or panel runtime helpers back into `utils/fetch`.

## Current Owners

- UI: `TagSelectionPanel.tsx`, `TagSelectionModeRow.tsx`
- State: `useTagSelectionState.ts`
- Presentation/helpers: `tagSelectionPresentation.ts`, `tagSelectionPanelHelpers.ts`
- Shared constants/types: `TagSelectionConstants.ts`, `TagSelectionTypes.ts`
- Data access: `TagSelectionSearchRepository.ts`

## Boundary Notes

- `TagSelectionSearchRepository.ts` belongs here because its queries only exist to support the tag-selection flow.
- Shared fetch error presentation can stay imported from `utils/fetch` because that is still a fetch-layer concern.

## Watch Next

- `useTagSelectionState.ts` is still a large state owner and may want a later split between search paging and selected-draft editing.
- `TagSelectionPanel.tsx` is still the largest UI owner in this folder.
