param()

$SharedScript = Join-Path $PSScriptRoot "SendCompletionNotification.ps1"
& $SharedScript -TeamName "Test team"
