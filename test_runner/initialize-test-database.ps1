<#
.SYNOPSIS
    Imports both CSV fixtures into the running local Machbase Neo test server.
#>

$ErrorActionPreference = 'Stop'

$neoExecutable = 'C:\Users\MACH-NOT-31\Desktop\machbase-neo-v8.5.6-windows-amd64\machbase-neo-v8.5.6-windows-amd64\machbase-neo.exe'
$fixtureDirectory = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web\test_runner\fixtures'
$homesSchema = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web\test_runner\fixtures\homes.sql'
$homesCsv = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web\test_runner\fixtures\homes.csv'
$distanceSchema = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web\test_runner\fixtures\distance-sensor.sql'
$distanceCsv = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web\test_runner\fixtures\distance_sensor_data_1M.csv'

foreach ($path in @(
    $neoExecutable,
    $homesSchema,
    $homesCsv,
    $distanceSchema,
    $distanceCsv
)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Required initialization file was not found: $path"
    }
}

$shellArguments = @(
    'shell',
    '--server', '127.0.0.1:5654',
    '--user', 'sys',
    '--password', 'Manager',
    '-v', "/fixtures=$fixtureDirectory"
)

& $neoExecutable @shellArguments run '/fixtures/homes.sql'
if ($LASTEXITCODE -ne 0) {
    throw 'Could not create the TAG table.'
}

& $neoExecutable @shellArguments `
    import `
    --input '/fixtures/homes.csv' `
    --timeformat s `
    TAG
if ($LASTEXITCODE -ne 0) {
    throw 'Could not import homes.csv.'
}
Write-Host '[SEEDED] Imported homes.csv into TAG.'

& $neoExecutable @shellArguments run '/fixtures/distance-sensor.sql'
if ($LASTEXITCODE -ne 0) {
    throw 'Could not create the DISTANCE_SENSOR table.'
}

& $neoExecutable @shellArguments `
    import `
    --input '/fixtures/distance_sensor_data_1M.csv' `
    DISTANCE_SENSOR
if ($LASTEXITCODE -ne 0) {
    throw 'Could not import distance_sensor_data_1M.csv.'
}
Write-Host '[SEEDED] Imported distance_sensor_data_1M.csv into DISTANCE_SENSOR.'
