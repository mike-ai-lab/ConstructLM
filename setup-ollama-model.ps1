# Ollama Model Setup Script (PowerShell)
# This script creates the Code Llama model in Ollama

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ollama Model Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to the models directory
$modelDir = "F:\Automations\Models"
Set-Location $modelDir

# Check if we're in the right directory
if (-not (Test-Path "codellama.Modelfile")) {
    Write-Host "ERROR: codellama.Modelfile not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "  - F:\Automations\Models\codellama.Modelfile"
    Write-Host "  - F:\Automations\Models\codellama-7b-instruct.Q4_K_M.gguf"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "codellama-7b-instruct.Q4_K_M.gguf")) {
    Write-Host "ERROR: codellama-7b-instruct.Q4_K_M.gguf not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "  - F:\Automations\Models\codellama.Modelfile"
    Write-Host "  - F:\Automations\Models\codellama-7b-instruct.Q4_K_M.gguf"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""
Write-Host "Files found:" -ForegroundColor Green
Get-ChildItem -Filter "*.Modelfile" -o "*.gguf" | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""

# Check if Ollama is running
Write-Host "Checking if Ollama is running..." -ForegroundColor Yellow
try {
    $null = ollama list 2>$null
} catch {
    Write-Host ""
    Write-Host "WARNING: Ollama doesn't appear to be running!" -ForegroundColor Red
    Write-Host "Please start Ollama first:" -ForegroundColor Yellow
    Write-Host "  1. Open the Ollama application"
    Write-Host "  2. Or run: ollama serve"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Ollama is running. Proceeding..." -ForegroundColor Green
Write-Host ""

# Create the model
Write-Host "Creating Code Llama model..." -ForegroundColor Cyan
Write-Host ""
ollama create codellama -f codellama.Modelfile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to create model!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS! Model created." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verify the model was created
Write-Host "Verifying model installation..." -ForegroundColor Yellow
Write-Host ""
ollama list

Write-Host ""
Write-Host "You can now use Code Llama in ConstructLM!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open ConstructLM"
Write-Host "  2. Click Settings (gear icon)"
Write-Host "  3. Scroll to 'Local Models (Ollama)'"
Write-Host "  4. Click 'Test Connection'"
Write-Host "  5. You should see 'codellama' listed"
Write-Host ""
Read-Host "Press Enter to exit"
