<#
.EXAMPLE
    .\test_runner\run-playwright-tests.ps1

    Starts the test services, calls initialize-test-database.ps1, runs
    Playwright, and cleans up the services and temporary database.
#>

[CmdletBinding()]
param(
    [switch]$KeepEnvironmentReady
)

$ErrorActionPreference = 'Stop'

function Wait-ForHttpEndpoint {
    param(
        [Parameter(Mandatory)]
        [string]$Uri,
        [Parameter(Mandatory)]
        [System.Diagnostics.Process]$Process,
        [Parameter(Mandatory)]
        [string]$Name,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            throw "$Name exited before becoming ready (exit code $($Process.ExitCode))."
        }

        try {
            Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 2 | Out-Null
            Write-Host "[READY] $Name"
            return
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }

    throw "$Name did not become ready within $TimeoutSeconds seconds."
}

$neoWebProjectRoot = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web'
$machbaseNeoServerDirectory = 'C:\Users\MACH-NOT-31\Desktop\machbase-neo-v8.5.6-windows-amd64\machbase-neo-v8.5.6-windows-amd64'
$machbaseNeoExecutablePath = Join-Path $machbaseNeoServerDirectory 'machbase-neo.exe'
$neoServerAddress = '127.0.0.1:5654'
$neoTestDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'neo-web-test'
$portCheckPath = Join-Path $PSScriptRoot 'check-test-ports.ps1'
$databaseInitializerPath = Join-Path $PSScriptRoot 'initialize-test-database.ps1'
$cleanupPath = Join-Path $PSScriptRoot 'cleanup-test-environment.ps1'

if (-not (Test-Path -LiteralPath $machbaseNeoExecutablePath -PathType Leaf)) {
    throw "Machbase Neo executable was not found: $machbaseNeoExecutablePath"
}

if (-not (Test-Path -LiteralPath $neoWebProjectRoot -PathType Container)) {
    throw "neo-web project directory was not found: $neoWebProjectRoot"
}

if (-not (Test-Path -LiteralPath $databaseInitializerPath -PathType Leaf)) {
    throw "Database initializer was not found: $databaseInitializerPath"
}

if (-not (Test-Path -LiteralPath $cleanupPath -PathType Leaf)) {
    throw "Test environment cleanup helper was not found: $cleanupPath"
}

& $portCheckPath
if ($LASTEXITCODE -ne 0) {
    throw 'The Playwright test environment cannot start while a required port is occupied.'
}

& $cleanupPath

$neoProcess = $null
$webProcess = $null
$playwrightExitCode = 1
$hadPlaywrightBaseUrl = Test-Path Env:PLAYWRIGHT_BASE_URL
$previousPlaywrightBaseUrl = $env:PLAYWRIGHT_BASE_URL

try {
    New-Item -ItemType Directory -Force -Path `
        "$neoTestDirectory\data", `
        "$neoTestDirectory\files", `
        "$neoTestDirectory\pref", `
        "$neoTestDirectory\backup" | Out-Null

    $neoArguments = "serve --host 127.0.0.1 --data `"$neoTestDirectory\data`" --file `"$neoTestDirectory\files`" --pref `"$neoTestDirectory\pref`" --backup-dir `"$neoTestDirectory\backup`" --http-port 5654 --preset auto"
    $neoProcess = Start-Process $machbaseNeoExecutablePath `
        -ArgumentList $neoArguments `
        -WindowStyle Hidden `
        -PassThru

    $neoHealthQuery = [System.Uri]::EscapeDataString('select 1')
    Wait-ForHttpEndpoint `
        -Uri "http://$neoServerAddress/db/query?q=$neoHealthQuery" `
        -Process $neoProcess `
        -Name 'Machbase Neo'

    & $databaseInitializerPath

    $webProcess = Start-Process npm.cmd `
        -ArgumentList 'run dev -- --strictPort' `
        -WorkingDirectory $neoWebProjectRoot `
        -WindowStyle Hidden `
        -PassThru

    Wait-ForHttpEndpoint `
        -Uri 'http://127.0.0.1:7777/web/ui/login' `
        -Process $webProcess `
        -Name 'Vite'

    $env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:7777'
    if ($KeepEnvironmentReady) {
        Write-Host '[READY] Neo, fixture data, and Vite are ready.'
        Read-Host 'Run individual Playwright tests in another terminal, then press Enter to clean up'
        $playwrightExitCode = 0
    } else {
        $playwrightProcess = Start-Process npx.cmd `
            -ArgumentList 'playwright test' `
            -WorkingDirectory $neoWebProjectRoot `
            -Wait `
            -NoNewWindow `
            -PassThru
        $playwrightExitCode = $playwrightProcess.ExitCode
    }
} finally {
    try {
        & $cleanupPath -WebProcess $webProcess -NeoProcess $neoProcess
    } catch {
        Write-Warning $_.Exception.Message
    }

    if ($hadPlaywrightBaseUrl) {
        $env:PLAYWRIGHT_BASE_URL = $previousPlaywrightBaseUrl
    } else {
        Remove-Item Env:PLAYWRIGHT_BASE_URL -ErrorAction SilentlyContinue
    }
}

exit $playwrightExitCode
