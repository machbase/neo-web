# Code Readability Guide

This repo moves quickly. The goal of this guide is to keep new and changed code easier to read, review, and maintain.

Use it as guidance for active work, not as a reason to rewrite stable code without a clear payoff.

## Current priorities

These are recurring readability problems already visible in the codebase and should be treated as cleanup priorities when touching nearby code:

- oversized chart option builders that mix layout, policy, and rendering details
- controller-heavy React components with multiple unrelated effects
- duplicated modal and editor workflows
- repeated axis and form sections with string-key updates
- helper functions built from long condition ladders instead of named rules

## Core rules

- Give each module one main job.
  UI rendering, fetch orchestration, runtime coordination, and chart-option assembly should not all live in the same function or component.

- Prefer explicit domain types over `any`.
  If data crosses a module boundary, give it a named type.

- Name for meaning, not variable category.
  Prefer `panelState`, `tagList`, and `seriesList` over prefix-heavy names like `p*`, `s*`, and `a*`.

- Extract shared workflows before copying them.
  If two views search tags, paginate, select rows, or build similar chart state in the same way, share the behavior.

- Keep render paths declarative.
  Move repeated JSX blocks, repeated inline handlers, and mixed UI/business logic into small helpers or subcomponents when patterns repeat.

- Prefer typed updates over string-key updates.
  When the shape is known, use typed functions or typed config objects instead of passing field names around as strings.

- Replace policy ladders with named rules.
  Long threshold chains and magic-number branches should become named constants, rule tables, or dedicated policy helpers.

## Module boundaries

- Components own rendering and user interaction.
- Hooks own local orchestration and effect wiring.
- Utils own pure calculations.
- API helpers own fetch and response shaping.
- Chart builders should assemble options from prepared view data, not also own unrelated fetch and runtime decisions.
- Keep `useEffect` focused on one synchronization concern.
- Prefer derived state over mirrored refs unless an imperative API truly requires a ref.

## Naming and typing

- Prefer full domain names such as `panelInfo`, `selectedTags`, `visibleRange`, and `isRawMode`.
- Avoid new `s*`, `p*`, and `a*` prefixes.
- Type chart events, API rows, modal payloads, and helper return values at the boundary where they enter the app.
- If a function returns more than one field, consider a named type alias or interface.

## Duplication and conditionals

- One workflow should have one implementation.
- If two sections differ only by labels and field names, render them from a small config object instead of duplicating JSX.
- If a helper reads like a long series of `if` thresholds, rewrite it as data plus a small evaluator.

## Review checklist

- Can this file's job be explained in one sentence?
- Would a teammate understand the variable names without scanning multiple screens first?
- Is the same workflow already implemented somewhere else?
- Are repeated string keys hiding a missing type or config object?
- Is this component acting like a controller that should be a hook or utility?
