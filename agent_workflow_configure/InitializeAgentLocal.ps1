param()

$RepoRoot = Split-Path $PSScriptRoot -Parent
$AgentLocalDir = Join-Path $RepoRoot "agent_local"

New-Item -ItemType Directory -Force -Path $AgentLocalDir | Out-Null

function Write-HeadingIfMissing {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    if (-not (Test-Path $Path)) {
        Set-Content -Path $Path -Value "# $Title`r`n"
    }
}

Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "README.md") -Title "Agent Local"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "PlanningReview.md") -Title "Planning Review"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "DecisionLog.md") -Title "Decision Log"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "FuturePotentialChanges.md") -Title "Future Potential Changes"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "TestPlan.md") -Title "Test Plan"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "BreakTests.md") -Title "Break Tests"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "ImplementationLog.md") -Title "Implementation Log"
Write-HeadingIfMissing -Path (Join-Path $AgentLocalDir "ReportToUser.md") -Title "Report To User"

$NotificationTopicPath = Join-Path $AgentLocalDir "NotificationTopic.md"
if (-not (Test-Path $NotificationTopicPath)) {
    Set-Content -Path $NotificationTopicPath -Value "# Notification Topic`r`n`r`ntopic: ASK_USER_AND_SET_ONCE`r`n"
}

Write-Host "Initialized agent_local at $AgentLocalDir"
Write-Host "After setting agent_local/NotificationTopic.md, run .\\agent_workflow_configure\\SendCompletionNotification.ps1 -TeamName NotificationSetup once to approve the reusable notification command."
