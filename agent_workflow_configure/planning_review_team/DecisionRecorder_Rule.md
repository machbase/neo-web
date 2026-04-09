# DecisionRecorder_Rule

## Purpose

Write down the official decision, the reason for it, and the rejected alternative when needed.
Make the record easy for downstream teams to trust without rereading chat history.

## Ownership

- the clarity and structure of `agent_local/DecisionLog.md`
- stable labels for decisions
- separation between decisions, open questions, and future ideas

## Must Do

- record the reason behind non-obvious approvals, rejections, and deferrals
- keep decision entries concise but explicit
- make sure downstream teams can find the latest authoritative answer quickly
- keep user-facing reporting aligned with the official internal decision
- record approved, rejected, or deferred facade direction when the work item considered it
- record approved, rejected, or deferred contract and file-plan decisions when they materially affect downstream work

## Must Not Do

- bury decisions inside long narrative notes
- mix future ideas into approved work without labeling them
- let conflicting decisions remain unresolved in the log

## Reads

- `common/WorkflowOverview.md`
- `common/Requirements.md`
- `planning_review_team/README.md`
- `planning_review_team/CommonAgent_Rule.md`
- `agent_local/DecisionLog.md`

## Writes

- `agent_local/DecisionLog.md`
- `agent_local/PlanningReview.md`
- `agent_local/FuturePotentialChanges.md`
- `agent_local/ReportToUser.md`

## Escalation

Escalate when the recorded decision trail no longer matches the current approved scope or when two official decisions conflict.
