$apiKey = "AIzaSyBKvswkku5aScKDGTk5NiPWn1ewCZMhmRE"

$modelsToTest = @(
    "gemini-3-pro-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite"
)

Write-Host "`n=== Testing Gemini Models with Simple Request ===" -ForegroundColor Cyan
Write-Host "Testing $($modelsToTest.Count) models...`n" -ForegroundColor Gray

$workingModels = @()
$failedModels = @()

foreach ($modelId in $modelsToTest) {
    Write-Host "Testing: $modelId" -NoNewline -ForegroundColor Yellow
    
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=$apiKey"
    
    $body = @{
        contents = @(
            @{
                parts = @(
                    @{ text = "Say 'OK'" }
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        
        $output = $response.candidates[0].content.parts[0].text
        
        Write-Host " ✓ WORKS" -ForegroundColor Green
        Write-Host "  Response: $output" -ForegroundColor Gray
        
        $workingModels += $modelId
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        
        Write-Host " ✗ FAILED" -ForegroundColor Red
        Write-Host "  Status: $statusCode" -ForegroundColor Red
        Write-Host "  Error: $errorMsg" -ForegroundColor DarkRed
        
        $failedModels += @{
            model = $modelId
            status = $statusCode
            error = $errorMsg
        }
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n$('='*80)" -ForegroundColor Gray
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "`nWorking Models ($($workingModels.Count)):" -ForegroundColor Green
foreach ($model in $workingModels) {
    Write-Host "  ✓ $model" -ForegroundColor Green
}

if ($failedModels.Count -gt 0) {
    Write-Host "`nFailed Models ($($failedModels.Count)):" -ForegroundColor Red
    foreach ($failed in $failedModels) {
        Write-Host "  ✗ $($failed.model) - Status: $($failed.status)" -ForegroundColor Red
    }
}

Write-Host "`n$('='*80)`n" -ForegroundColor Gray
