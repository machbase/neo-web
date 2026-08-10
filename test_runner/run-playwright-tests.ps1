# Set paths
In the case, $neoWebProjectRoot = 'C:\Users\MACH-NOT-31\Documents\GitHub\neo-web'
$machbaseNeoServerDirectory = 'C:\Users\MACH-NOT-31\Desktop\machbase-neo-v8.5.6-windows-amd64\machbase-neo-v8.5.6-windows-amd64'
$machbaseNeoExecutablePath = Join-Path $machbaseNeoServerDirectory 'machbase-neo.exe'
$neoTestDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "neo-web-test-$PID"
New-Item -ItemType Directory -Force -Path "$neoTestDirectory\data", "$neoTestDirectory\files", "$neoTestDirectory\pref", "$neoTestDirectory\backup" | Out-Null

# Start servers
$neoProcess = Start-Process $machbaseNeoExecutablePath -ArgumentList "serve --host 127.0.0.1 --data `"$neoTestDirectory\data`" --file `"$neoTestDirectory\files`" --pref `"$neoTestDirectory\pref`" --backup-dir `"$neoTestDirectory\backup`" --http-port 5654 --preset auto" -PassThru
$webProcess = Start-Process npm.cmd -ArgumentList 'run dev' -WorkingDirectory $neoWebProjectRoot -PassThru
Start-Sleep -Seconds 3

# Run tests
$playwrightProcess = Start-Process npx.cmd -ArgumentList 'playwright test' -WorkingDirectory $neoWebProjectRoot -Wait -NoNewWindow -PassThru

# Clean up
@($webProcess, $neoProcess) | ForEach-Object { taskkill.exe /PID $_.Id /T /F | Out-Null }
if ($neoTestDirectory.StartsWith([System.IO.Path]::GetTempPath())) { Remove-Item -LiteralPath $neoTestDirectory -Recurse -Force }
exit $playwrightProcess.ExitCode
