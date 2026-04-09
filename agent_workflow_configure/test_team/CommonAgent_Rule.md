# CommonAgent_Rule

Applies to every Test agent in this folder.

## Purpose

Keep tests behavioral, meaningful, and hard enough to expose weak implementations.

## Ownership

- consistency across all Test roles
- quality of the official test packet
- protection against implementation-driven test design

## Must Do

- read `common/README.md`, `common/WorkflowOverview.md`, `common/Requirements.md`, this team's `README.md`, and your own role file first
- derive tests from the approved Planning/Review contract rather than implementation details
- cover success, failure, and edge conditions where relevant
- return later with harder break tests after the first implementation pass
- keep the official test handoff in `agent_local/TestPlan.md` and `agent_local/BreakTests.md` readable enough that implementation can act on it directly
- check `agent_local/NotificationTopic.md` before the first completion notification, ask the user for the topic if it is missing or unset, and save it there once
- send the root notification immediately when the current user-facing reply, test pass, or assigned task is done
- use `SendTestTeamNotification.sh` or `SendTestTeamNotification.ps1` so the sent message is exactly `Test team task finished`
- do not use role names, lead names, or generic assistant names in the notification label
- after the topic is first configured, run the same notification command once with `NotificationSetup` so later sends can reuse the approved command path
- keep required first-pass tests and later break tests clearly separated

## Must Not Do

- encode ambiguous behavior as fact
- write brittle tests tied to incidental structure
- skip documenting important coverage gaps
- rely on chat-only discussion when the official test expectation should be written in `agent_local/`

## Reads

- `agent_workflow_configure/common/README.md`
- `agent_workflow_configure/common/WorkflowOverview.md`
- `agent_workflow_configure/common/Requirements.md`
- `agent_workflow_configure/test_team/README.md`
- the current assigned role file
- relevant planning, test, and implementation local files in `agent_local/`

## Writes

- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`
- `agent_local/ReportToUser.md`

## Escalation

- send contract gaps or Planning/Review disagreements upstream before turning them into required tests
- record break-loop disagreements in `agent_local/BreakTests.md` instead of silently changing scope
- ask the user only when the disagreement is really about product behavior rather than missing contract clarity
