$apiKey = "AIzaSyBKvswkku5aScKDGTk5NiPWn1ewCZMhmRE"
$modelsToTest = @("gemini-3-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite")

Write-Host "`n=== Testing Models ===" -ForegroundColor Cyan
$workingModels = @()
$failedModels = @()

foreach ($modelId in $modelsToTest) {
    Write-Host "Testing: $modelId" -NoNewline -ForegroundColor Yellow
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=$apiKey"
    $body = @{ contents = @(@{ parts = @(@{ text = "Say OK" }) }) } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        $output = $response.candidates[0].content.parts[0].text
        Write-Host " ✓ WORKS - $output" -ForegroundColor Green
        $workingModels += $modelId
    } catch {
        Write-Host " ✗ FAILED - $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        $failedModels += $modelId
    }
    Start-Sleep -Milliseconds 500
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Working: $($workingModels.Count)" -ForegroundColor Green
$workingModels | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Green }
if ($failedModels.Count -gt 0) {
    Write-Host "Failed: $($failedModels.Count)" -ForegroundColor Red
    $failedModels | ForEach-Object { Write-Host "  ✗ $_" -ForegroundColor Red }
}
Write-Host ""
