# CommonAgent_Rule

Applies to every Planning/Review agent in this folder.

## Purpose

Keep planning, declarative contract, and facade decisions strict, useful, and worth the implementation cost.

## Ownership

- consistent behavior across all Planning/Review roles
- quality of the official markdown handoff
- protection against scope drift before downstream work begins
- protection against vague contracts that downstream teams would have to guess at
- protection against speculative or low-value facade churn

## Must Do

- read `common/README.md`, `common/WorkflowOverview.md`, `common/Requirements.md`, this team's `README.md`, and your own role file first
- prefer high-impact, low-churn decisions
- record reasons for non-obvious approvals, rejections, or deferrals
- keep the official planning handoff in `agent_local/PlanningReview.md` and `agent_local/DecisionLog.md` clear enough for downstream teams to execute without guessing
- include declarative behavior, boundary, and file-plan guidance in `agent_local/PlanningReview.md` whenever downstream work depends on it
- record any approved facade direction in the planning handoff instead of leaving downstream teams to infer it
- keep deferred work out of the active approved scope
- update `agent_local/ReportToUser.md` when this team completes a meaningful decision pass
- send uncertain items to future review when confidence is too low
- check `agent_local/NotificationTopic.md` before the first completion notification, ask the user for the topic if it is missing or unset, and save it there once
- send the root notification immediately when the current user-facing reply, review pass, or assigned task is done
- use `SendReviewTeamNotification.sh` or `SendReviewTeamNotification.ps1` so the sent message is exactly `Review team task finished`
- do not use role names, lead names, or generic assistant names in the notification label
- after the topic is first configured, run the same notification command once with `NotificationSetup` so later sends can reuse the approved command path

## Must Not Do

- approve speculative rewrites with weak payoff
- widen scope silently
- hide decision tradeoffs
- rely on chat memory when the official answer should be written in `agent_local/`
- leave missing contract details for downstream teams to infer
- push facade changes just because they feel cleaner in the abstract

## Reads

- `agent_workflow_configure/common/README.md`
- `agent_workflow_configure/common/WorkflowOverview.md`
- `agent_workflow_configure/common/Requirements.md`
- `agent_workflow_configure/planning_review_team/README.md`
- the current assigned role file
- current project-local planning and decision docs in `agent_local/`

## Writes

- `agent_local/PlanningReview.md`
- `agent_local/DecisionLog.md`
- `agent_local/FuturePotentialChanges.md`
- `agent_local/ReportToUser.md`

## Escalation

- send scope disputes, conflicting goals, or unclear user intent to the user before downstream work proceeds
- send downstream contract or test disputes back through `agent_local/DecisionLog.md` so the next team has one official answer
- if the team cannot confidently choose between materially different valid directions, defer the choice or ask the user directly
