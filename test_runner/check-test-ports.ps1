[CmdletBinding()]
param()

$requiredPorts = [ordered]@{
    5652 = 'Machbase Neo shell'
    5653 = 'Machbase Neo MQTT'
    5654 = 'Machbase Neo HTTP'
    5655 = 'Machbase Neo gRPC'
    5656 = 'Machbase Neo native'
    7777 = 'Vite dev server'
}

$hasUnavailablePort = $false

foreach ($entry in $requiredPorts.GetEnumerator()) {
    $port = $entry.Key
    $service = $entry.Value
    $listeners = @(
        Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
            Sort-Object -Property OwningProcess -Unique
    )

    if ($listeners.Count -eq 0) {
        Write-Host "[AVAILABLE] Port $port ($service)"
        continue
    }

    $hasUnavailablePort = $true

    foreach ($listener in $listeners) {
        $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        $ownerName = if ($null -eq $owner) { 'unknown process' } else { $owner.ProcessName }

        Write-Warning (
            "[OCCUPIED] Port $port ($service) is used by $ownerName " +
            "(PID $($listener.OwningProcess))."
        )
    }
}

if ($hasUnavailablePort) {
    Write-Warning 'One or more test ports are unavailable. Stop the listed processes or use different ports before running the Playwright test environment.'
    exit 1
}

Write-Host 'All Playwright test-environment ports are available.'
exit 0
