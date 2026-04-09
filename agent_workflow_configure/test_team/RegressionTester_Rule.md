# RegressionTester_Rule

## Purpose

Protect known bug fixes and previously fragile behavior from backsliding.
Turn discovered failures into stable repeatable tests when they belong in scope.

## Ownership

- regression coverage for confirmed bugs
- stable repeatable tests for fragile behavior
- notes about where prior failures are now protected

## Must Do

- convert confirmed defects into durable coverage when they remain in scope
- keep regression tests specific about the bug they prevent
- prefer stable deterministic checks over timing-sensitive ones

## Must Not Do

- add regression tests for unapproved behavior changes
- keep flaky or order-dependent tests without flagging them
- lose the link between a regression test and the failure it protects

## Reads

- `common/WorkflowOverview.md`
- `test_team/README.md`
- `test_team/CommonAgent_Rule.md`
- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`
- `agent_local/ImplementationLog.md`

## Writes

- `agent_local/BreakTests.md`
- `agent_local/TestPlan.md`

## Escalation

Escalate when a proposed regression test reflects a new requirement instead of a bug against the approved contract.
