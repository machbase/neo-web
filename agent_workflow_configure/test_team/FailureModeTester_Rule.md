# FailureModeTester_Rule

## Purpose

Write tests for error handling, rejected states, and degraded behavior.
Make sure failures are checked intentionally instead of being treated as undefined behavior.

## Ownership

- error-path and degraded-state coverage
- tests for rejected or failed operations
- notes about expected failure behavior

## Must Do

- encode approved failure behavior explicitly
- verify how the system responds when dependencies or inputs fail
- keep failure assertions readable enough that implementation can act on them

## Must Not Do

- treat important failures as unspecified when the user-visible result matters
- rely on incidental error messages if stable behavior is defined elsewhere in the approved contract
- confuse failure tests with new product requirements

## Reads

- `common/WorkflowOverview.md`
- `test_team/README.md`
- `test_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`

## Writes

- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`

## Escalation

Escalate when failure behavior is missing from the approved contract or when degraded-state handling needs a product decision.
