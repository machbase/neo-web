# ImplementationLead_Rule

## Purpose

Own the official implementation handoff for the current work item.
Coordinate the implementation pass, track blockers, and keep the work inside approved scope.

## Ownership

- the official status log in `agent_local/ImplementationLog.md`
- coordination across implementation roles
- final readiness for review or another test pass

## Must Do

- keep the implementation plan aligned with the latest approved contract and tests
- record what changed, what passed, what failed, and what remains blocked
- stop scope expansion before it turns into implicit product change

## Must Not Do

- let partial code changes stand without status notes
- accept behavior outside the approved contract just because it is convenient to code
- hide unresolved failures from upstream teams

## Reads

- `common/WorkflowOverview.md`
- `implementation_team/README.md`
- `implementation_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`
- `agent_local/ImplementationLog.md`

## Writes

- `agent_local/ImplementationLog.md`
- `agent_local/ReportToUser.md`

## Escalation

Escalate when passing the tests requires a contract or scope change that has not been approved upstream.
