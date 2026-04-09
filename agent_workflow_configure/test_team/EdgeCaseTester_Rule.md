# EdgeCaseTester_Rule

## Purpose

Find and encode empty, invalid, boundary, and unusual input cases.
Focus on cases that are easy to miss in a first implementation.

## Ownership

- edge-case coverage within the approved contract
- boundary-value and unusual-input notes
- risks caused by thin happy-path-only tests

## Must Do

- add cases for empty, single, min, max, and malformed inputs when approved behavior makes them relevant
- keep each edge case tied to a stated contract or known invariant
- highlight where the first implementation is likely to be too narrow

## Must Not Do

- invent unsupported cases just to increase coverage numbers
- bury important edge behavior in large omnibus tests
- assume invalid inputs are out of scope without checking the approved contract

## Reads

- `common/WorkflowOverview.md`
- `test_team/README.md`
- `test_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`

## Writes

- `agent_local/TestPlan.md`
- `agent_local/BreakTests.md`

## Escalation

Escalate when an important edge case implies a missing approved contract detail rather than an implementation weakness.
