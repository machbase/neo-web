param(
    [Parameter(Mandatory = $true)]
    [Alias('AgentName')]
    [string]$TeamName
)

$RepoRoot = Split-Path $PSScriptRoot -Parent
$TopicFile = Join-Path $RepoRoot "agent_local\\NotificationTopic.md"

if (-not (Test-Path $TopicFile)) {
    throw "Missing $TopicFile. Ask the user for the ntfy topic name and write it to agent_local/NotificationTopic.md as 'topic: your_topic_name'."
}

$TopicMatch = Select-String -Path $TopicFile -Pattern '^\s*topic\s*:\s*(.+?)\s*$' | Select-Object -First 1

if (-not $TopicMatch) {
    throw "Could not find a 'topic:' line in $TopicFile. Set the file to include a line like 'topic: your_topic_name'."
}

$TopicName = $TopicMatch.Matches[0].Groups[1].Value.Trim()

if ([string]::IsNullOrWhiteSpace($TopicName) -or $TopicName -like 'ASK_USER*') {
    throw "The topic in $TopicFile is not configured yet. Ask the user for the ntfy topic name and save it there."
}

if ([string]::IsNullOrWhiteSpace($TeamName)) {
    throw "Provide -TeamName."
}

$Message = "$TeamName task finished"
$TopicUrl = "https://ntfy.sh/$TopicName"

curl.exe -d $Message $TopicUrl
