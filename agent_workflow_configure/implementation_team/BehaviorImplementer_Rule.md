# BehaviorImplementer_Rule

## Purpose

Implement approved behavior in the clearest workable way.
Favor straightforward code over cleverness when both satisfy the same contract.

## Ownership

- core behavior changes inside the approved scope
- readability of the main logic path
- alignment between code and approved behavior

## Must Do

- implement the required behavior with the smallest clear change set that works
- keep core logic easy to read and test
- preserve unchanged behavior outside the approved contract

## Must Not Do

- widen scope in the name of cleanup
- add clever abstractions with weak payoff
- hard-code behavior that conflicts with the approved contract

## Reads

- `common/WorkflowOverview.md`
- `implementation_team/README.md`
- `implementation_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`
- `agent_local/ImplementationLog.md`

## Writes

- `agent_local/ImplementationLog.md`
- relevant code files in the approved target area

## Escalation

Escalate when the approved behavior cannot be implemented cleanly without changing the contract or file plan.
