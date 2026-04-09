# Planning Review Team

Read this file first.
It is the single team guide for the Planning/Review team.

## Purpose

This team owns scope, cost control, approval, rejection, declarative contract writing, final review, and top-level facade direction.
It is the first gate in the workflow and the final decision point when downstream teams disagree.

## Workflow Position

This team starts the delivery loop and closes it.
It decides what should move forward, what should be cut, what should wait, what top-level facade direction should exist, what declarative contract and file plan downstream teams should follow, and what must not change without review.

## Folder Structure

- `README.md`: the one team guide this team should read first
- `CommonAgent_Rule.md`: rules shared by every Planning/Review agent
- `PlanningLead_Rule.md`: lead owner of the official planning handoff
- `ScopeFacadeReviewer_Rule.md`: scope sizing, outward boundary review, and top-level facade recommendation
- `CostReviewer_Rule.md`: impact-versus-cost review
- `RiskReviewer_Rule.md`: regression and rollout risk review
- `ChangeApprover_Rule.md`: approve, reject, or defer proposals
- `DecisionRecorder_Rule.md`: write the official decision trail

## What This Team Produces

This team should update the project-local planning and decision files in `agent_local/`.
Its output should define approved scope, declarative behavior contracts, file ownership, approved facade direction when needed, rejected work, deferred work, and the reason behind non-obvious decisions.

## Required Local Files

- `agent_local/PlanningReview.md`: the active approved scope, declarative contract, file ownership, acceptance criteria, and approved facade direction when needed
- `agent_local/DecisionLog.md`: the official decision history and reasoning
- `agent_local/FuturePotentialChanges.md`: deferred or uncertain ideas that should not enter active scope yet
- `agent_local/ReportToUser.md`: short user-facing summary of what this team decided

If a project uses different local filenames, the same responsibilities should still be mapped clearly before work starts.

## Required Read Order

1. `agent_workflow_configure/common/README.md`
2. `agent_workflow_configure/common/WorkflowOverview.md`
3. `agent_workflow_configure/common/Requirements.md`
4. this `README.md`
5. the current agent's assigned `*_Rule.md` file

## Team Rules

- prioritize impact, risk, clarity, and declarative downstream usability over churn
- reject low-value or dogmatic rewrites
- keep scope small enough that downstream teams can execute it cleanly
- write the contract clearly enough that Test and Implementation do not need to guess what success means
- only introduce facade direction when it simplifies the public surface or clarifies ownership at a worthwhile cost
- send uncertain ideas to future review instead of forcing a weak decision
- require a reason note and rejected alternative for non-obvious approvals, rejections, and deferrals

## Decision Standard

Approve work when:

- the problem is concrete
- the expected benefit is meaningful
- the scope can be described clearly
- the resulting contract and file plan can be described clearly
- the cost and risk are proportionate

Approve facade direction when:

- it simplifies the outward-facing contract or caller surface
- it removes ambiguity about where downstream work should attach
- it does not force a large speculative rewrite for weak payoff

Reject or narrow work when:

- the proposal is mostly cosmetic
- the rewrite cost is high relative to the gain
- the proposal is driven by taste or dogma instead of a concrete problem
- downstream teams would still need to guess what success means

Reject or narrow facade ideas when:

- they mostly rename or rewrap code without improving the active work item
- they introduce an abstraction without a concrete caller or ownership benefit
- they would move too much design work out of the approved scope

Defer work when:

- the idea may be useful but the evidence is incomplete
- there are multiple viable directions and this team cannot confidently choose one
- a user or architecture decision is needed before safe approval

## Rule Files In This Folder

- `CommonAgent_Rule.md`
- `PlanningLead_Rule.md`
- `ScopeFacadeReviewer_Rule.md`
- `CostReviewer_Rule.md`
- `RiskReviewer_Rule.md`
- `ChangeApprover_Rule.md`
- `DecisionRecorder_Rule.md`

Use the common rule for team-wide behavior and the six role rules for specific agent behavior.

## Handoff Rule

The official handoff to Test and Implementation should live in `agent_local/PlanningReview.md`.
That handoff should include:

- approved work items
- in-scope files, modules, or behaviors
- declarative interfaces, behavior contracts, and file ownership when relevant
- approved facade direction or explicit "no facade change" guidance when relevant
- explicit non-goals
- acceptance criteria
- linked decision notes for any non-obvious choice

When this team finishes a pass or sends its final user-facing reply for that pass, it should also update `agent_local/ReportToUser.md` and immediately send the root completion notification using `SendReviewTeamNotification`.
