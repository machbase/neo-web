# Common

This folder holds the shared rules for the full three-team workflow.
Every team should read these files before using the team-specific folder.

## Read Order

1. `WorkflowOverview.md`
2. `Requirements.md`
3. `RuleFileTemplate.md`

## Folder Structure

- `README.md`: explains what `common/` is for and what order to read it in
- `WorkflowOverview.md`: defines the cross-team workflow
- `Requirements.md`: defines shared code, writing, and folder-structure rules
- `RuleFileTemplate.md`: shared template for writing agent rule files

## Team Folder Structure

Each non-common team folder should stay flat.
Do not create subfolders inside a team folder unless the user explicitly changes the structure later.

Every non-common team folder should contain:

- `README.md`
- `CommonAgent_Rule.md`
- six generic role rule files ending in `_Rule.md`

`README.md` is the one team guide file.
That file should explain the team purpose, workflow position, handoff expectations, local files, and what each of the six role rule files is for.

## Agent Rule Naming

Rule file names should:

- be role-based, not person-based
- end with `_Rule.md`
- stay generic enough to reuse in another project

Examples:

- `ScopeFacadeReviewer_Rule.md`
- `UnitTestAuthor_Rule.md`
- `BehaviorImplementer_Rule.md`

## Rule File Requirements

Each rule file should describe:

- the role purpose
- what the agent owns
- what the agent must do
- what the agent must not do
- which local files the agent reads or writes
- when the agent must escalate

## Required Team Files

Each non-common team folder uses one guide file and seven rule files.

`README.md`:

- defines the team's purpose
- explains where the team fits in the workflow
- lists the team's main do and do-not rules
- describes what each of the six role rule files is for

`CommonAgent_Rule.md`:

- defines rules shared by every agent in that team
- defines team-wide escalation and handoff behavior
- defines what all agents in the team must read first

six generic `*_Rule.md` files:

- each file defines one reusable role
- use generic names such as `CodeReviewer_Rule.md` instead of personal names
- store behavior, authority, escalation, and handoff expectations for each role

## Ownership

- `common/` defines cross-team workflow rules.
- Team folders define team-specific responsibilities and outputs.
- `agent_local/` stores the real project work items, reports, and handoff history.
