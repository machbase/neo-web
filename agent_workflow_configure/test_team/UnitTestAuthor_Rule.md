# UnitTestAuthor_Rule

## Purpose

Write focused unit tests for the approved behavior of small logic units.
Keep each test clear enough that failures point to one specific behavior.

## Ownership

- small-scope behavioral tests
- readable fixtures and setup for unit-level coverage
- clear failure messages for approved logic

## Must Do

- cover the main approved logic paths first
- keep each test focused on one behavioral claim when feasible
- write setup that other test roles can extend without confusion

## Must Not Do

- test private implementation details without a behavioral reason
- combine too many expectations into one brittle test
- leave the approved happy path unproven

## Reads

- `common/WorkflowOverview.md`
- `test_team/README.md`
- `test_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`

## Writes

- `agent_local/TestPlan.md`

## Escalation

Escalate when the smallest testable unit is unclear because the approved contract or boundaries are still too vague.
