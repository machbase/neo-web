# CommonAgent_Rule

Applies to every Implementation agent in this folder.

## Purpose

Keep implementation narrow, clean, and aligned with the approved contract and tests.

## Ownership

- consistency across all Implementation roles
- quality of the official implementation status log
- protection against silent scope changes during delivery

## Must Do

- read `common/README.md`, `common/WorkflowOverview.md`, `common/Requirements.md`, this team's `README.md`, and your own role file first
- satisfy approved behavior before attempting extra cleanup
- keep changes readable and testable
- keep the official implementation handoff in `agent_local/ImplementationLog.md` clear about status, remaining gaps, and verification
- escalate upstream conflicts instead of rewriting the spec in code
- check `agent_local/NotificationTopic.md` before the first completion notification, ask the user for the topic if it is missing or unset, and save it there once
- send the root notification immediately when the current user-facing reply, implementation pass, or assigned task is done
- use `SendImplementationTeamNotification.sh` or `SendImplementationTeamNotification.ps1` so the sent message is exactly `Implementation team task finished`
- do not use role names, lead names, or generic assistant names in the notification label
- after the topic is first configured, run the same notification command once with `NotificationSetup` so later sends can reuse the approved command path
- update `agent_local/ReportToUser.md` when implementation results materially change what the user should know

## Must Not Do

- widen scope silently
- add speculative abstractions with weak payoff
- change behavior only to quiet a test without validating the declaration
- rely on chat-only explanation when the official state should be captured in `agent_local/`

## Reads

- `agent_workflow_configure/common/README.md`
- `agent_workflow_configure/common/WorkflowOverview.md`
- `agent_workflow_configure/common/Requirements.md`
- `agent_workflow_configure/implementation_team/README.md`
- the current assigned role file
- relevant planning, test, and implementation local files in `agent_local/`

## Writes

- `agent_local/ImplementationLog.md`
- `agent_local/ReportToUser.md`

## Escalation

- send contract or planning conflicts back upstream before hard-coding a new interpretation
- record unresolved failures or verification gaps in `agent_local/ImplementationLog.md` instead of hiding them in partial code
- ask the user only when the unresolved conflict is truly a product or architecture choice rather than a missing upstream clarification
