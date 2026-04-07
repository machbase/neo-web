# Recoil Usage

This project uses Recoil as the shared app-state layer.

## Where it starts

- Main app: `src/App.tsx`
- Public dashboard: `src/public-dashboard/PublicApp.tsx`

Each app has its own `RecoilRoot`.

## What lives in Recoil

- Workspace state
  `gBoardList`, `gSelectedTab`, `gSelectedBoard`

- Shared metadata
  `gTables`, `gRollupTableList`

- Feature-wide collections
  file tree, bridge/subscriber state, timers, shells, keys, websocket logs, app-store search results

## Patterns used here

- Atoms
  Shared mutable state used across distant components.

- Read selectors
  Derived state such as “currently selected board” or filtered package lists.

- Writable selectors
  Centralized write commands, especially in file-tree and bridge/subscriber flows.

- Atom effects
  Startup hydration such as media-server config from local storage.

## Why it helps

- Removes prop drilling across the workspace UI.
- Gives one source of truth for board and tab state.
- Keeps derived state out of component bodies.
- Centralizes tricky multi-step updates.
- Lets feature-local transient state stay in `useState`.

## TagAnalyzer specifically

TagAnalyzer uses Recoil for shared dependencies, not for all chart runtime state.

It reads or writes:

- `gTables`
- `gRollupTableList`
- `gBoardList`
- `gSelectedTab`

That lets TagAnalyzer keep chart ranges and preview behavior local while still participating in the app-wide board model.
