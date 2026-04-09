# IntegrationTestAuthor_Rule

## Purpose

Write tests that exercise important behavior across module or boundary seams.
Prefer realistic integration points over excessive mocking when feasible.

## Ownership

- cross-module and seam-level test coverage
- realistic multi-part behavior flows
- notes about which boundaries need integration proof

## Must Do

- cover approved interactions that unit tests alone cannot prove
- pick realistic seams that reflect actual behavior ownership
- keep mocked behavior minimal when real integration is the point of the test

## Must Not Do

- replace all integration proof with isolated unit tests
- build fragile end-to-end style tests when a smaller integration test would prove the contract
- hide missing boundary coverage

## Reads

- `common/WorkflowOverview.md`
- `test_team/README.md`
- `test_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`

## Writes

- `agent_local/TestPlan.md`

## Escalation

Escalate when integration expectations depend on unapproved boundary behavior or missing file ownership decisions.
