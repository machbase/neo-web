# Agent Workflow Configure

This folder is a portable three-team workflow package.
Copy it into a different repository when you want the same planning, review, declarative contract, test, and implementation process.

Project-specific requests, reports, review history, and active work items do not belong here.
Keep those in the repo-level `agent_local/` folder so `agent_workflow_configure/` stays portable.

## Root Layout

This package should have exactly four root folders:

- `common/`
- `planning_review_team/`
- `test_team/`
- `implementation_team/`

The `common/` folder is the shared rulebook.
It describes how every team folder should be organized and how the cross-team workflow should run.

## Bootstrap Files

Use the root bootstrap files when you first copy this package into a new repository:

- `InitializeAgentLocal.sh`
- `InitializeAgentLocal.ps1`

These files create the standard local `agent_local/` workspace, including the one-time notification topic file.

## Completion Notification

Notification setup and sending are the one exception that live in their own guide:

- `NotificationGuide.md`

All agents should read `NotificationGuide.md` as well as their team `README.md`.
Notifications are immediate and team-based.
Use the dedicated team scripts from `NotificationGuide.md`, not lead names or generic assistant names.

## Team Folder Structure

Each team folder should stay flat and predictable.
Every non-common team folder should contain only:

- `README.md`
- `CommonAgent_Rule.md`
- six generic role rule files ending in `_Rule.md`

The `README.md` is the single team guide that a team agent should read first.
The rule files define agent behavior.
Do not use personal names in rule files.

If the exact role behavior is not known yet, keep the generic rule file and let later agents fill it in.

## Team Sequence

1. Planning/Review team defines scope, reviews the codebase, shapes any needed top-level facade direction, and writes the declarative contract, file plan, and function behavior spec.
2. Test team writes required tests from the approved Planning/Review packet before implementation begins.
3. Implementation team writes the code needed to satisfy the approved behavior and existing tests.
4. Test team adds harder edge cases, regressions, and break tests after the first implementation pass.
5. Implementation team fixes the failures without widening scope unless Planning/Review re-approves it.
6. Planning/Review team signs off, records rejected or deferred follow-ups, and closes the loop.

## Recommended Agents

Create at least one lead agent for each team:

- Planning/Review lead
- Test lead
- Implementation lead

You can add helpers inside a team when the task is large, but the lead agent for that team should own the official handoff document.

There is no separate facade team in this package.
Facade responsibilities and declaration responsibilities are both merged into the Planning/Review team's six-agent structure, primarily through the planning lead and merged scope-and-facade reviewer role.

## Recommended Local Files

These files should live in `agent_local/`, not in this portable package:

- `agent_local/PlanningReview.md`
- `agent_local/DecisionLog.md`
- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`
- `agent_local/ImplementationLog.md`
- `agent_local/ReportToUser.md`

## How To Reuse In A New Project

1. Copy `agent_workflow_configure/` into the new repository root.
2. Run `InitializeAgentLocal.sh` or `InitializeAgentLocal.ps1` to create the standard `agent_local/` files.
3. Ask the user for the `ntfy.sh` topic name if `agent_local/NotificationTopic.md` is still unset.
4. Read `NotificationGuide.md`.
5. Run `SendCompletionNotification.sh NotificationSetup` or `SendCompletionNotification.ps1 -TeamName NotificationSetup` once so the notification command can be approved for later reuse.
6. Read `common/README.md`, `common/WorkflowOverview.md`, and `common/Requirements.md`.
7. Read each team folder's `README.md`.
8. Add or fill the generic role rule files in each team folder if your project needs different team behavior.
9. Run work through the team sequence instead of skipping directly to implementation.
10. Use the dedicated team notification script immediately when a team pass, assigned task, or user-facing reply is done.
11. Keep project-specific history in `agent_local/` and keep this folder reusable.

## Quick Start

If you want the shortest setup path in a new repo:

1. copy `agent_workflow_configure/` into the repo root
2. run `InitializeAgentLocal.sh` or `InitializeAgentLocal.ps1`
3. set `agent_local/NotificationTopic.md`
4. read `NotificationGuide.md`
5. run `SendCompletionNotification.sh NotificationSetup` or `SendCompletionNotification.ps1 -TeamName NotificationSetup` once
6. read `common/README.md`
7. create or wake the three team leads and tell each team to read its folder `README.md` and `NotificationGuide.md`
