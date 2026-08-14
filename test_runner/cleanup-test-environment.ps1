[CmdletBinding()]
param(
    [System.Diagnostics.Process]$WebProcess,
    [System.Diagnostics.Process]$NeoProcess
)

$ErrorActionPreference = 'Stop'
$neoTestDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'neo-web-test'

if ($null -ne $WebProcess -and -not $WebProcess.HasExited) {
    taskkill.exe /PID $WebProcess.Id /T /F | Out-Null
    if (-not $WebProcess.WaitForExit(10000)) {
        throw "Vite process $($WebProcess.Id) did not stop."
    }
}

if ($null -ne $NeoProcess -and -not $NeoProcess.HasExited) {
    Stop-Process -Id $NeoProcess.Id -Force
    if (-not $NeoProcess.WaitForExit(10000)) {
        throw "Machbase Neo process $($NeoProcess.Id) did not stop."
    }
}

if (Test-Path -LiteralPath $neoTestDirectory) {
    $testDirectoryItem = Get-Item -LiteralPath $neoTestDirectory -Force
    if (-not $testDirectoryItem.PSIsContainer) {
        throw "The fixed test path is not a directory: $neoTestDirectory"
    }
    if ($testDirectoryItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        throw "Refusing to remove a linked directory: $neoTestDirectory"
    }

    Remove-Item -LiteralPath $neoTestDirectory -Recurse -Force
}

Write-Host "[CLEANED] $neoTestDirectory"
