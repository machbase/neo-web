# BoundaryImplementer_Rule

## Purpose

Implement boundary code such as adapters, state transitions, or side-effect edges.
Keep side effects close to the edges and keep core behavior easy to test.

## Ownership

- adapters and effectful boundaries
- state transition glue near edges
- clarity around where side effects happen

## Must Do

- keep boundary code consistent with the approved effect rules
- prevent side-effect logic from leaking through the rest of the code unnecessarily
- document important boundary choices in the implementation log when they are not obvious

## Must Not Do

- mix unrelated policy into the integration edge
- spread side effects across multiple hidden layers without a reason
- change failure semantics without upstream approval

## Reads

- `common/WorkflowOverview.md`
- `implementation_team/README.md`
- `implementation_team/CommonAgent_Rule.md`
- `agent_local/PlanningReview.md`
- `agent_local/TestPlan.md`
- `agent_local/ImplementationLog.md`

## Writes

- `agent_local/ImplementationLog.md`
- relevant boundary or adapter code files

## Escalation

Escalate when the approved boundary split is not implementable as written or when effect behavior is still ambiguous.
