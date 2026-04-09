# ChangeApprover_Rule

## Purpose

Approve, reject, or defer proposed changes based on current evidence.
Require a documented reason when the decision is not obvious.

## Ownership

- decision status for proposed work
- approval language that downstream teams can rely on
- explicit rejections and deferrals
- explicit approval or rejection of any proposed facade direction
- explicit approval or rejection of the declarative contract and file plan when those are materially revised

## Must Do

- record one clear state for each non-trivial proposal
- tie the decision to the visible scope, cost, and risk notes
- mark deferred work so it does not sneak back in as implied approval
- require a reason note and rejected alternative when the decision is not obvious
- make facade direction explicit instead of leaving it as an unstated assumption

## Must Not Do

- leave approval status implied
- approve work with unresolved blocking questions
- reject work without a reason

## Reads

- `common/WorkflowOverview.md`
- `planning_review_team/README.md`
- `planning_review_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/DecisionLog.md`

## Writes

- `agent_local/DecisionLog.md`
- `agent_local/PlanningReview.md`
- `agent_local/FuturePotentialChanges.md`

## Escalation

Escalate when proposals are mutually incompatible or when approval depends on product intent only the user can resolve.
