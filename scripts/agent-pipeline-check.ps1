param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$AgentId = 'agent-ai-creator-001',
  [string]$CronSecret = $env:CRON_SECRET
)

function Write-Header($text) {
  ''
  Write-Host ('=' * 70)
  Write-Host " $text"
  Write-Host ('=' * 70)
}

$initBody = @{ persona = @{ name = 'Ada'; domain = 'AI Security' } } | ConvertTo-Json

Write-Header '1) POST /api/agent/init'
Invoke-RestMethod -Uri "$BaseUrl/api/agent/init" -Method Post -ContentType 'application/json' -Body $initBody | ConvertTo-Json -Depth 5

Write-Header '2) GET /api/cron/run'
$cronHeaders = @{
  'Content-Type' = 'application/json'
}
if ($CronSecret) {
  $cronHeaders.Authorization = "Bearer $CronSecret"
}
Invoke-RestMethod -Uri "$BaseUrl/api/cron/run" -Method Get -Headers $cronHeaders | ConvertTo-Json -Depth 5

Write-Header "3) GET /api/agent/feed?agentId=$AgentId"
Invoke-RestMethod -Uri "$BaseUrl/api/agent/feed?agentId=$AgentId" -Method Get -ContentType 'application/json' | ConvertTo-Json -Depth 5

Write-Header '4) VERIFY feed schema'
$feed = Invoke-RestMethod -Uri "$BaseUrl/api/agent/feed?agentId=$AgentId" -Method Get -ContentType 'application/json'
if (-not $feed.posts) { throw 'Response missing posts array' }
if (-not ($feed.posts -is [System.Array])) { throw 'posts is not an array' }
if ($feed.posts.Count -eq 0) { throw 'posts array is empty' }
foreach ($idx in 0..($feed.posts.Count - 1)) {
  $post = $feed.posts[$idx]
  if (-not [string]::IsNullOrWhiteSpace($post.id)) { } else { throw "post[$idx].id is invalid" }
  if (-not [string]::IsNullOrWhiteSpace($post.createdAt)) {
    try {
      [void][DateTime]::Parse($post.createdAt)
    } catch {
      throw "post[$idx].createdAt is not valid ISO 8601: $($post.createdAt)"
    }
  } else {
    throw "post[$idx].createdAt is invalid"
  }
  if (-not [string]::IsNullOrWhiteSpace($post.text)) { } else { throw "post[$idx].text is invalid" }
  if (-not [string]::IsNullOrWhiteSpace($post.rationale)) { } else { throw "post[$idx].rationale is invalid" }
  if (-not ($post.sources -is [System.Array])) { throw "post[$idx].sources is not an array" }
  foreach ($source in $post.sources) {
    if (-not [string]::IsNullOrWhiteSpace($source)) { } else { throw "post[$idx].sources contains invalid string" }
  }
}
Write-Host 'Validation completed successfully.'
