# Recoil Usage In This Project

This note explains how Recoil is being used across the project, what kinds of state live in Recoil, and what practical benefits that brings to this codebase.

This document is stored under `src/components/tagAnalyzer` to respect the current edit boundary, but its scope is the wider application.

## Where Recoil starts

The main application is wrapped in `RecoilRoot` in:

- `src/App.tsx`

The public dashboard has its own separate `RecoilRoot` in:

- `src/public-dashboard/PublicApp.tsx`

That means the project uses two independent Recoil state trees:

- the main app state tree
- the public-dashboard state tree

This separation is useful because the public dashboard does not need to share live state with the full internal application.

## Where the Recoil state is defined

The main app store is split by concern under:

- `src/recoil/recoil.ts`
- `src/recoil/fileTree.ts`
- `src/recoil/appStore.ts`
- `src/recoil/websocket.ts`
- `src/recoil/workSheet.ts`

The public dashboard mirrors part of that structure in:

- `src/public-dashboard/recoil/recoil.ts`

This structure shows that Recoil is not being used as one giant global bag. Instead, the project organizes global state by feature area.

## The main patterns used in this project

### 1. Recoil atoms hold shared application state

Atoms are used for state that needs to be read and updated from multiple distant parts of the UI.

Examples:

- `gBoardList`: the open boards/tabs/workspace list
- `gSelectedTab`: the active tab id
- `gTables`: loaded table metadata
- `gRollupTableList`: loaded rollup table metadata
- `gExtensionList` and `gSelectedExtension`: side-panel navigation state
- `gTimerList`, `gShellList`, `gBridgeList`, `gKeyList`: feature-specific global collections
- `gWsLog`: websocket log stream
- `gFileTree`: file explorer tree data
- `gSearchPkgs`: app store search results
- `gSaveWorkSheets`: worksheet save data

These atoms are global enough that passing them down through props would be awkward and brittle.

### 2. Recoil selectors compute derived state

Selectors are used where the project wants a derived view of existing atoms rather than storing duplicate state.

Examples:

- `gSelectedBoard` derives the active board from `gBoardList` + `gSelectedTab`
- `gShowShellList` filters shell items down to editable ones
- `gBridgeNameList` derives only the bridge names needed by consumers
- `gInstalledPkgs`, `gExactPkgs`, `gPossiblePkgs`, `gBrokenPkgs` split the app-store search response into useful subsets
- `gFileTreeRoot` exposes the current tree root

This keeps the source state normalized while giving components simpler read models.

### 3. Some selectors are used as write commands

The project also uses writable selectors, not just read-only selectors.

This is especially visible in:

- `src/recoil/fileTree.ts`
- `src/recoil/recoil.ts`

Examples:

- `gUpdateFileTree`
- `gDeleteFileTree`
- `gReplaceTree`
- `gCopyFileTree`
- `gAddSubr`
- `gDelSubr`
- `gStateSubr`

These writable selectors behave like centralized update commands. Instead of spreading tree-manipulation or bridge/subscriber update logic across many components, the mutation logic lives in one place.

### 4. Recoil is used for cross-feature coordination

One of the strongest examples is the board/tab model.

`gBoardList` and `gSelectedTab` are read by many unrelated parts of the UI, including:

- main content rendering
- file open/save flows
- dashboard and TagAnalyzer editors
- side panels
- shell/timer/bridge/camera pages

That means Recoil is acting as the shared workspace state layer for the app.

### 5. Recoil is used for async bootstrapping inputs

Some global data is fetched once and then shared broadly through Recoil.

Examples:

- `TagAnalyzer.tsx` loads table metadata and rollup metadata, then writes `gTables` and `gRollupTableList`
- `PublicApp.tsx` loads rollup table metadata once and stores it in the public Recoil tree

This avoids duplicate fetches and keeps multiple consumers aligned on the same shared reference data.

### 6. Recoil is used alongside React local state, not instead of it

The codebase does not put everything in Recoil.

Local UI state still uses `useState` when the state is only relevant inside one component or one short subtree.

Examples of local state that stay local:

- editor draft-only toggles and modal visibility
- hover/open state
- temporary drag/select state
- preview runtime state inside the TagAnalyzer editor

So the project is using Recoil mainly for:

- shared state
- app-wide coordination state
- derived global state

and not for every transient interaction.

## Concrete examples by feature

### Workspace and boards

The most important shared state in the app is the board/workspace model.

In `src/recoil/recoil.ts`:

- `gBoardList` stores the open boards
- `gSelectedTab` stores which board is active
- `gSelectedBoard` derives the active board object

In `src/components/mainContent/MainContent.tsx`, those values are used to:

- render the active content panel
- switch tabs
- save the current board
- close tabs
- coordinate feature-specific active items when tabs close

Benefit:

- many distant components can stay in sync around the same active workspace without prop chains

### TagAnalyzer

TagAnalyzer uses Recoil mainly as a shared dependency source rather than as its full runtime state container.

In `src/components/tagAnalyzer/TagAnalyzer.tsx`:

- `gTables` is filled with parsed table metadata
- `gRollupTableList` is filled with rollup metadata
- `gBoardList` is updated when panel state is saved or deleted

In files like:

- `panel/PanelBoardChart.tsx`
- `editor/PanelEditorPreviewChart.tsx`
- `modal/OverlapModal.tsx`

Recoil values such as `gRollupTableList` and `gSelectedTab` are read to support fetch logic and board coordination.

Benefit:

- TagAnalyzer can keep complex chart runtime state local while still participating in the app-wide board model and shared metadata model

### File Explorer

`src/recoil/fileTree.ts` is a good example of using Recoil as a feature state module.

It stores:

- the current file tree
- recent paths
- rename/delete selections

It also defines reusable update logic through writable selectors such as:

- `gUpdateFileTree`
- `gDeleteFileTree`
- `gReplaceTree`
- `gCopyFileTree`

Benefit:

- tree mutations are centralized instead of being reimplemented in every file dialog or explorer view

### Bridge and subscriber state

`src/recoil/recoil.ts` contains bridge-related atoms and writable selectors:

- `gBridgeList`
- `gActiveBridge`
- `gActiveSubr`
- `gAddSubr`
- `gDelSubr`
- `gStateSubr`

These selectors update both:

- the bridge tree itself
- the related board/tab state when needed

Benefit:

- one write can keep multiple related global states consistent

### WebSocket logging

`src/recoil/websocket.ts` defines `gWsLog`.

`src/context/WebSocketContext.tsx` pushes websocket lifecycle and message log entries into that atom.

Benefit:

- websocket events can be captured centrally and rendered anywhere in the UI without coupling log consumers directly to the socket implementation

### App Store search results

`src/recoil/appStore.ts` stores the raw search result once in `gSearchPkgs`, then exposes filtered selectors:

- `gInstalledPkgs`
- `gExactPkgs`
- `gPossiblePkgs`
- `gBrokenPkgs`

Benefit:

- consumers read only the slice they need
- derived filtering logic is defined once
- the raw response shape stays normalized

## Recoil features this project is actively using

### Atoms

Used for shared mutable state.

Benefit:

- gives the app a single source of truth for data that multiple screens and panels need at once

### Read selectors

Used for derived state.

Benefit:

- avoids duplicating computed state in many components
- keeps component code smaller and easier to read

### Writable selectors

Used as centralized mutation commands.

Benefit:

- keeps complicated state update rules in one place
- makes multi-step updates more consistent

### Atom effects

Used at least in `gMediaServer` to hydrate initial state from `localStorage`.

Benefit:

- lets global state boot with persisted values without adding the hydration code to every consumer

### Multiple Recoil roots

Used for:

- main application
- public dashboard

Benefit:

- clean separation between internal and public state scopes
- avoids accidental state sharing across app modes

## The main benefits Recoil brings to this project

### 1. It removes a lot of prop drilling

Many parts of the UI are siblings or live in different branches:

- side panels
- tab headers
- main board content
- modals
- editor shells

Recoil lets them share state directly without routing that state through many intermediate components.

### 2. It gives the project a single source of truth for app-wide state

For things like:

- current board list
- selected tab
- file tree
- shared metadata
- websocket logs

Recoil ensures the app is reading from one canonical place instead of many local copies.

### 3. It keeps derived state out of component bodies

Selectors like `gSelectedBoard` and `gInstalledPkgs` remove repeated filtering/mapping logic from components.

That reduces duplication and makes components more declarative.

### 4. It centralizes tricky update logic

Writable selectors in the file tree and bridge features package up logic that would otherwise be repeated in event handlers all over the app.

That is especially useful when one action needs to update multiple related structures.

### 5. It works well with the app's mixed architecture

This project has:

- large feature pages
- many side panels
- modal-driven flows
- websocket-driven updates

Recoil fits well because components can subscribe only to the pieces of state they care about.

### 6. It lets feature-local state stay local

The project is not forced into making everything global.

The current pattern is healthy in this sense:

- global shared state goes to Recoil
- transient local interaction state stays in `useState`

That keeps the global store from becoming overloaded with short-lived UI details.

## What Recoil is not doing here

Recoil is not the full business-logic layer of the app.

The project still relies on:

- local component state for transient interactions
- utility modules for transformation logic
- context for websocket connection lifecycle
- direct async fetch functions for server communication

So Recoil is mainly the shared state and derived state layer, not the only state tool in the project.

## Practical summary

In this codebase, Recoil is being used as a lightweight global state layer for:

- workspace and tab coordination
- shared reference data
- feature-wide collections
- derived selectors
- centralized write commands
- persisted startup state

The exact benefits are:

- less prop drilling
- cleaner cross-feature coordination
- single-source-of-truth state
- reusable derived state
- safer centralized updates
- simpler consumers across a large multi-panel UI

That makes it a good fit for this project’s structure, where many distant components need to stay synchronized around the same shared application state.
