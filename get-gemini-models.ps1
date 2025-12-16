$apiKey = "AIzaSyBKvswkku5aScKDGTk5NiPWn1ewCZMhmRE"
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"

Write-Host "`n=== Fetching Available Gemini Models ===" -ForegroundColor Cyan
Write-Host "API Key: $($apiKey.Substring(0,20))..." -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
    
    Write-Host "`nTotal Models Found: $($response.models.Count)" -ForegroundColor Green
    Write-Host "`n$('='*100)" -ForegroundColor Gray
    
    $geminiModels = $response.models | Where-Object { $_.name -like "*gemini*" }
    
    foreach ($model in $geminiModels) {
        $modelId = $model.name -replace "models/", ""
        $displayName = $model.displayName
        $inputLimit = $model.inputTokenLimit
        $outputLimit = $model.outputTokenLimit
        $supportedMethods = $model.supportedGenerationMethods -join ", "
        
        Write-Host "`nModel ID: $modelId" -ForegroundColor Yellow
        Write-Host "  Display Name: $displayName" -ForegroundColor White
        Write-Host "  Input Tokens: $inputLimit" -ForegroundColor Cyan
        Write-Host "  Output Tokens: $outputLimit" -ForegroundColor Cyan
        Write-Host "  Methods: $supportedMethods" -ForegroundColor Magenta
        
        if ($model.description) {
            Write-Host "  Description: $($model.description)" -ForegroundColor Gray
        }
        
        Write-Host "  $('-'*90)" -ForegroundColor DarkGray
    }
    
    Write-Host "`n=== Summary ===" -ForegroundColor Green
    Write-Host "Gemini Models: $($geminiModels.Count)" -ForegroundColor White
    Write-Host "`nAccessible Models:" -ForegroundColor Cyan
    $geminiModels | ForEach-Object { 
        $id = $_.name -replace "models/", ""
        Write-Host "  - $id" -ForegroundColor White
    }
    
} catch {
    Write-Host "`nERROR: Failed to fetch models" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "`nAPI Key is invalid or lacks permissions" -ForegroundColor Yellow
    }
}

Write-Host "`n$('='*100)`n" -ForegroundColor Gray
